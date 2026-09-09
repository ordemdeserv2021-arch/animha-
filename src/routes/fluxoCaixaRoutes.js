const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Importação obrigatória da conexão com o banco

// Rota de resumo financeiro com filtro por horário de login (turno)
router.get('/resumo', async (req, res) => {
  const { desde } = req.query;

  try {
    let queryEntradas = "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE tipo = 'ENTRADA'";
    let querySaidas = "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE tipo = 'SAIDA'";
    let params = [];

    // Se a data/hora do login foi informada, filtra as vendas a partir desse momento
    if (desde && desde !== 'undefined' && desde !== '--:--:--') {
      // Converte a string DD/MM/YYYY HH24:MI:SS para TIMESTAMP compativel com o PostgreSQL
      queryEntradas += " AND data >= TO_TIMESTAMP($1, 'DD/MM/YYYY HH24:MI:SS')";
      querySaidas += " AND data >= TO_TIMESTAMP($1, 'DD/MM/YYYY HH24:MI:SS')";
      params.push(desde);
    }

    const resEntradas = await pool.query(queryEntradas, params);
    const resSaidas = await pool.query(querySaidas, params);

    const totalEntradas = parseFloat(resEntradas.rows[0].total);
    const totalSaidas = parseFloat(resSaidas.rows[0].total);
    const saldoTotal = totalEntradas - totalSaidas;

    res.json({
      totalEntradas: totalEntradas.toFixed(2),
      totalSaidas: totalSaidas.toFixed(2),
      saldoTotal: saldoTotal.toFixed(2)
    });
  } catch (err) {
    console.error('Erro ao calcular resumo do turno:', err);
    res.status(500).json({ error: 'Erro ao calcular resumo', details: err.message });
  }
});

module.exports = router;