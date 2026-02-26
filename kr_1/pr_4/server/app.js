const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();

app.use(cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

let products = [
    { id: nanoid(6), name: "iPhone 15", category: "Смартфоны", description: "128GB, Black", price: 85000, quantity: 10 },
    { id: nanoid(6), name: "MacBook Air M2", category: "Ноутбуки", description: "8/256GB, Silver", price: 110000, quantity: 5 },
    { id: nanoid(6), name: "AirPods Pro 2", category: "Аксессуары", description: "MagSafe Case", price: 22000, quantity: 15 },
    { id: nanoid(6), name: "iPad Pro 11", category: "Планшеты", description: "M2, Wi-Fi", price: 95000, quantity: 3 },
    { id: nanoid(6), name: "Apple Watch 9", category: "Часы", description: "45mm, Midnight", price: 42000, quantity: 8 },
    { id: nanoid(6), name: "Samsung S24", category: "Смартфоны", description: "Snapdragon Edition", price: 78000, quantity: 12 },
    { id: nanoid(6), name: "Sony WH-1000XM5", category: "Аксессуары", description: "Noise Cancelling", price: 35000, quantity: 7 },
    { id: nanoid(6), name: "Asus ROG Zephyrus", category: "Ноутбуки", description: "RTX 4070, 16GB", price: 185000, quantity: 2 },
    { id: nanoid(6), name: "Kindle Paperwhite", category: "Электронные книги", description: "6.8 inch display", price: 16000, quantity: 20 },
    { id: nanoid(6), name: "GoPro Hero 12", category: "Камеры", description: "4K 60fps", price: 45000, quantity: 6 }
];

// Получить все товары
app.get("/api/products", (req, res) => {
    res.json(products);
});

// Создать товар
app.post("/api/products", (req, res) => {
    const newProduct = { ...req.body, id: nanoid(6) };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// Обновить товар
app.patch("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const index = products.findIndex(p => p.id === id);
    if (index > -1) {
        products[index] = { ...products[index], ...req.body };
        res.json(products[index]);
    } else {
        res.status(404).send("Товар не найден");
    }
});

// Удалить товар
app.delete("/api/products/:id", (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.send("Deleted");
});

app.listen(3000, () => console.log("Сервер запущен на порту 3000"));