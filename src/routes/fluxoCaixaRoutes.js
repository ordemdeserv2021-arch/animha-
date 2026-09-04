const express = require('express');
const router = express.Router();
const { obterResumo } = require('../controllers/fluxoCaixaController');

router.get('/resumo', obterResumo);

module.exports = router;