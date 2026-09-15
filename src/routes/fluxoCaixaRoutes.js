const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/resumo', async (req, res) => {
  const { desde } = req.query;

  try {
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
    
    let params = [];

    if (desde && desde !== 'undefined' && desde !== '--:--:--') {
      queryEntradas += " AND data >= TO_TIMESTAMP($1, 'DD/MM/YYYY HH24:MI:SS')";
      querySaidas += " AND data >= TO_TIMESTAMP($1, 'DD/MM/YYYY HH24:MI:SS')";
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
    res.status(500).json({ error: 'Erro ao calcular resumo', details: err.message });
  }
});

module.exports = router;