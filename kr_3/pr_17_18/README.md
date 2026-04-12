# PWA Заметки с WebSocket и Push-напоминаниями

Progressive Web Application для управления заметками с поддержкой WebSocket-синхронизации в реальном времени, офлайн-режима и отложенных Push-уведомлений (напоминаний).

## Функционал

### Заметки
- Создание обычных заметок и заметок с напоминанием (выбор даты и времени).
- Хранение заметок в `localStorage` с уникальным идентификатором и полем `reminder` (timestamp).
- Удаление заметок.
- Отображение даты напоминания под текстом заметки.

### WebSocket (Socket.IO) — риал-тайм синхронизация
- При добавлении заметки клиент отправляет событие `newTask` на сервер.
- При создании заметки с напоминанием — событие `newReminder` (id, text, reminderTime).
- Сервер рассылает `taskAdded` всем подключённым клиентам.
- Заметки синхронизируются между всеми открытыми вкладками.

### Push-уведомления и напоминания
- Подписка на Push-уведомления (VAPID).
- При срабатывании таймера напоминания сервер отправляет Push всем подписчикам.
- В Push-уведомлении отображается кнопка **«Отложить на 5 минут»** (snooze).
- При нажатии «Отложить» Service Worker отправляет `POST /snooze` на сервер, который переносит напоминание на 5 минут.

### Офлайн-режим (Service Worker)
- **Cache First** для статических ресурсов (App Shell).
- **Network First** для динамического контента (`/content/`).
- Приложение работает без интернета — заметки доступны из кэша.

## Структура проекта

```
pr_17_18/
├── index.html              # App Shell
├── app.js                  # Клиентская логика + Socket.IO + Push
├── sw.js                   # Service Worker (кэш + push + snooze)
├── style.css               # Стили
├── manifest.json           # Манифест PWA
├── server.js               # Сервер (Express + Socket.IO + web-push)
├── package.json            # Зависимости
├── localhost+2.pem         # HTTPS сертификат (mkcert)
├── localhost+2-key.pem     # HTTPS ключ
├── content/                # HTML-фрагменты
│   ├── home.html           # Главная (формы заметок)
│   └── about.html          # О приложении
└── icons/                  # Иконки PWA
```

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Генерация VAPID-ключей

Для работы Push-уведомлений нужны VAPID-ключи. Сгенерируйте их:

```bash
npx web-push generate-vapid-keys
```

Скопируйте **публичный** ключ в `app.js` (переменная `VAPID_PUBLIC_KEY`), а **публичный** и **приватный** — в `server.js` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).

### 3. Настройка HTTPS (mkcert)

Service Worker и Push требуют HTTPS. Сгенерируйте локальный сертификат через [mkcert](https://github.com/FiloSottile/mkcert):

```bash
# Установите mkcert (если ещё не установлен)
mkcert -install

# Сгенерируйте сертификат для localhost
mkcert localhost
```

Полученные файлы переименуйте в `localhost+2.pem` и `localhost+2-key.pem` (или обновите пути в `server.js`).

### 4. Запуск сервера

```bash
node server.js
```

Сервер запустится на двух портах:
- **HTTP:** `http://localhost:3000`
- **HTTPS:** `https://localhost:3001`

### 5. Открытие приложения

Откройте в браузере: **https://localhost:3001**

> ⚠️ Браузер может предупредить о самоподписанном сертификате — примите риск и продолжите.

## API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/vapid-public-key` | Получить публичный VAPID-ключ |
| `POST` | `/subscribe` | Сохранить Push-подписку |
| `POST` | `/unsubscribe` | Удалить Push-подписку |
| `POST` | `/api/notes` | Создать заметку (WebSocket + Push) |
| `POST` | `/snooze?reminderId=<id>` | Отложить напоминание на 5 минут |

## WebSocket события

| Событие | Направление | Описание |
|---------|-------------|----------|
| `newTask` | Клиент → Сервер | Новая заметка без напоминания |
| `newReminder` | Клиент → Сервер | Заметка с напоминанием (id, text, reminderTime) |
| `taskAdded` | Сервер → Клиент | Уведомление о новой заметке |

## Архитектура

```
Клиент (браузер)
    │
    ├── app.js ──────────────┐
    │   ├── Socket.IO client │
    │   ├── Push Manager     │
    │   └── localStorage     │
    │                        │
    └── sw.js ───────────────┤
        ├── Cache API        │
        ├── Push handler     │
        └── notificationclick│  ← snooze → POST /snooze
                             │
Сервер (Node.js)             │
    │                        │
    ├── Express ─────────────┤
    │   ├── /subscribe       │
    │   ├── /unsubscribe     │
    │   ├── /api/notes       │
    │   └── /snooze          │  ← clearTimeout → новый setTimeout
    │                        │
    ├── Socket.IO ───────────┤
    │   ├── newTask          │
    │   ├── newReminder      │  ← setTimeout(delay) → Push
    │   └── taskAdded        │
    │                        │
    └── web-push ────────────┘
        └── sendNotification()

Хранилище напоминаний: Map<id, { timeoutId, text, reminderTime }>
```

## Как работает напоминание

1. Пользователь создаёт заметку с датой/временем напоминания.
2. Клиент отправляет `socket.emit('newReminder', { id, text, reminderTime })`.
3. Сервер вычисляет `delay = reminderTime - Date.now()` и запускает `setTimeout`.
4. По истечении времени сервер отправляет Push всем подписчикам с `reminderId`.
5. В уведомлении появляется кнопка **«Отложить на 5 минут»**.
6. При нажатии Service Worker делает `POST /snooze?reminderId=...`.
7. Сервер отменяет старый таймер (`clearTimeout`), создаёт новый на 5 минут.

## Примечания

- Подписки и напоминания хранятся в памяти сервера (в продакшене используйте базу данных).
- Для работы Push-уведомлений требуется HTTPS.
- VAPID-ключи генерируются один раз.
- Service Worker кэширует App Shell для офлайн-работы.
- При перезапуске сервера активные напоминания сбрасываются.
