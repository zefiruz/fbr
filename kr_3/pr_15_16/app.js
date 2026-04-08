// ===== Навигация и загрузка контента =====

const appContent = document.getElementById('app-content');
const navButtons = document.querySelectorAll('.nav-btn');

// Загрузка HTML-фрагмента из папки /content/
function LoadContent(page) {
    fetch(`content/${page}.html`)
        .then(response => {
            if (!response.ok) throw new Error(`Не удалось загрузить ${page}.html`);
            return response.text();
        })
        .then(html => {
            appContent.innerHTML = html;
            // Если загружена главная страница — инициализируем заметки
            if (page === 'home') {
                initNotes();
            }
        })
        .catch(err => {
            console.error(err);
            appContent.innerHTML = '<p class="error-message">Ошибка загрузки страницы.</p>';
        });
}

// Навигация по кнопкам
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Убираем активный класс у всех
        navButtons.forEach(b => b.classList.remove('active'));
        // Добавляем активный класс нажатой кнопке
        btn.classList.add('active');
        // Загружаем контент
        LoadContent(btn.dataset.page);
    });
});

// ===== Работа с заметками =====

function initNotes() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const list = document.getElementById('notes-list');

    if (!form || !input || !list) return;

    // Загрузка заметок из localStorage
    function loadNotes() {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        if (notes.length === 0) {
            list.innerHTML = '<li class="empty-message">Нет заметок. Добавьте первую!</li>';
            return;
        }
        list.innerHTML = notes.map((note, index) => `
            <li>
                <span class="note-text">${note}</span>
                <button class="delete-btn" data-index="${index}">Удалить</button>
            </li>
        `).join('');
    }

    // Сохранение заметки
    function addNote(text) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push(text);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }

    // Удаление заметки
    function deleteNote(index) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.splice(index, 1);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }

    // Обработка отправки формы
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            addNote(text);
            // Отправляем событие newTask через WebSocket
            if (socket && socket.connected) {
                socket.emit('newTask', { text });
            }
            // Также отправляем на сервер для Push-уведомлений
            fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            }).catch(err => console.error('Ошибка отправки на сервер:', err));

            input.value = '';
        }
    });

    // Обработка удаления (делегирование событий)
    list.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const index = parseInt(e.target.dataset.index);
            deleteNote(index);
        }
    });

    // Первоначальная загрузка
    loadNotes();
}

// ===== Socket.IO подключение =====

let socket = null;

function initSocketIO() {
    // Подключаемся к HTTPS серверу
    socket = io('https://localhost:3001', {
        transports: ['websocket', 'polling'],
        rejectUnauthorized: false // Для localhost с self-signed сертификатом
    });

    socket.on('connect', () => {
        console.log('Socket.IO подключен:', socket.id);
        updatePushStatus('WebSocket подключен');
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO отключен');
        updatePushStatus('WebSocket отключен');
    });

    // Получение уведомления о новой задаче от других клиентов
    socket.on('taskAdded', (data) => {
        console.log('Получено событие taskAdded:', data);
        // Добавляем заметку локально (если она пришла не от нас)
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        if (!notes.includes(data.text)) {
            addNoteFromRemote(data.text);
        }
    });

    socket.on('connect_error', (err) => {
        console.error('Ошибка подключения Socket.IO:', err);
        updatePushStatus('Ошибка WebSocket');
    });
}

