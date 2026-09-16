const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, '../../logs');
const logFile = path.join(logDirectory, 'sistema.log');

function registrarLog(acao, detalhes = {}) {
  fs.mkdirSync(logDirectory, { recursive: true });
  const linha = JSON.stringify({
    data: new Date().toISOString(),
    acao,
    ...detalhes
  });
  fs.appendFileSync(logFile, `${linha}\n`, 'utf8');
}

module.exports = { registrarLog };