// Força o ambiente Node.js a trabalhar no fuso de Brasília
process.env.TZ = 'America/Sao_Paulo';

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Importar as rotas
const categoriaRoutes = require('./routes/categoriaRoutes');
const transacaoRoutes = require('./routes/transacaoRoutes');
const fluxoCaixaRoutes = require('./routes/fluxoCaixaRoutes');
const produtoRoutes = require('./routes/produtoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');

// Registrar os endpoints da API
app.use('/', usuarioRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/transacoes', transacaoRoutes);
app.use('/fluxo-caixa', fluxoCaixaRoutes);
app.use('/produtos', produtoRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/categorias', categoriaRoutes);

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} com timezone America/Sao_Paulo`);
});