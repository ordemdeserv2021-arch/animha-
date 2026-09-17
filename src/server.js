// Força o ambiente Node.js a trabalhar no fuso de Brasília
process.env.TZ = 'America/Sao_Paulo';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { registrarLog } = require('./services/logger');

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
const configuracaoLojaRoutes = require('./routes/configuracaoLojaRoutes');

// Registrar os endpoints da API
app.use('/', usuarioRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/transacoes', transacaoRoutes);
app.use('/fluxo-caixa', fluxoCaixaRoutes);
app.use('/produtos', produtoRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/', configuracaoLojaRoutes);

app.use((err, req, res, next) => {
  registrarLog('ERRO_NAO_TRATADO', {
    metodo: req.method,
    rota: req.originalUrl,
    erro: err.message,
    stack: err.stack
  });

  if (res.headersSent) return next(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

process.on('uncaughtException', (err) => {
  registrarLog('ERRO_FATAL', { erro: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  const erro = reason instanceof Error ? reason : new Error(String(reason));
  registrarLog('PROMISE_NAO_TRATADA', { erro: erro.message, stack: erro.stack });
});

function iniciarServidor(porta = PORT) {
  return new Promise((resolve, reject) => {
    const servidor = app.listen(porta, () => {
      console.log(`Servidor rodando na porta ${porta} com timezone America/Sao_Paulo`);
      resolve(servidor);
    });

    servidor.once('error', reject);
  });
}

if (require.main === module) {
  iniciarServidor().catch((err) => {
    console.error('Não foi possível iniciar o servidor:', err);
    process.exitCode = 1;
  });
}

module.exports = { app, iniciarServidor };