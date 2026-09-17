const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { podeExcluir } = require('../services/authMiddleware');

// Listar transações com suas categorias para atualizar o histórico do PDV.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.nome AS categoria_nome
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      ORDER BY t.data DESC, t.id DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar transações:', err);
    return res.status(500).json({ error: 'Erro ao listar transações', details: err.message });
  }
});

// Cadastrar venda/transação com baixa de estoque
router.post('/', async (req, res) => {
  const bodyItens = Array.isArray(req.body?.itens) && req.body.itens.length > 0
    ? req.body.itens
    : [req.body];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const itensProcessados = [];

    for (const item of bodyItens) {
      const descricao = String(item.descricao || '').trim();
      const valor = Number(item.valor);
      const tipo = String(item.tipo || 'ENTRADA').toUpperCase().trim();
      const categoriaId = item.categoria_id !== undefined && item.categoria_id !== null && !isNaN(Number(item.categoria_id))
        ? Number(item.categoria_id)
        : null;
      const produtoId = item.produto_id !== undefined && item.produto_id !== null && !isNaN(Number(item.produto_id))
        ? Number(item.produto_id)
        : null;
      const quantidade = Number(item.quantidade || 1);

      if (!descricao || Number.isNaN(valor) || valor <= 0 || !tipo) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cada item da venda precisa ter descrição, valor e tipo válidos.' });
      }

      if (produtoId && tipo === 'ENTRADA') {
        const prodResult = await client.query(
          'SELECT quantidade_estoque FROM produtos WHERE id = $1 FOR UPDATE',
          [produtoId]
        );

        if (prodResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Produto não encontrado para o item: ${descricao}` });
        }

        const qtdAtual = Number(prodResult.rows[0].quantidade_estoque || 0);

        if (qtdAtual < quantidade) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Estoque insuficiente para "${descricao}". Disponível: ${qtdAtual} un.` });
        }

        await client.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2',
          [quantidade, produtoId]
        );
      }

      const transacaoResult = await client.query(
        `INSERT INTO transacoes (descricao, valor, tipo, categoria_id, produto_id, quantidade, data)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [descricao, valor, tipo, categoriaId, produtoId, quantidade]
      );

      itensProcessados.push(transacaoResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Venda registrada e estoque atualizado com sucesso!',
      transacoes: itensProcessados,
      total: itensProcessados.reduce((soma, item) => soma + Number(item.valor || 0), 0),
      quantidadeItens: itensProcessados.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro no banco de dados:', err);
    res.status(500).json({ error: 'Erro ao processar venda', details: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:id', podeExcluir, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transacoes WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    return res.json({ message: 'Transação excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir transação:', err);
    return res.status(500).json({ error: 'Erro ao excluir transação.', details: err.message });
  }
});

module.exports = router;