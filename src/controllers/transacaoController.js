const pool = require('../config/db');

// Listar transações
// Criar transação e atualizar estoque
async function criarTransacao(req, res) {
  const { descricao, valor, tipo, categoria_id, produto_id, quantidade } = req.body;

  if (!descricao || valor === undefined || valor === null || !tipo) {
    return res.status(400).json({ error: 'Descrição, valor e tipo são obrigatórios' });
  }

  const descTratada = String(descricao).trim();
  const valorTratado = Number(valor);
  const tipoTratado = String(tipo).toUpperCase().trim();
  const catIdTratado = (categoria_id && !isNaN(categoria_id)) ? parseInt(categoria_id, 10) : null;
  const prodIdTratado = (produto_id && !isNaN(produto_id)) ? parseInt(produto_id, 10) : null;
  const qtdTratada = (quantidade && !isNaN(quantidade)) ? parseInt(quantidade, 10) : 1;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Inserção com TODAS as colunas que a tabela exige
    const queryTransacao = `
      INSERT INTO transacoes (descricao, valor, tipo, categoria_id, produto_id, quantidade)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const resTransacao = await client.query(queryTransacao, [
      descTratada,
      valorTratado,
      tipoTratado,
      catIdTratado,
      prodIdTratado,
      qtdTratada
    ]);

    // Abate no estoque da tabela de produtos quando for venda/entrada
    if (prodIdTratado && tipoTratado === 'ENTRADA') {
      const queryEstoque = `
        UPDATE produtos 
        SET quantidade_estoque = quantidade_estoque - $1 
        WHERE id = $2 AND quantidade_estoque >= $1
        RETURNING *
      `;
      const resEstoque = await client.query(queryEstoque, [qtdTratada, prodIdTratado]);

      if (resEstoque.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Estoque insuficiente para realizar esta venda' });
      }
    }

    await client.query('COMMIT');
    return res.status(201).json(resTransacao.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro detalhado no PostgreSQL:', err.message);
    return res.status(500).json({ error: 'Erro ao cadastrar transação', details: err.message });
  } finally {
    client.release();
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

module.exports = { listarTransacoes, criarTransacao, deletarTransacao };