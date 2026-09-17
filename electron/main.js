const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { iniciarServidor } = require('../src/server');

let servidor;

async function criarJanela() {
  try {
    servidor = await iniciarServidor(0);
    const porta = servidor.address().port;

    const janela = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    janela.once('ready-to-show', () => janela.show());
    await janela.loadURL(`http://127.0.0.1:${porta}`);
  } catch (err) {
    dialog.showErrorBox('Fluxo de Caixa & PDV', `Não foi possível iniciar o aplicativo.\n\n${err.message}`);
    app.quit();
  }
}

app.whenReady().then(criarJanela);

app.on('window-all-closed', () => {
  if (servidor) servidor.close();
  app.quit();
});

app.on('before-quit', () => {
  if (servidor) servidor.close();
});