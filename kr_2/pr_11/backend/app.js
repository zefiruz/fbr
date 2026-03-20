const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const app = express();
const port = 3000;
const cors = require("cors");
app.use(cors());

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const refreshTokens = new Set();

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
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "ab12cd",
            },
            username: {
              type: "string",
              example: "ivan",
            },
            age: {
              type: "integer",
              example: 25,
            },
            role: {
              type: "string",
              enum: ["user", "seller", "admin"],
              example: "user",
            },
          },
        },
        Product: {
          type: "object",
          required: ["name", "category", "description", "count", "cost"],
          properties: {
            id: {
              type: "string",
              description:
                "Автоматически сгенерированный уникальный ID продукта",
              example: "abc123",
            },
            name: {
              type: "string",
              description: "Название продукта",
              example: "Бананы",
            },
            category: {
              type: "string",
              description: "Категория продукта",
              example: "Фрукты",
            },
            description: {
              type: "string",
              description: "Описание продукта",
              example: "Бананы египетские",
            },
            count: {
              type: "integer",
              description: "Количество на складе",
              example: 100,
            },
            cost: {
              type: "integer",
              description: "Стоимость продукта",
              example: 160,
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              example: "Error message",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Не авторизован",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ForbiddenError: {
          description: "Доступ запрещен",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        NotFoundError: {
          description: "Ресурс не найден",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
    },
  },
  apis: ["./app.js"],
};

let users = [];

const testUsers = [
  { username: "user", password: "123", age: 25, role: "user" },
  { username: "seller", password: "123", age: 30, role: "seller" },
  { username: "admin", password: "123", age: 35, role: "admin" },
];

testUsers.forEach((testUser) => {
  const hashedPassword = bcrypt.hashSync(testUser.password, 10);
  users.push({
    id: nanoid(),
    username: testUser.username,
    age: testUser.age,
    role: testUser.role,
    hashedPassword,
  });
  
});
console.log("📋 Созданные пользователи:");
users.forEach((u) => {
  console.log(
    `   - ${u.username} (${u.role}): ${u.hashedPassword.substring(0, 20)}...`,
  );
});

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

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    },
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
    },
  );
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, ACCESS_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }
    next();
  };
}

function findUserOr404(id, res) {
  const user = users.find((u) => u.id == id);
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return null;
  }
  return user;
}

function findProductOr404(id, res) {
  const product = products.find((u) => u.id === id);
  if (!product) {
    res.status(404).json({ error: "product not found" });
    return null;
  }
  return product;
}

async function hashPassword(password) {
  const rounds = 10;
  return bcrypt.hash(password, rounds);
}

