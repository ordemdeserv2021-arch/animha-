const express = require('express');
const router = express.Router();
const { listarProdutos, criarProduto, deletarProduto } = require('../controllers/produtoController');

// Rotas para gestão de produtos
router.get('/', listarProdutos);
router.post('/', criarProduto);
router.delete('/:id', deletarProduto);

module.exports = router;