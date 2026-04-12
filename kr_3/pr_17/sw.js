const STATIC_CACHE = 'notes-cache-v3';
const DYNAMIC_CACHE = 'dynamic-content-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ===== Install: кэшируем статику =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ===== Activate: удаляем старые кэши =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// ===== Fetch: стратегии кэширования =====
self.addEventListener('fetch', event => {
  // Не кэшируем POST-запросы
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Стратегия Cache First для статических ресурсов
  if (STATIC_ASSETS.some(asset => requestUrl.pathname.endsWith(asset)) ||
    requestUrl.pathname === '/' ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.startsWith('/icons/') ||
    requestUrl.pathname.includes('socket.io')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Стратегия Network First для файлов из /content/
  if (requestUrl.pathname.startsWith('/content/')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Фолбек: ищем в кэше
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Если и в кэше нет — возвращаем home.html
            return caches.match('/content/home.html');
          });
        })
    );
    return;
  }

  // Для остальных ресурсов — стандартная логика
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// ===== Push: отображение уведомлений =====
self.addEventListener('push', event => {
  console.log('[SW] Получено Push-уведомление');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log('[SW] Распарсенные данные:', data);
  } catch (e) {
    console.warn('[SW] Не удалось распарсить JSON, используем текст:', e);
    data = {
      title: 'Новая заметка',
      body: event.data ? event.data.text() : 'Без заголовка',
      reminderId: null
    };
  }

  const title = data.title || 'Новая заметка';
  const options = {
    body: data.body || 'Новое событие',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-48x48.png',
    tag: 'note-notification',
    renotify: true,
    data: {
      reminderId: data.reminderId || null,
      url: self.location.origin + '/'
    }
  };

  // Добавляем кнопку «Отложить» только если это напоминание
  if (data.reminderId) {
    options.actions = [
      { action: 'snooze', title: 'Отложить на 5 минут' },
      { action: 'view', title: 'Открыть' }
    ];
    console.log('[SW] Это напоминание, добавлена кнопка snooze');
  }

  console.log('[SW] Показываю уведомление:', title, data.body);
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ===== Notification Click: обработка клика по уведомлению =====
self.addEventListener('notificationclick', event => {
  console.log('Клик по уведомлению:', event.action);

  const notification = event.notification;
  const action = event.action;

  if (action === 'snooze') {
    const reminderId = notification.data.reminderId;
    const text = notification.body; // Берем текст прямо из уведомления

    event.waitUntil(
      fetch('https://localhost:3001/snooze', { // Указываем точный адрес сервера
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId, text }) // Передаем ID и текст в теле запроса
      })
      .then(() => notification.close())
      .catch(err => console.error('Ошибка при откладывании:', err))
    );
  }
});

// ===== Push Subscription Change =====
self.addEventListener('pushsubscriptionchange', event => {
  console.log('Подписка на Push изменена');
  // Здесь можно обновить подписку на сервере
});
