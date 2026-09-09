const express = require('express');
const router = express.Router();
const pool = require('../config/db');
// Corrigido para buscar dentro da pasta 'services'
const { eMaster } = require('../services/authMiddleware');

// Buscar produtos (Liberado para Operador e Master)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nome AS categoria_nome 
      FROM produtos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id 
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Cadastrar produto (Protegido: Apenas Master)
router.post('/', eMaster, async (req, res) => {
  const { nome, preco_venda, quantidade_estoque, categoria_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO produtos (nome, preco_venda, quantidade_estoque, categoria_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, preco_venda, quantidade_estoque, categoria_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar produto' });
  }
});

module.exports = router;