// Добавление заметки от удаленного клиента
function addNoteFromRemote(text) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push(text);
    localStorage.setItem('notes', JSON.stringify(notes));

    // Обновляем список если он отображается
    const list = document.getElementById('notes-list');
    if (list) {
        if (notes.length === 1) {
            list.innerHTML = '';
        }
        const index = notes.length - 1;
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="note-text">${text}</span>
            <button class="delete-btn" data-index="${index}">Удалить</button>
        `;
        list.appendChild(li);

        // Обработка удаления
        li.querySelector('.delete-btn').addEventListener('click', () => {
            deleteNote(index);
        });
    }
}

// ===== Push-уведомления =====

let currentSubscription = null;

// Получение VAPID публичного ключа с сервера
async function getVapidPublicKey() {
    try {
        const response = await fetch('/api/vapid-public-key');
        const data = await response.json();
        return data.publicKey;
    } catch (err) {
        console.error('Ошибка получения VAPID ключа:', err);
        return null;
    }
}

// Конвертация VAPID ключа из base64 в Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Подписка на Push-уведомления
async function subscribeToPush() {
    if (!('serviceWorker' in navigator)) {
        updatePushStatus('Service Worker не поддерживается');
        return;
    }

    if (!('PushManager' in window)) {
        updatePushStatus('Push-уведомления не поддерживаются');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Проверяем существующую подписку
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            currentSubscription = subscription;
            updatePushStatus('Уже подписаны на уведомления');
            updatePushButtons(true);
            return;
        }

        // Получаем VAPID публичный ключ
        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) {
            updatePushStatus('Не удалось получить VAPID ключ');
            return;
        }

        // Создаем новую подписку
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        currentSubscription = subscription;

        // Отправляем подписку на сервер
        const response = await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (response.ok) {
            updatePushStatus('Подписка оформлена успешно');
            updatePushButtons(true);
            console.log('Подписка отправлена на сервер');
        } else {
            updatePushStatus('Ошибка сохранения подписки');
        }
    } catch (err) {
        console.error('Ошибка подписки на Push:', err);
        updatePushStatus('Ошибка: ' + err.message);
    }
}

// Отписка от Push-уведомлений
async function unsubscribeFromPush() {
    if (!currentSubscription) {
        updatePushStatus('Нет активной подписки');
        return;
    }

    try {
        const endpoint = currentSubscription.endpoint;

        // Удаляем подписку на уровне браузера
        await currentSubscription.unsubscribe();
        currentSubscription = null;

        // Удаляем подписку на сервере
        const response = await fetch('/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
        });

        if (response.ok) {
            updatePushStatus('Подписка удалена');
            updatePushButtons(false);
            console.log('Подписка удалена с сервера');
        } else {
            updatePushStatus('Ошибка удаления подписки');
        }
    } catch (err) {
        console.error('Ошибка отписки от Push:', err);
        updatePushStatus('Ошибка: ' + err.message);
    }
}

// Обновление статуса Push-уведомлений
function updatePushStatus(message) {
    const statusEl = document.getElementById('push-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
    console.log('[Push Status]', message);
}

// Обновление кнопок Push
function updatePushButtons(isSubscribed) {
    const subscribeBtn = document.getElementById('subscribe-btn');
    const unsubscribeBtn = document.getElementById('unsubscribe-btn');

    if (subscribeBtn && unsubscribeBtn) {
        subscribeBtn.disabled = isSubscribed;
        unsubscribeBtn.disabled = !isSubscribed;

        subscribeBtn.classList.toggle('push-btn-disabled', isSubscribed);
        unsubscribeBtn.classList.toggle('push-btn-disabled', !isSubscribed);
    }
}

// ===== Регистрация Service Worker =====

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker зарегистрирован:', registration.scope);

            // Запрашиваем разрешение на уведомления
            if ('Notification' in window && Notification.permission === 'default') {
                // Не запрашиваем сразу, ждем действия пользователя
            }

            // Проверяем существующую подписку при загрузке
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                currentSubscription = existingSubscription;
                updatePushButtons(true);
                updatePushStatus('Уже подписаны на уведомления');
            }
        } catch (err) {
            console.error('Ошибка регистрации Service Worker:', err);
        }
    });
}

// ===== Инициализация при загрузке =====

window.addEventListener('DOMContentLoaded', () => {
    // Инициализируем Socket.IO
    initSocketIO();

    // Обработчики кнопок Push-уведомлений
    const subscribeBtn = document.getElementById('subscribe-btn');
    const unsubscribeBtn = document.getElementById('unsubscribe-btn');

    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            // Запрашиваем разрешение на уведомления
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        subscribeToPush();
                    } else {
                        updatePushStatus('Разрешение на уведомления отклонено');
                    }
                });
            } else {
                updatePushStatus('Уведомления не поддерживаются');
            }
        });
    }

    if (unsubscribeBtn) {
        unsubscribeBtn.addEventListener('click', unsubscribeFromPush);
    }
});

// Загрузка главной страницы при старте
LoadContent('home');
