const express = require('express');
const app = express();
const port = 3000;
let products = [
    {id: 1, name: 'хлеб', price: 50},
    {id: 2, name: 'молоко', price: 100},
    {id: 3, name: 'соль', price: 20},
]

// Middleware для парсинга JSON
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
        res.send('Главная страница');
});

// CRUD
app.post('/products', (req, res) => {
        const { name, price } = req.body;
        const newProducts = {
            id: Date.now(),
            name,
            price
        };
        products.push(newProducts);
        res.status(201).json(newProducts);
});

app.get('/products', (req, res) => {
        res.send(JSON.stringify(products));
});

app.get('/products/:id', (req, res) => {
        let product = products.find(u => u.id == req.params.id);
        res.send(JSON.stringify(product));
});

app.patch('/products/:id', (req, res) => {
        const product = products.find(u => u.id == req.params.id);
        const { name, age } = req.body;
        if (name !== undefined) product.name = name;
        if (price !== undefined) product.age = price;
        res.json(product);
});

app.delete('/products/:id', (req, res) => {
        products = products.filter(u => u.id != req.params.id);
        res.send('Ok');
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});