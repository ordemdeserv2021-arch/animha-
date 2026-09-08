const pool = require('../config/db');

// Listar todos os produtos com o nome da categoria
async function listarProdutos(req, res) {
  try {
    const query = `
      SELECT 
        p.id, 
        p.nome, 
        p.preco_venda, 
        p.preco_custo, 
        p.quantidade_estoque, 
        p.categoria_id,
        c.nome AS categoria_nome 
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.nome ASC
    `;
    const result = await pool.query(query);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar produtos', details: err.message });
  }
}

// Cadastrar novo produto no estoque
async function criarProduto(req, res) {
  const { nome, preco_venda, preco_custo, quantidade_estoque, categoria_id } = req.body;

  if (!nome || preco_venda === undefined || quantidade_estoque === undefined) {
    return res.status(400).json({ error: 'Nome, preço de venda e quantidade de estoque são obrigatórios' });
  }

  try {
    const query = `
      INSERT INTO produtos (nome, preco_venda, preco_custo, quantidade_estoque, categoria_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      nome, 
      preco_venda, 
      preco_custo || 0.00, 
      quantidade_estoque, 
      categoria_id || null
    ];

    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar produto', details: err.message });
  }
}

// Deletar produto do estoque
async function deletarProduto(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    return res.json({ message: 'Produto removido do estoque com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover produto', details: err.message });
  }
}

module.exports = { listarProdutos, criarProduto, deletarProduto };