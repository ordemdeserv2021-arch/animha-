const express = require('express');
const path = require('path'); //Importa o módulo path
require('dotenv').config();
const pool = require('./config/db');

// Importar as rotas da aplicação
const categoriaRoutes = require('./routes/categoriaRoutes');
const transacaoRoutes = require('./routes/transacaoRoutes');
const fluxoCaixaRoutes = require('./routes/fluxoCaixaRoutes');

const app = express();

app.use(express.json());

// Servir a pasta public apontando para a raiz do projeto (subindo um nível a partir de src)
app.use(express.static(path.join(__dirname, '../public')));

// Registrar os endpoints base
app.use('/categorias', categoriaRoutes);
app.use('/transacoes', transacaoRoutes);
app.use('/fluxo-caixa', fluxoCaixaRoutes);

// Rota de teste
// app.get('/', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT NOW()');
//     res.json({ message: 'API de Fluxo de Caixa rodando!', db_time: result.rows[0].now });
//   } catch (err) {
//     res.status(500).json({ error: 'Erro ao conectar no banco de dados', details: err.message });
//   }
// });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});