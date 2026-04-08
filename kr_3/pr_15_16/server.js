const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIO = require('socket.io');
const webPush = require('web-push');

const app = express();

// ===== HTTPS конфигурация =====
const HTTPS_OPTIONS = {
  key: fs.readFileSync(path.join(__dirname, 'localhost+2-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost+2.pem'))
};

// ===== VAPID ключи =====
// Для генерации новых ключей используйте: npm run generate-vapid
const VAPID_PUBLIC_KEY = 'BPHdYICtHUtNFJxFrjRW2I4R01sixH1Vlg-1qWB9UMc4awHh1rEvvOI56Ag0GEKWh4fiRCzAkWif9iS9PirC_Jg';
const VAPID_PRIVATE_KEY = '12X7CC_oG66gpU7l1a6DFStX8GLKHbRFA8mCncPRG9Q';
const VAPID_SUBJECT = 'mailto:example@example.com';

webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ===== Middleware =====
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== Хранилище подписок (в продакшене используйте БД) =====
let pushSubscriptions = [];

// ===== Эндпоинты для Push-подписок =====
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  pushSubscriptions.push(subscription);
  console.log('Новая подписка добавлена. Всего:', pushSubscriptions.length);
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  const endpoint = req.body.endpoint;
  pushSubscriptions = pushSubscriptions.filter(sub => sub.endpoint !== endpoint);
  console.log('Подписка удалена. Осталось:', pushSubscriptions.length);
  res.status(200).json({ message: 'Подписка удалена' });
});

// ===== Эндпоинт для получения VAPID публичного ключа =====
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ===== Создание серверов =====
const httpServer = http.createServer(app);
const httpsServer = https.createServer(HTTPS_OPTIONS, app);

// ===== Socket.IO с поддержкой CORS =====
const io = socketIO(httpsServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ===== WebSocket логика =====
io.on('connection', (socket) => {
  console.log('Клиент подключен:', socket.id);

  socket.on('disconnect', () => {
    console.log('Клиент отключен:', socket.id);
  });
});

// ===== Функция отправки Push-уведомления =====
function sendPushNotification(subscription, payload) {
  webPush.sendNotification(subscription, JSON.stringify(payload))
    .catch(err => {
      console.error('Ошибка отправки push-уведомления:', err);
      // Если подписка недействительна — удаляем её
      if (err.statusCode === 410) {
        pushSubscriptions = pushSubscriptions.filter(sub => sub.endpoint !== subscription.endpoint);
      }
    });
}

// ===== REST API для заметок =====
app.post('/api/notes', (req, res) => {
  const { text } = req.body;

  // Рассылаем всем клиентам через WebSocket
  io.emit('taskAdded', { text, timestamp: Date.now() });

  // Отправляем Push-уведомление всем подписчикам
  const payload = {
    title: 'Новая заметка',
    body: text,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-48x48.png'
  };

  pushSubscriptions.forEach(subscription => {
    sendPushNotification(subscription, payload);
  });

  res.json({ message: 'Заметка создана', note: { text, timestamp: Date.now() } });
});

// ===== Запуск серверов =====
const HTTP_PORT = 3000;
const HTTPS_PORT = 3001;

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP сервер запущен на порту ${HTTP_PORT}`);
});

httpsServer.listen(HTTPS_PORT, () => {
  console.log(`HTTPS сервер запущен на порту ${HTTPS_PORT}`);
  console.log(`Откройте https://localhost:${HTTPS_PORT}`);
});
