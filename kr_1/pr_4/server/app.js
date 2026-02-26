const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'ElectroShop API',
            version: '1.0.0',
            description: 'Документация API интернет-магазина',
        },
        servers: [{ url: 'http://localhost:3000' }],
    },
    apis: ['./app.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const app = express();

app.use(cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(express.json());

let products = [
    { id: nanoid(6), name: "iPhone 15", category: "Смартфоны", description: "128GB, Black", price: 85000, quantity: 10 },
    { id: nanoid(6), name: "MacBook Air M2", category: "Ноутбуки", description: "8/256GB, Silver", price: 110000, quantity: 5 },
    { id: nanoid(6), name: "AirPods Pro 2", category: "Аксессуары", description: "MagSafe Case", price: 22000, quantity: 15 },
    { id: nanoid(6), name: "iPad Pro 11", category: "Планшеты", description: "M2, Wi-Fi", price: 95000, quantity: 3 },
    { id: nanoid(6), name: "Apple Watch 9", category: "Часы", description: "45mm, Midnight", price: 42000, quantity: 8 },
    { id: nanoid(6), name: "Mac mini M2", category: "Компьютеры", description: "8/256GB, White", price: 65000, quantity: 4 },
    { id: nanoid(6), name: "iMac 24", category: "Компьютеры", description: "M3, 8-core GPU", price: 145000, quantity: 2 },
    { id: nanoid(6), name: "Apple TV 4K", category: "Медиаплееры", description: "64GB, Wi-Fi", price: 18000, quantity: 10 },
    { id: nanoid(6), name: "MagSafe Battery Pack", category: "Аксессуары", description: "External Battery", price: 11000, quantity: 20 },
    { id: nanoid(6), name: "Apple Pencil (2nd Gen)", category: "Аксессуары", description: "For iPad Pro/Air", price: 13000, quantity: 12 },
    { id: nanoid(6), name: "Studio Display", category: "Мониторы", description: "27-inch 5K Retina", price: 195000, quantity: 1 }
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID товара
 *         name:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         quantity:
 *           type: number
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров Apple
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Успешный возврат списка товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Добавить новый товар Apple
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Некорректные данные в запросе
 */
app.post("/api/products", (req, res) => {
    const newProduct = { ...req.body, id: nanoid(6) };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить данные существующего товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Данные успешно обновлены
 *       404:
 *         description: Товар не найден
 */
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

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар из базы данных
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар успешно удален
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", (req, res) => {
    products = products.filter(p => p.id !== req.params.id);
    res.send("Deleted");
});

app.listen(3000, () => console.log("Сервер запущен на порту 3000"));