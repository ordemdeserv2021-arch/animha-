const pool = require('../config/db');

// Listar transações
async function listarTransacoes(req, res) {
  const { dataInicio, dataFim } = req.query;

  try {
    let query = `
      SELECT 
        t.id, 
        t.descricao, 
        t.valor, 
        t.tipo, 
        t.data, 
        c.nome AS categoria_nome 
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
    `;
    const params = [];

    if (dataInicio && dataFim) {
      query += ` WHERE t.data >= $1 AND t.data <= $2`;
      params.push(`${dataInicio} 00:00:00`, `${dataFim} 23:59:59`);
    }

    query += ` ORDER BY t.data DESC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar transações', details: err.message });
  }
}

// Criar transação
async function criarTransacao(req, res) {
  const { descricao, valor, tipo, categoria_id } = req.body;

  if (!descricao || !valor || !tipo) {
    return res.status(400).json({ error: 'Descrição, valor e tipo são obrigatórios' });
  }

  try {
    const query = `
      INSERT INTO transacoes (descricao, valor, tipo, categoria_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [descricao, valor, tipo.toUpperCase(), categoria_id || null]);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar transação', details: err.message });
  }
}

// Deletar transação
async function deletarTransacao(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM transacoes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    return res.json({ message: 'Transação excluída com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir transação', details: err.message });
  }
}

// Exportação obrigatória para o router consumir
module.exports = { listarTransacoes, criarTransacao, deletarTransacao };