function removePassword(user) {
  const { hashedPassword, ...userWithoutPassword } = user;
  return userWithoutPassword;
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
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *                 example: "user"
 *                 description: "Роль пользователя (по умолчанию 'user')"
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Некорректные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/api/auth/register", async (req, res) => {
  const { username, age, password, role } = req.body;

  if (!username || !password || age === undefined) {
    return res
      .status(400)
      .json({ error: "username, password and age are required" });
  }

  const newUser = {
    id: nanoid(),
    username: username,
    age: Number(age),
    role: role || "user",
    hashedPassword: await hashPassword(password),
  };

  users.push(newUser);

  res.status(201).json(removePassword(newUser));
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
 *                 refreshToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Отсутствуют обязательные поля
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  res.json({
    accessToken,
    refreshToken,
  });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление access-токена
 *     description: Получает новую пару токенов по refresh-токену
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Отсутствует refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Недействительный refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({
      error: "refreshToken is required",
    });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({
      error: "Invalid refresh token",
    });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired refresh token",
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение текущего пользователя
 *     description: Получает информацию о текущем авторизованном пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Текущий пользователь
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(removePassword(user));
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список пользователей
 *     description: Возвращает список всех пользователей (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
app.get(
  "/api/users",
  authenticateToken,
  roleMiddleware(["admin"]),
  (req, res) => {
    res.json(users.map((user) => removePassword(user)));
  },
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID
 *     description: Возвращает информацию о конкретном пользователе (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *         example: "ab12cd"
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.get(
  "/api/users/:id",
  authenticateToken,
  roleMiddleware(["admin"]),
  (req, res) => {
    const id = req.params.id;
    const user = findUserOr404(id, res);
    if (!user) return;
    res.json(removePassword(user));
  },
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить информацию пользователя
 *     description: Обновляет данные пользователя (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *         example: "ab12cd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "ivan_updated"
 *               age:
 *                 type: integer
 *                 example: 26
 *               role:
 *                 type: string
 *                 enum: [user, seller, admin]
 *                 example: "seller"
 *     responses:
 *       200:
 *         description: Обновленная информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.put(
  "/api/users/:id",
  authenticateToken,
  roleMiddleware(["admin"]),
  (req, res) => {
    const id = req.params.id;
    const user = findUserOr404(id, res);
    if (!user) return;

    const { username, age, role } = req.body;

    if (username) user.username = username;
    if (age !== undefined) user.age = Number(age);
    if (role) user.role = role;

    res.json(removePassword(user));
  },
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать/удалить пользователя
 *     description: Удаляет пользователя из системы (только для администраторов)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя для удаления
 *         example: "ab12cd"
 *     responses:
 *       204:
 *         description: Пользователь успешно удален (нет тела ответа)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.delete(
  "/api/users/:id",
  authenticateToken,
  roleMiddleware(["admin"]),
  (req, res) => {
    const id = req.params.id;
    const exists = users.some((u) => u.id === id);
    if (!exists) return res.status(404).json({ error: "user not found" });
    users = users.filter((u) => u.id !== id);
    res.status(204).send();
  },
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     description: Создает новый товар (только для продавцов)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
 *                 example: "Яблоки"
 *               category:
 *                 type: string
 *                 example: "Фрукты"
 *               description:
 *                 type: string
 *                 example: "Яблоки красные"
 *               count:
 *                 type: integer
 *                 example: 50
 *               cost:
 *                 type: integer
 *                 example: 120
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в теле запроса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
app.post(
  "/api/products",
  authenticateToken,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const { name, category, description, count, cost } = req.body;

    if (
      !name ||
      !category ||
      !description ||
      count === undefined ||
      cost === undefined
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

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
  },
);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список товаров
 *     description: Возвращает список всех товаров (доступно всем авторизованным пользователям)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
app.get("/api/products", authenticateToken, roleMiddleware(["user", "seller", "admin"]), (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     description: Возвращает информацию о конкретном товаре (доступно всем авторизованным пользователям)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *         example: "1"
 *     responses:
 *       200:
 *         description: Информация о товаре
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.get("/api/products/:id", authenticateToken, roleMiddleware(["user", "seller", "admin"]), (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар
 *     description: Полностью обновляет информацию о товаре (только для продавцов)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *         example: "1"
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
 *                 example: "Бананы обновленные"
 *               category:
 *                 type: string
 *                 example: "Фрукты"
 *               description:
 *                 type: string
 *                 example: "Бананы Эквадорские"
 *               count:
 *                 type: integer
 *                 example: 150
 *               cost:
 *                 type: integer
 *                 example: 170
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в теле запроса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.put(
  "/api/products/:id",
  authenticateToken,
  roleMiddleware(["seller"]),
  (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;

    const { name, category, description, count, cost } = req.body;

    if (
      !name ||
      !category ||
      !description ||
      count === undefined ||
      cost === undefined
    ) {
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
  },
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     description: Удаляет товар из системы (только для администраторов)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара для удаления
 *         example: "1"
 *     responses:
 *       204:
 *         description: Товар успешно удален (нет тела ответа)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
app.delete(
  "/api/products/:id",
  authenticateToken,
  roleMiddleware(["admin"]),
  (req, res) => {
    const id = req.params.id;
    const exists = products.some((u) => u.id === id);
    if (!exists) return res.status(404).json({ error: "product not found" });
    products = products.filter((u) => u.id !== id);
    res.status(204).send();
  },
);

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
