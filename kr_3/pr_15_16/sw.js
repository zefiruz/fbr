const STATIC_CACHE = 'notes-cache-v2';
const DYNAMIC_CACHE = 'dynamic-content-v1';

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
  console.log('Получено Push-уведомление:', event);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Если данные не в формате JSON, используем текст
    data = {
      title: 'Новая заметка',
      body: event.data ? event.data.text() : 'Без заголовка',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-48x48.png'
    };
  }

  const title = data.title || 'Новая заметка';
  const options = {
    body: data.body || 'Новое событие',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-48x48.png',
    tag: 'note-notification',
    renotify: true,
    actions: [
      { action: 'view', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
    data: {
      url: self.location.origin + '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ===== Notification Click: обработка клика по уведомлению =====
self.addEventListener('notificationclick', event => {
  console.log('Клик по уведомлению:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Если есть открытое окно — фокусируем его
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Иначе открываем новое
        return clients.openWindow(self.location.origin + '/');
      })
    );
  }
});

// ===== Push Subscription Change =====
self.addEventListener('pushsubscriptionchange', event => {
  console.log('Подписка на Push изменена');
  // Здесь можно обновить подписку на сервере
});
