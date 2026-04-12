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

// ===== Хранилище активных напоминаний: ключ - id заметки, значение - объект с таймером и данными =====
const reminders = new Map();

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

  // Обработка новой задачи с напоминанием
  socket.on('newReminder', (reminder) => {
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();

    if (delay <= 0) {
      console.log('Напоминание в прошлом, игнорируем:', id);
      return;
    }

    console.log(`Запланировано напоминание ${id} через ${Math.round(delay / 1000)}с`);

    // Сохраняем таймер
    const timeoutId = setTimeout(() => {
      console.log(`Сработало напоминание ${id}`);
      console.log(`Подписчиков на момент отправки: ${pushSubscriptions.length}`);

      try {
        const payload = JSON.stringify({
          title: '!!! Напоминание',
          body: text,
          reminderId: id
        });

        if (pushSubscriptions.length === 0) {
          console.warn('Нет подписчиков — push не отправлен');
        }

        pushSubscriptions.forEach((sub, i) => {
          webPush.sendNotification(sub, payload)
            .then(() => console.log(`Push #${i + 1} доставлен`))
            .catch(err => console.error(`Push error #${i + 1}:`, err.message || err));
        });

        // Также отправляем событие taskAdded для обновления localStorage у подключённых клиентов
        io.emit('taskAdded', { id, text, reminder: reminderTime });
      } catch (err) {
        console.error('Ошибка при отправке напоминания:', err);
      }

      // Удаляем напоминание из хранилища после отправки
      reminders.delete(id);
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
  });

  // Обработка обычной задачи
  socket.on('newTask', (data) => {
    console.log('Получена новая задача:', data.text);
    io.emit('taskAdded', { text: data.text, timestamp: data.timestamp });
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

// ===== Эндпоинт для откладывания напоминания =====
app.post('/snooze', (req, res) => {
  const { reminderId, text } = req.body;

  if (!reminderId || !text) {
    return res.status(400).json({ error: 'Не хватает данных для snooze' });
  }

  // Если таймер чудом остался - очищаем
  if (reminders.has(reminderId)) {
    clearTimeout(reminders.get(reminderId).timeoutId);
  }

  // Устанавливаем новый таймер через 5 минут (300 000 мс)
  const newDelay = 5 * 60 * 1000; 
  
  const newTimeoutId = setTimeout(() => {
    console.log(`Сработало отложенное напоминание ${reminderId}`);

    const payload = JSON.stringify({
      title: 'Напоминание отложено',
      body: text,
      reminderId: reminderId
    });

    pushSubscriptions.forEach(sub => {
      webPush.sendNotification(sub, payload).catch(err =>
        console.error('Push error:', err));
    });

    reminders.delete(reminderId);
  }, newDelay);

  // Обновляем хранилище
  reminders.set(reminderId, {
    timeoutId: newTimeoutId,
    text: text,
    reminderTime: Date.now() + newDelay
  });

  console.log(`Напоминание ${reminderId} отложено на 5 минут`);
  res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
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
