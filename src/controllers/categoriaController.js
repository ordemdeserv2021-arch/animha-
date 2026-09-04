const pool = require('../config/db');

// Listar todas as categorias
async function listarCategorias(req, res) {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nome ASC');
    return res.json(result.rows);
  } catch (err) {
    console.log('--- ERRO DETALHADO DO BANCO ---', err); // Impressão do erro no terminal
    return res.status(500).json({ error: 'Erro ao buscar categorias', details: err.message });
  }
}

// Criar nova categoria
async function criarCategoria(req, res) {
  const { nome, tipo } = req.body;

  if (!nome || !tipo) {
    return res.status(400).json({ error: 'Nome e tipo (RECEITA ou DESPESA) são obrigatórios' });
  }

  try {
    const query = 'INSERT INTO categorias (nome, tipo) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [nome, tipo.toUpperCase()]);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.log('--- ERRO DETALHADO DO BANCO ---', err); // Impressão do erro no terminal
    return res.status(500).json({ error: 'Erro ao cadastrar categoria', details: err.message });
  }
}

module.exports = { listarCategorias, criarCategoria };