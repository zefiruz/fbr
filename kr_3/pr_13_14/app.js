const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const list = document.getElementById('notes-list');

// Загрузка заметок из localStorage при старте
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
        input.value = '';
    }
});

// Обработка удаления
list.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const index = parseInt(e.target.dataset.index);
        deleteNote(index);
    }
});

// Первоначальная загрузка
loadNotes();

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker зарегистрирован:', registration.scope);
        } catch (err) {
            console.error('Ошибка регистрации ServiceWorker:', err);
        }
    });
}