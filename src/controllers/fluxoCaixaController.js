// src/controllers/fluxoCaixaController.js
const pool = require('../config/db');

async function obterResumo(req, res) {
  const { dataInicio, dataFim } = req.query;

  try {
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END), 0) AS total_saidas
      FROM transacoes
    `;
    const params = [];

    if (dataInicio && dataFim) {
      query += ` WHERE data >= $1 AND data <= $2`;
      params.push(`${dataInicio} 00:00:00`, `${dataFim} 23:59:59`);
    }

    const result = await pool.query(query, params);
    const { total_entradas, total_saidas } = result.rows[0];

    const entradas = parseFloat(total_entradas);
    const saidas = parseFloat(total_saidas);
    const saldo = entradas - saidas;

    return res.json({
      totalEntradas: entradas.toFixed(2),
      totalSaidas: saidas.toFixed(2),
      saldoTotal: saldo.toFixed(2)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao calcular fluxo de caixa', details: err.message });
  }
}

module.exports = { obterResumo };