// server.js
const express = require('express');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Se você montar um Volume no Railway, ele expõe RAILWAY_VOLUME_MOUNT_PATH.
// Usamos isso para guardar os dados de autenticação.
const volumeBase = process.env.RAILWAY_VOLUME_MOUNT_PATH || null;
const sessionDir = volumeBase ? path.join(volumeBase, 'wwebjs_auth') : path.join(__dirname, '.wwebjs_auth');

console.log('Session path:', sessionDir);

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot', dataPath: sessionDir }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let latestQrDataUrl = null;

// QR gerado (evento)
client.on('qr', async (qr) => {
  // Mostra QR no terminal (bom para dev local)
  qrcode.generate(qr, { small: true });

  // Gera dataURL para exibir no navegador (bom para escanear via /qr no Railway)
  latestQrDataUrl = await QRCode.toDataURL(qr);
  console.log('QR gerado — acesse /qr para escanear (ou veja os logs).');
});

client.on('ready', () => {
  console.log('WhatsApp client pronto ✅');
});

client.on('authenticated', () => {
  console.log('Autenticado com sucesso ✅');
});

client.on('auth_failure', (msg) => {
  console.error('Falha de autenticação:', msg);
});

client.on('disconnected', (reason) => {
  console.log('Desconectado:', reason);
});

// Exemplo simples de resposta por palavra-chave
client.on('message', msg => {
  const text = (msg.body || '').toLowerCase();
  if (text.includes('teste')) {
    client.sendMessage(msg.from, 'Resposta automática: recebi "teste".');
  }
});

// inicializa o cliente (vai gerar QR se não houver sessão)
client.initialize();

// servidor web para manter o processo vivo + rota para ver o QR
app.get('/', (req, res) => res.send('Bot do WhatsApp rodando.'));
app.get('/qr', (req, res) => {
  if (!latestQrDataUrl) return res.send('<p>Nenhum QR gerado no momento. Verifique os logs.</p>');
  return res.send(`<div style="text-align:center"><h3>Escaneie com WhatsApp → Aparelhos conectados → Escanear QR</h3><img src="${latestQrDataUrl}" style="max-width:90%;height:auto" /></div>`);
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
