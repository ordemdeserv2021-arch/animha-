const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const CONFIGURACAO_PADRAO = {
  nome: 'GOOD NIGHT',
  cnpj: '00.000.000/0001-00',
  endereco: 'Rua da Loja, 123 - Centro',
  telefone: '(00) 00000-0000',
  chave_pix: 'pix@loja.com'
};

async function garantirTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracao_loja (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(150) NOT NULL DEFAULT 'GOOD NIGHT',
      cnpj VARCHAR(30) NOT NULL DEFAULT '00.000.000/0001-00',
      endereco VARCHAR(255) NOT NULL DEFAULT 'Rua da Loja, 123 - Centro',
      telefone VARCHAR(30) NOT NULL DEFAULT '(00) 00000-0000',
      chave_pix VARCHAR(255) NOT NULL DEFAULT 'pix@loja.com',
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query('ALTER TABLE configuracao_loja ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(255) NOT NULL DEFAULT \'pix@loja.com\'');
}

router.get('/configuracao', async (req, res) => {
  try {
    await garantirTabela();

    const result = await pool.query(
      'SELECT nome, cnpj, endereco, telefone, chave_pix FROM configuracao_loja WHERE id = 1 LIMIT 1'
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO configuracao_loja (id, nome, cnpj, endereco, telefone, chave_pix)
         VALUES (1, $1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [CONFIGURACAO_PADRAO.nome, CONFIGURACAO_PADRAO.cnpj, CONFIGURACAO_PADRAO.endereco, CONFIGURACAO_PADRAO.telefone, CONFIGURACAO_PADRAO.chave_pix]
      );

      return res.json({ ...CONFIGURACAO_PADRAO });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao consultar configuração da loja:', err);
    return res.status(500).json({ error: 'Erro ao consultar configuração da loja', details: err.message });
  }
});

router.post('/configuracao', async (req, res) => {
  try {
    await garantirTabela();

    const dados = {
      nome: String(req.body?.nome || CONFIGURACAO_PADRAO.nome).trim() || CONFIGURACAO_PADRAO.nome,
      cnpj: String(req.body?.cnpj || CONFIGURACAO_PADRAO.cnpj).trim() || CONFIGURACAO_PADRAO.cnpj,
      endereco: String(req.body?.endereco || CONFIGURACAO_PADRAO.endereco).trim() || CONFIGURACAO_PADRAO.endereco,
      telefone: String(req.body?.telefone || CONFIGURACAO_PADRAO.telefone).trim() || CONFIGURACAO_PADRAO.telefone
    };

    if (req.headers['x-perfil-usuario'] !== 'MASTER') {
      return res.status(403).json({ error: 'Apenas o usuário Master pode alterar a chave Pix e os dados da loja.' });
    }

    const result = await pool.query(
      `INSERT INTO configuracao_loja (id, nome, cnpj, endereco, telefone, atualizado_em)
       VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id)
       DO UPDATE SET nome = EXCLUDED.nome,
                     cnpj = EXCLUDED.cnpj,
                     endereco = EXCLUDED.endereco,
                     telefone = EXCLUDED.telefone,
                     atualizado_em = CURRENT_TIMESTAMP
       RETURNING nome, cnpj, endereco, telefone, chave_pix`,
      [dados.nome, dados.cnpj, dados.endereco, dados.telefone]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar configuração da loja:', err);
    return res.status(500).json({ error: 'Erro ao salvar configuração da loja', details: err.message });
  }
});

router.patch('/configuracao/chave-pix', async (req, res) => {
  if (req.headers['x-perfil-usuario'] !== 'MASTER') {
    return res.status(403).json({ error: 'Apenas o usuário Master pode alterar a chave Pix.' });
  }

  try {
    await garantirTabela();

    const chavePix = String(req.body?.chave_pix || '').trim();
    if (!chavePix) {
      return res.status(400).json({ error: 'Informe uma chave Pix.' });
    }

    const result = await pool.query(
      `INSERT INTO configuracao_loja (id, chave_pix)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET chave_pix = EXCLUDED.chave_pix, atualizado_em = CURRENT_TIMESTAMP
       RETURNING chave_pix`,
      [chavePix]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar chave Pix:', err);
    return res.status(500).json({ error: 'Erro ao salvar chave Pix.', details: err.message });
  }
});

module.exports = router;
