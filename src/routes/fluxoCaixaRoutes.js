const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const { registrarLog } = require('../services/logger');

function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function buscarFechamento(id) {
  const fechamento = await pool.query(
    'SELECT * FROM fechamentos_caixa WHERE id = $1',
    [id]
  );
  return fechamento.rows[0];
}

router.post('/fechar', async (req, res) => {
  const { operadorId, operadorNome } = req.body;
  const nome = String(operadorNome || 'Operador').trim();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ultimo = await client.query(
      'SELECT fechado_em FROM fechamentos_caixa ORDER BY fechado_em DESC LIMIT 1'
    );
    const abertoEm = ultimo.rows[0]?.fechado_em || new Date(0);
    const resumo = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN tipo IN ('ENTRADA', 'RECEITA') THEN valor ELSE 0 END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN tipo IN ('SAIDA', 'DESPESA') THEN valor ELSE 0 END), 0) AS total_saidas,
        COUNT(*)::INTEGER AS quantidade_transacoes
       FROM transacoes
       WHERE data > $1`,
      [abertoEm]
    );

    const dados = resumo.rows[0];
    const entradas = Number(dados.total_entradas);
    const saidas = Number(dados.total_saidas);
    const fechamento = await client.query(
      `INSERT INTO fechamentos_caixa
        (operador_id, operador_nome, aberto_em, total_entradas, total_saidas, saldo, quantidade_transacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [operadorId || null, nome, abertoEm, entradas, saidas, entradas - saidas, dados.quantidade_transacoes]
    );

    await client.query('COMMIT');
    const resultado = fechamento.rows[0];
    registrarLog('FECHAMENTO_CAIXA', {
      fechamentoId: resultado.id,
      operador: nome,
      totalEntradas: resultado.total_entradas,
      totalSaidas: resultado.total_saidas,
      saldo: resultado.saldo
    });

    return res.status(201).json({
      message: 'Caixa fechado com sucesso.',
      fechamento: resultado,
      relatorios: {
        pdf: `/fluxo-caixa/fechamentos/${resultado.id}/relatorio.pdf`,
        xml: `/fluxo-caixa/fechamentos/${resultado.id}/relatorio.xml`
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    registrarLog('ERRO_FECHAMENTO_CAIXA', { erro: err.message, operador: nome });
    return res.status(500).json({ error: 'Erro ao fechar caixa', details: err.message });
  } finally {
    client.release();
  }
});

router.get('/fechamentos/:id/relatorio.xml', async (req, res) => {
  try {
    const fechamento = await buscarFechamento(req.params.id);
    if (!fechamento) return res.status(404).json({ error: 'Fechamento não encontrado' });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fechamento_caixa>
  <id>${escaparXml(fechamento.id)}</id>
  <operador>${escaparXml(fechamento.operador_nome)}</operador>
  <aberto_em>${escaparXml(fechamento.aberto_em)}</aberto_em>
  <fechado_em>${escaparXml(fechamento.fechado_em)}</fechado_em>
  <total_entradas>${escaparXml(fechamento.total_entradas)}</total_entradas>
  <total_saidas>${escaparXml(fechamento.total_saidas)}</total_saidas>
  <saldo>${escaparXml(fechamento.saldo)}</saldo>
  <quantidade_transacoes>${escaparXml(fechamento.quantidade_transacoes)}</quantidade_transacoes>
</fechamento_caixa>`;

    registrarLog('RELATORIO_XML_GERADO', { fechamentoId: fechamento.id });
    res.type('application/xml').set('Content-Disposition', `attachment; filename=fechamento-${fechamento.id}.xml`).send(xml);
  } catch (err) {
    registrarLog('ERRO_RELATORIO_XML', { fechamentoId: req.params.id, erro: err.message });
    res.status(500).json({ error: 'Erro ao gerar XML', details: err.message });
  }
});

router.get('/fechamentos/:id/relatorio.pdf', async (req, res) => {
  try {
    const fechamento = await buscarFechamento(req.params.id);
    if (!fechamento) return res.status(404).json({ error: 'Fechamento não encontrado' });

    const documento = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fechamento-${fechamento.id}.pdf`);
    documento.pipe(res);
    documento.fontSize(18).text('Relatório de Fechamento de Caixa');
    documento.moveDown();
    documento.fontSize(11)
      .text(`Fechamento: ${fechamento.id}`)
      .text(`Operador: ${fechamento.operador_nome}`)
      .text(`Abertura: ${new Date(fechamento.aberto_em).toLocaleString('pt-BR')}`)
      .text(`Fechamento: ${new Date(fechamento.fechado_em).toLocaleString('pt-BR')}`)
      .moveDown()
      .text(`Total de entradas: R$ ${Number(fechamento.total_entradas).toFixed(2)}`)
      .text(`Total de saídas: R$ ${Number(fechamento.total_saidas).toFixed(2)}`)
      .text(`Saldo: R$ ${Number(fechamento.saldo).toFixed(2)}`)
      .text(`Transações: ${fechamento.quantidade_transacoes}`);
    documento.end();
    registrarLog('RELATORIO_PDF_GERADO', { fechamentoId: fechamento.id });
  } catch (err) {
    registrarLog('ERRO_RELATORIO_PDF', { fechamentoId: req.params.id, erro: err.message });
    res.status(500).json({ error: 'Erro ao gerar PDF', details: err.message });
  }
});

router.get('/resumo', async (req, res) => {
  const { desde } = req.query;

  try {
    const ultimoFechamento = await pool.query(
      'SELECT MAX(fechado_em) AS fechado_em FROM fechamentos_caixa'
    );
    const fechadoEm = ultimoFechamento.rows[0].fechado_em;

    // Usamos UPPER() para aceitar 'ENTRADA', 'entrada', 'RECEITA' ou 'receita'
    let queryEntradas = `
      SELECT COALESCE(SUM(valor), 0) AS total 
      FROM transacoes 
      WHERE UPPER(tipo) IN ('ENTRADA', 'RECEITA')
    `;
    
    let querySaidas = `
      SELECT COALESCE(SUM(valor), 0) AS total 
      FROM transacoes 
      WHERE UPPER(tipo) IN ('SAIDA', 'DESPESA')
    `;
    
    const params = [];

    if (fechadoEm) {
      queryEntradas += ' AND data > $1';
      querySaidas += ' AND data > $1';
      params.push(fechadoEm);
    }

    if (desde && desde !== 'undefined' && desde !== '--:--:--') {
      const parametroDesde = params.length + 1;
      queryEntradas += ` AND data >= TO_TIMESTAMP($${parametroDesde}, 'DD/MM/YYYY HH24:MI:SS')`;
      querySaidas += ` AND data >= TO_TIMESTAMP($${parametroDesde}, 'DD/MM/YYYY HH24:MI:SS')`;
      params.push(desde);
    }

    const resEntradas = await pool.query(queryEntradas, params);
    const resSaidas = await pool.query(querySaidas, params);

    const totalEntradas = parseFloat(resEntradas.rows[0].total || 0);
    const totalSaidas = parseFloat(resSaidas.rows[0].total || 0);
    const saldoTotal = totalEntradas - totalSaidas;

    res.json({
      totalEntradas: totalEntradas.toFixed(2),
      totalSaidas: totalSaidas.toFixed(2),
      saldoTotal: saldoTotal.toFixed(2)
    });
  } catch (err) {
    console.error('Erro ao calcular resumo do caixa:', err);
    registrarLog('ERRO_RESUMO_CAIXA', { erro: err.message });
    res.status(500).json({ error: 'Erro ao calcular resumo', details: err.message });
  }
});

module.exports = router;