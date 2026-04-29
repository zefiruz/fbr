const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const USERS_CACHE_TTL = 60;
const PRODUCTS_CACHE_TTL = 600;

const refreshTokens = new Set();

const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

async function initRedis() {
  await redisClient.connect();
  console.log("Redis connected");
}

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
    blocked: false,
    hashedPassword,
  });
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
    { sub: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN },
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN },
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

const authMiddleware = authenticateToken;

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function cacheMiddleware(keyBuilder, ttl) {
  return async (req, res, next) => {
    try {
      const key = keyBuilder(req);
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return res.json({
          source: "cache",
          data: JSON.parse(cachedData),
        });
      }
      req.cacheKey = key;
      req.cacheTTL = ttl;
      next();
    } catch (err) {
      console.error("Cache read error:", err);
      next();
    }
  };
}

async function saveToCache(key, data, ttl) {
  try {
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
  } catch (err) {
    console.error("Cache save error:", err);
  }
}

async function invalidateUsersCache(userId = null) {
  try {
    await redisClient.del("users:all");
    if (userId) {
      await redisClient.del(`users:${userId}`);
    }
  } catch (err) {
    console.error("Users cache invalidate error:", err);
  }
}

async function invalidateProductsCache(productId = null) {
  try {
    await redisClient.del("products:all");
    if (productId) {
      await redisClient.del(`products:${productId}`);
    }
  } catch (err) {
    console.error("Products cache invalidate error:", err);
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function removePassword(user) {
  const { hashedPassword, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`,
    );
  });
  next();
});

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
    blocked: false,
    hashedPassword: await hashPassword(password),
  };

  users.push(newUser);
  res.status(201).json(removePassword(newUser));
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (user.blocked) {
    return res.status(401).json({ error: "User is blocked" });
  }
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  res.json({ accessToken, refreshToken });
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user || user.blocked) {
      return res.status(401).json({ error: "User not found or blocked" });
    }

    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(removePassword(user));
});

// 21

app.get("/api/users", authMiddleware, 
  roleMiddleware(["admin"]), 
  cacheMiddleware(() => "users:all", USERS_CACHE_TTL),
  async (req, res) => {
    const data = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      blocked: u.blocked,
    }));
    await saveToCache(req.cacheKey, data, req.cacheTTL);
    res.json({ source: "server", data });
  },
);

app.get(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL),
  async (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const data = {
      id: user.id,
      username: user.username,
      role: user.role,
      blocked: user.blocked,
    };
    await saveToCache(req.cacheKey, data, req.cacheTTL);
    res.json({ source: "server", data });
  },
);

app.put(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    const { username, role, blocked } = req.body;
    const user = users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (username !== undefined) user.username = username;
    if (role !== undefined) user.role = role;
    if (blocked !== undefined) user.blocked = blocked;
    await invalidateUsersCache(user.id);
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      blocked: user.blocked,
    });
  },
);

app.delete(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.blocked = true;
    await invalidateUsersCache(user.id);
    res.json({ message: "User blocked", id: user.id });
  },
);

app.post(
  "/api/products",
  authenticateToken,
  roleMiddleware(["seller", "admin"]),
  async (req, res) => {
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

    const newProduct = {
      id: nanoid(6),
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      count: Number(count),
      cost: Number(cost),
    };
    products.push(newProduct);
    await invalidateProductsCache();
    res.status(201).json(newProduct);
  },
);

app.get(
  "/api/products",
  authenticateToken,
  cacheMiddleware(() => "products:all", PRODUCTS_CACHE_TTL),
  async (req, res) => {
    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      count: p.count,
      cost: p.cost,
    }));
    await saveToCache(req.cacheKey, data, req.cacheTTL);
    res.json({ source: "server", data });
  },
);

app.get(
  "/api/products/:id",
  authenticateToken,
  cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL),
  async (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const data = {
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      count: product.count,
      cost: product.cost,
    };
    await saveToCache(req.cacheKey, data, req.cacheTTL);
    res.json({ source: "server", data });
  },
);

app.put(
  "/api/products/:id",
  authenticateToken,
  roleMiddleware(["seller", "admin"]),
  async (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { name, category, description, count, cost } = req.body;

    if (
      !name ||
      !category ||
      !description ||
      count === undefined ||
      cost === undefined
    ) {
      return res
        .status(400)
        .json({ error: "All fields are required for PUT operation" });
    }

    product.name = name.trim();
    product.category = category.trim();
    product.description = description.trim();
    product.count = Number(count);
    product.cost = Number(cost);

    await invalidateProductsCache(product.id);
    res.json(product);
  },
);

app.delete(
  "/api/products/:id",
  authenticateToken,
  roleMiddleware(["admin"]),
  async (req, res) => {
    const productIndex = products.findIndex((p) => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }
    products.splice(productIndex, 1);
    await invalidateProductsCache(req.params.id);
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

initRedis().then(() => {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
});