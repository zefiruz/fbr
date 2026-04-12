// ===== Глобальные переменные =====

const socket = io('https://localhost:3001', {
    rejectUnauthorized: false
});

const VAPID_PUBLIC_KEY = 'BPHdYICtHUtNFJxFrjRW2I4R01sixH1Vlg-1qWB9UMc4awHh1rEvvOI56Ag0GEKWh4fiRCzAkWif9iS9PirC_Jg';

let currentSubscription = null;

// ===== Навигация и загрузка контента =====

const contentDiv = document.getElementById('app-content');

// Загрузка HTML-фрагмента из папки /content/
async function loadContent(page) {
    try {
        const response = await fetch(`/content/${page}.html`);
        if (!response.ok) throw new Error(`Не удалось загрузить ${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;
        if (page === 'home') initNotes();
    } catch (err) {
        console.error(err);
        contentDiv.innerHTML = '<p class="error-message">Ошибка загрузки страницы.</p>';
    }
}

// Навигация по кнопкам
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadContent(btn.dataset.page);
        });
    });

    // Обработчики кнопок Push-уведомлений
    const subscribeBtn = document.getElementById('subscribe-btn');
    const unsubscribeBtn = document.getElementById('unsubscribe-btn');

    console.log('[Push] subscribeBtn:', subscribeBtn, 'unsubscribeBtn:', unsubscribeBtn);
    console.log('[Push] Notification supported:', 'Notification' in window);

    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', async () => {
            console.log('[Push] Кнопка "Включить уведомления" нажата');
            if ('Notification' in window) {
                console.log('[Push] Notification.permission:', Notification.permission);
                if (Notification.permission === 'denied') {
                    updatePushStatus('Уведомления запрещены в настройках браузера');
                    return;
                }
                if (Notification.permission === 'default') {
                    console.log('[Push] Запрашиваем разрешение...');
                    const permission = await Notification.requestPermission();
                    console.log('[Push] Разрешение:', permission);
                    if (permission !== 'granted') {
                        updatePushStatus('Разрешение на уведомления отклонено');
                        return;
                    }
                }
                await subscribeToPush();
            } else {
                updatePushStatus('Уведомления не поддерживаются');
            }
        });
    } else {
        console.error('[Push] Кнопка #subscribe-btn не найдена!');
    }

    if (unsubscribeBtn) {
        unsubscribeBtn.addEventListener('click', unsubscribeFromPush);
    }
});

// ===== Утилиты =====

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Работа с заметками =====

function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const list = document.getElementById('notes-list');
    if (!list) return;

    if (notes.length === 0) {
        list.innerHTML = '<li class="empty-message">Нет заметок. Добавьте первую!</li>';
        return;
    }

    list.innerHTML = notes.map((note, index) => {
        let reminderInfo = '';
        if (note.reminder) {
            const date = new Date(note.reminder);
            reminderInfo = `<br><small>!!! Напоминание: ${date.toLocaleString()}</small>`;
        }
        return `<li style="margin-bottom: 8px; padding: 12px; background: #1e1e1e; border-radius: 6px; border-left: 4px solid #667eea;">
                    <span class="note-text">${escapeHtml(note.text)}</span>${reminderInfo}
                    <button class="delete-btn" data-index="${index}" style="margin-top: 8px;">Удалить</button>
                </li>`;
    }).join('');

    // Обработка удаления
    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            deleteNote(parseInt(btn.dataset.index));
        });
    });
}

function addNote(text, reminderTimestamp = null) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const newNote = {
        id: Date.now(),
        text: text,
        reminder: reminderTimestamp
    };
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();

    // Если есть напоминание — отправляем newReminder
    if (reminderTimestamp) {
        socket.emit('newReminder', {
            id: newNote.id,
            text: text,
            reminderTime: reminderTimestamp
        });
        console.log(`Напоминание запланировано на ${new Date(reminderTimestamp).toLocaleString()}`);
    } else {
        fetch('https://localhost:3001/api/notes', { // Указал полный URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).catch(err => console.error('Ошибка отправки на сервер:', err));
    }
}

function deleteNote(index) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

function initNotes() {
    loadNotes();

    // Обработка обычной заметки
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    if (form && input) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (text) {
                addNote(text);
                input.value = '';
            }
        });
    }

    // Обработка заметки с напоминанием
    const reminderForm = document.getElementById('reminder-form');
    const reminderText = document.getElementById('reminder-text');
    const reminderTime = document.getElementById('reminder-time');
    if (reminderForm && reminderText && reminderTime) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = reminderText.value.trim();
            const time = reminderTime.value;
            if (text && time) {
                const timestamp = new Date(time).getTime();
                if (timestamp > Date.now()) {
                    addNote(text, timestamp);
                    reminderText.value = '';
                    reminderTime.value = '';
                } else {
                    alert('Дата и время должны быть в будущем');
                }
            }
        });
    }
}

// ===== Socket.IO: получение событий от других клиентов =====

socket.on('connect', () => {
    console.log('Socket.IO подключен:', socket.id);
    updatePushStatus('WebSocket подключен');
});

socket.on('disconnect', () => {
    console.log('Socket.IO отключен');
    updatePushStatus('WebSocket отключен');
});

socket.on('taskAdded', (task) => {
    console.log('Задача от другого клиента:', task);
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    if (!notes.some(n => n.text === task.text)) {
        const newNote = {
            id: Date.now(),
            text: task.text,
            reminder: task.reminder || null
        };
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }
});

// ===== Push-уведомления =====

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush() {
    console.log('[Push] subscribeToPush вызвана');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('[Push] Push не поддерживается');
        updatePushStatus('Push не поддерживается');
        return;
    }
    try {
        console.log('[Push] Ожидаю navigator.serviceWorker.ready...');
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Service Worker ready:', registration);

        // Проверяем существующую подписку
        console.log('[Push] Проверяю существующую подписку...');
        let subscription = await registration.pushManager.getSubscription();
        console.log('[Push] existingSubscription:', subscription);

        if (subscription) {
            currentSubscription = subscription;
            updatePushStatus('Уже подписаны на уведомления');
            updatePushButtons(true);
            return;
        }

        // Создаём новую подписку
        console.log('[Push] Создаю новую подписку с VAPID ключом...');

        // Добавляем таймаут 10 секунд, чтобы subscribe не зависал навсегда
        const subscribePromise = registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Таймаут подписки (10с). Проверьте, что сервер запущен и SSL-сертификат доверенный.')), 10000);
        });

        subscription = await Promise.race([subscribePromise, timeoutPromise]);
        console.log('[Push] Новая подписка создана:', subscription);

        currentSubscription = subscription;

        // Отправляем подписку на сервер
        console.log('[Push] Отправляю подписку на сервер https://localhost:3001/subscribe...');
        const response = await fetch('https://localhost:3001/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        console.log('[Push] Ответ сервера:', response.status, response.ok);

        if (response.ok) {
            updatePushStatus('Подписка оформлена успешно');
            updatePushButtons(true);
            console.log('Подписка отправлена на сервер');
        } else {
            updatePushStatus('Ошибка сохранения подписки');
        }
    } catch (err) {
        console.error('[Push] Ошибка подписки на push:', err);
        updatePushStatus('Ошибка: ' + err.message);
    }
}

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
        const response = await fetch('https://localhost:3001/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: endpoint })
        });

        if (response.ok) {
            updatePushStatus('Подписка удалена');
            updatePushButtons(false);
            console.log('Отписка выполнена');
        } else {
            updatePushStatus('Ошибка удаления подписки');
        }
    } catch (err) {
        console.error('Ошибка отписки:', err);
        updatePushStatus('Ошибка: ' + err.message);
    }
}

function updatePushStatus(message) {
    const statusEl = document.getElementById('push-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
    console.log('[Push Status]', message);
}

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

// ===== Регистрация Service Worker =====

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован:', registration.scope);

            // Проверяем существующую подписку при загрузке
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                currentSubscription = existingSubscription;
                updatePushButtons(true);
                updatePushStatus('Уже подписаны на уведомления');
                
                await fetch('https://localhost:3001/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(existingSubscription)
                }).catch(err => console.log('Не удалось синхронизировать подписку с сервером', err));
            }
        } catch (err) {
            console.error('Ошибка регистрации Service Worker:', err);
        }
    });
}

// ===== Загрузка главной страницы при старте =====

loadContent('home');
