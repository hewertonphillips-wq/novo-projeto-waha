// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 8080; // Railway exige porta 8080

// Caminho da sessão (Railway ou local)
const volumeBase = process.env.RAILWAY_VOLUME_MOUNT_PATH || null;
const sessionDir = volumeBase 
    ? path.join(volumeBase, 'wwebjs_auth') 
    : path.join(__dirname, '.wwebjs_auth');

// Garante que o diretório da sessão exista
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

console.log('Session path:', sessionDir);

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot', dataPath: sessionDir }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

let latestQrDataUrl = null;

// Evento de QR
client.on('qr', async (qr) => {
    qrcode.generate(qr, { small: true });
    latestQrDataUrl = await QRCode.toDataURL(qr);
    console.log('QR gerado — acesse /qr para escanear ou veja os logs.');
});

// Cliente pronto
client.on('ready', () => {
    console.log('WhatsApp client pronto ✅ Sessão persistida automaticamente.');
});

// Cliente autenticado
client.on('authenticated', () => {
    console.log('Autenticado com sucesso ✅');
});

// Falha de autenticação
client.on('auth_failure', (msg) => {
    console.error('Falha de autenticação:', msg);
});

// Desconexão
client.on('disconnected', (reason) => {
    console.log('Desconectado:', reason);
});

// Resposta automática
client.on('message', msg => {
    const text = (msg.body || '').toLowerCase();
    if (text.includes('teste')) {
        client.sendMessage(msg.from, 'Resposta automática: recebi "teste".');
    }
});

// Inicializa cliente
client.initialize().catch(err => {
    console.error('Erro ao inicializar o cliente WhatsApp:', err);
});

// Servidor web para manter o bot vivo e exibir QR
app.get('/', (req, res) => res.send('Bot do WhatsApp rodando 24/7 no Railway.'));
app.get('/qr', (req, res) => {
    if (!latestQrDataUrl) return res.send('<p>Nenhum QR gerado no momento. Verifique os logs.</p>');
    return res.send(`
        <div style="text-align:center">
            <h3>Escaneie com WhatsApp → Aparelhos conectados → Escanear QR</h3>
            <img src="${latestQrDataUrl}" style="max-width:90%;height:auto" />
        </div>
    `);
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

