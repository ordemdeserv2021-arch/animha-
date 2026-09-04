const express = require('express');
const router = express.Router();
const { listarTransacoes, criarTransacao, deletarTransacao } = require('../controllers/transacaoController');

// Define os métodos HTTP apontando para as funções do controller
router.get('/', listarTransacoes);
router.post('/', criarTransacao);
router.delete('/:id', deletarTransacao);

module.exports = router;