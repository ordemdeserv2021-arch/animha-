const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Cadastrar venda/transação com baixa de estoque
router.post('/', async (req, res) => {
  const { descricao, valor, tipo, categoria_id, produto_id, quantidade } = req.body;
  const qtdVenda = parseInt(quantidade) || 1;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Se houver produto vinculado em uma VENDA (ENTRADA), atualiza o estoque
    if (produto_id && tipo === 'ENTRADA') {
      const prodResult = await client.query(
        'SELECT quantidade_estoque FROM produtos WHERE id = $1 FOR UPDATE',
        [produto_id]
      );

      if (prodResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }

      const qtdAtual = prodResult.rows[0].quantidade_estoque;

      if (qtdAtual < qtdVenda) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Estoque insuficiente! Disponível: ${qtdAtual} un.` });
      }

      // Baixa a quantidade no estoque
      await client.query(
        'UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2',
        [qtdVenda, produto_id]
      );
    }

    // 2. Insere a transação financeira
    const transacaoResult = await client.query(
      `INSERT INTO transacoes (descricao, valor, tipo, categoria_id, produto_id, quantidade, data) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [
        descricao,
        valor,
        tipo,
        categoria_id ? parseInt(categoria_id) : null,
        produto_id ? parseInt(produto_id) : null,
        qtdVenda
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Venda registrada e estoque atualizado com sucesso!',
      transacao: transacaoResult.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro no banco de dados:', err);
    res.status(500).json({ error: 'Erro ao processar venda', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;