const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Rota de Login com atualização de horário no PostgreSQL
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, nome, login, perfil, pode_excluir FROM usuarios WHERE LOWER(TRIM(login)) = LOWER(TRIM($1)) AND senha = $2',
      [login, senha]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }

    const usuario = userResult.rows[0];

    const updateResult = await pool.query(
      `UPDATE usuarios 
       SET ultimo_login = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING TO_CHAR(ultimo_login AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS hora_login_formatada`,
      [usuario.id]
    );

    const horaLogin = updateResult.rows[0].hora_login_formatada;

    return res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
        pode_excluir: usuario.pode_excluir,
        horaLogin: horaLogin
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro no servidor', details: err.message });
  }
});

// Listar todos os operadores/usuários (Apenas Master)
router.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, login, perfil, pode_excluir, TO_CHAR(ultimo_login, 'DD/MM/YYYY HH24:MI:SS') AS ultimo_login FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários', details: err.message });
  }
});

// Cadastrar novo operador/usuário
router.post('/usuarios', async (req, res) => {
  const { nome, login, senha, perfil, pode_excluir } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO usuarios (nome, login, senha, perfil, pode_excluir) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, login, perfil, pode_excluir`,
      [nome, login.trim().toLowerCase(), senha, perfil || 'OPERADOR', pode_excluir || false]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', usuario: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Este login já existe no sistema.' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar usuário', details: err.message });
  }
});

// Atualizar permissão de usuário
router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { pode_excluir, perfil } = req.body;

  try {
    await pool.query(
      'UPDATE usuarios SET pode_excluir = $1, perfil = $2 WHERE id = $3',
      [pode_excluir, perfil, id]
    );
    res.json({ message: 'Usuário atualizado!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: err.message });
  }
});

module.exports = router;