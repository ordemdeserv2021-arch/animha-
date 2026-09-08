const express = require('express');
const path = require('path');
require('dotenv').config();

// 1. Inicializar o app Express
const app = express();

// 2. Middlewares base
app.use(express.json());

// Servir os arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, '../public')));

// 3. Importar as rotas
const categoriaRoutes = require('./routes/categoriaRoutes');
const transacaoRoutes = require('./routes/transacaoRoutes');
const fluxoCaixaRoutes = require('./routes/fluxoCaixaRoutes');
const produtoRoutes = require('./routes/produtoRoutes');

// 4. Registrar os endpoints da API
app.use('/categorias', categoriaRoutes);
app.use('/transacoes', transacaoRoutes);
app.use('/fluxo-caixa', fluxoCaixaRoutes);
app.use('/produtos', produtoRoutes);

// 5. Inicializar o servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});