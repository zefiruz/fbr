import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        const response = await axios.post(
          "http://localhost:3000/api/auth/refresh",
          {
            refreshToken: refreshToken,
          },
        );

        if (response.data.accessToken) {
          localStorage.setItem("accessToken", response.data.accessToken);
          localStorage.setItem("refreshToken", response.data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      console.error("Access forbidden: insufficient permissions");
    }

    return Promise.reject(error);
  },
);

// Методы для аутентификации
export const auth = {
  register: async (userData) => {
    const response = await axios.post(
      "http://localhost:3000/api/auth/register",
      userData,
    );
    return response.data;
  },

  login: async (credentials) => {
    const response = await axios.post(
      "http://localhost:3000/api/auth/login",
      credentials,
    );
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  },

  getCurrentUser: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("accessToken");
  },

  getUserRole: () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(base64));
      return payload.role;
    } catch (e) {
      console.error("Error decoding token", e);
      return null;
    }
  },
};

// Методы для работы с продуктами
export const products = {
  getProducts: async () => {
    const response = await apiClient.get("/products");
    return response.data;
  },

  getProductById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (product) => {
    const role = auth.getUserRole();
    if (role !== "seller" && role !== "admin") {
      throw new Error("Недостаточно прав для создания товара");
    }
    const response = await apiClient.post("/products", product);
    return response.data;
  },

  updateProduct: async (id, product) => {
    const role = auth.getUserRole();
    if (role !== "seller" && role !== "admin") {
      throw new Error("Недостаточно прав для редактирования товара");
    }
    const response = await apiClient.put(`/products/${id}`, product);
    return response.data;
  },

  deleteProduct: async (id) => {
    const role = auth.getUserRole();
    if (role !== "admin") {
      throw new Error("Недостаточно прав для удаления товара");
    }
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
};

// Методы для работы с пользователями
export const users = {
  getUsers: async () => {
    const response = await apiClient.get("/users");
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};

// Объединяем все методы в один объект api
export const api = {
  // Продукты
  getProducts: products.getProducts,
  getProductById: products.getProductById,
  createProduct: products.createProduct,
  updateProduct: products.updateProduct,
  deleteProduct: products.deleteProduct,

  // Аутентификация
  register: auth.register,
  login: auth.login,
  logout: auth.logout,
  getCurrentUser: auth.getCurrentUser,
  isAuthenticated: auth.isAuthenticated,
  getUserRole: auth.getUserRole,

  // Пользователи
  getUsers: users.getUsers,
  getUserById: users.getUserById,
  updateUser: users.updateUser,
  deleteUser: users.deleteUser,
};

// Для удобства можно также экспортировать всё по отдельности
export default api;
