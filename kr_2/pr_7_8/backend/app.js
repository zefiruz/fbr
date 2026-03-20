import express from "express";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
const app = express();
const port = 3000;
app.use(cors());

const JWT_SECRET = "access_secret";
const ACCESS_EXPIRES_IN = "15m";

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API AUTH",
            version: "1.0.0",
            description: "Простое API для изучения авторизации",
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: "Локальный сервер",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./app.js"],
};

let users = [];
let products = [
    {
        id: "1",
        name: "Бананы",
        category: "фрукты",
        description: "Бананы Египетские",
        count: 100,
        cost: 160,
    },
    {
        id: "2",
        name: "Апельсины",
        category: "фрукты",
        description: "Апельсины Абхазские",
        count: 100,
        cost: 180,
    },
    {
        id: "3",
        name: "Помидоры",
        category: "овощи",
        description: "Помидоры сливовидные отечественные",
        count: 100,
        cost: 200,
    },
];

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    // Ожидаем формат: Bearer <token>
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            error: "Missing or invalid Authorization header",
        });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({
            error: "Invalid or expired token",
        });
    }
}

function findUserOr404(username, res) {
    const user = users.find((u) => u.username == username);
    if (!user) {
        res.status(404).json({ error: "user not found" });
        return null;
    }
    return user;
}

async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());

app.use((req, res, next) => {
    res.on("finish", () => {
        console.log(
            `[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`,
        );
        if (
            req.method === "POST" ||
            req.method === "PUT" ||
            req.method === "PATCH"
        ) {
            console.log("Body:", req.body);
        }
    });
    next();
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение текущего пользователя
 *     description: Получает текущего пользователя
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Текущий пользователь
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "ab12cd"
 *                 username:
 *                   type: string
 *                   example: "ivan"
 *       401:
 *         description: Не авторизован (отсутствует или недействителен токен)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing or invalid Authorization header"
 *       404:
 *          description: Текущий пользователь не найден
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  error:
 *                    type: string
 *                    example: "User not found"
 */

app.get("/api/auth/me", authMiddleware, (req, res) => {
    const userId = req.user.sub;
    const user = users.find((u) => u.id === userId);
    if (!user) {
        return res.status(404).json({
            error: "User not found",
        });
    }
    res.json({
        id: user.id,
        username: user.username,
    });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     description: Создает нового пользователя с хешированным паролем
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - age
 *             properties:
 *               username:
 *                 type: string
 *                 example: "ivan"
 *               password:
 *                 type: string
 *                 example: "qwerty123"
 *               age:
 *                 type: integer
 *                 example: 20
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "ab12cd"
 *                 username:
 *                   type: string
 *                   example: "ivan"
 *                 age:
 *                   type: integer
 *                   example: 20
 *       400:
 *         description: Некорректные данные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "username, password and age are required"
 */
app.post("/api/auth/register", async (req, res) => {
    const { username, age, password } = req.body;

    if (!username || !password || age === undefined) {
        return res
            .status(400)
            .json({ error: "username, password and age are required" });
    }

    const newUser = {
        id: nanoid(),
        username: username,
        age: Number(age),
        hashedPassword: await hashPassword(password),
    };

    users.push(newUser);

    const { hashedPassword, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Авторизация пользователя
 *     description: Проверяет логин и пароль пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "ivan"
 *               password:
 *                 type: string
 *                 example: "qwerty123"
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Отсутствуют обязательные поля
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "username and password are required"
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid credentials"
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 */
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({
            error: "username and password are required",
        });
    }
    const user = users.find((u) => u.username === username);
    if (!user) {
        return res.status(404).json({
            error: "User not found",
        });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
        return res.status(401).json({
            error: "Invalid credentials",
        });
    }

    const accessToken = jwt.sign(
        {
            sub: user.id,
            username: user.username,
        },
        JWT_SECRET,
        {
            expiresIn: ACCESS_EXPIRES_IN,
        },
    );
    res.json({
        accessToken,
    });
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - count
 *         - cost
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный уникальный ID продукта
 *         name:
 *           type: string
 *           description: Название продукта
 *         category:
 *           type: string
 *           description: Категория продукта
 *         description:
 *           type: string
 *           description: Описание продукта
 *         count:
 *           type: integer
 *           description: Количество на складе
 *         cost:
 *           type: integer
 *           description: Стоимость продукта
 *       example:
 *         id: "abc123"
 *         name: "Бананы"
 *         category: "Фрукты"
 *         description: "Бананы египетские"
 *         count: 100
 *         cost: 160
 */

function findProductOr404(id, res) {
    const product = products.find((u) => u.id === id);
    if (!product) {
        res.status(404).json({ error: "product not found" });
        return null;
    }
    return product;
}

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создает новый продукт
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - count
 *               - cost
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               count:
 *                 type: integer
 *               cost:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Продукт успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в теле запроса
 */
app.post("/api/products", (req, res) => {
    const { name, category, description, count, cost } = req.body;
    const newproduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        count: Number(count),
        cost: Number(cost),
    };
    products.push(newproduct);
    res.status(201).json(newproduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех продуктов
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список продуктов
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
 * /api/products/{id}:
 *   get:
 *     summary: Получает продукт по ID (требуется авторизация)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID продукта
 *     responses:
 *       200:
 *         description: Данные продукта
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Продукт не найден
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Полностью обновляет продукт (требуется авторизация)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID продукта
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - count
 *               - cost
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               count:
 *                 type: integer
 *               cost:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Обновленный продукт
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в теле запроса
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Продукт не найден
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;

    const { name, category, description, count, cost } = req.body;

    if (!name || !category || !description || count === undefined || cost === undefined) {
        return res.status(400).json({
            error: "All fields are required for PUT operation",
        });
    }

    product.name = name.trim();
    product.category = category.trim();
    product.description = description.trim();
    product.count = Number(count);
    product.cost = Number(cost);

    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет продукт (требуется авторизация)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID продукта
 *     responses:
 *       204:
 *         description: Продукт успешно удален (нет тела ответа)
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Продукт не найден
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
    const id = req.params.id;
    const exists = products.some((u) => u.id === id);
    if (!exists) return res.status(404).json({ error: "product not found" });
    products = products.filter((u) => u.id !== id);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(
        `Swagger UI доступен по адресу http://localhost:${port}/api-docs`,
    );
});