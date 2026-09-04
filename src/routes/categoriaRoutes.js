const express = require('express');
const router = express.Router();
const { listarCategorias, criarCategoria } = require('../controllers/categoriaController');

router.get('/', listarCategorias);
router.post('/', criarCategoria);

module.exports = router;