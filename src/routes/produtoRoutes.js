const express = require('express');
const router = express.Router();
const pool = require('../config/db');
// Corrigido para buscar dentro da pasta 'services'
const { eMaster, podeExcluir } = require('../services/authMiddleware');

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
  const { nome, codigo_barras, preco_venda, quantidade_estoque, categoria_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO produtos (nome, codigo_barras, preco_venda, quantidade_estoque, categoria_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, codigo_barras ? String(codigo_barras).trim() : null, preco_venda, quantidade_estoque, categoria_id ? parseInt(categoria_id, 10) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err);
    res.status(500).json({ error: 'Erro ao cadastrar produto', details: err.message });
  }
});

router.patch('/:id/estoque', eMaster, async (req, res) => {
  const { quantidade } = req.body;
  const numero = Number(quantidade);

  if (!Number.isInteger(numero) || numero < 0) {
    return res.status(400).json({ error: 'Informe uma quantidade válida para o estoque.' });
  }

  try {
    const result = await pool.query(
      'UPDATE produtos SET quantidade_estoque = $1 WHERE id = $2 RETURNING *',
      [numero, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    return res.json({
      message: 'Estoque atualizado com sucesso.',
      produto: result.rows[0]
    });
  } catch (err) {
    console.error('Erro ao atualizar estoque:', err);
    return res.status(500).json({ error: 'Erro ao atualizar estoque', details: err.message });
  }
});

router.delete('/:id', podeExcluir, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM produtos WHERE id = $1 RETURNING id, nome',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    return res.json({ message: 'Produto excluído com sucesso.', produto: result.rows[0] });
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    return res.status(409).json({
      error: 'Não foi possível excluir o produto. Ele pode estar vinculado a uma transação.',
      details: err.message
    });
  }
});

module.exports = router;