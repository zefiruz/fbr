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

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refreshToken");
                if (!refreshToken) {
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
        return Promise.reject(error);
    },
);

export const api = {
    createProduct: async (product) => {
        let response = await apiClient.post("/products", product);
        return response.data;
    },
    getProducts: async () => {
        let response = await apiClient.get("/products");
        return response.data;
    },
    getProductById: async (id) => {
        let response = await apiClient.get(`/products/${id}`);
        return response.data;
    },
    updateProduct: async (id, data) => {
        const response = await axios.put(`/api/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id) => {
        let response = await apiClient.delete(`/products/${id}`);
        return response.data;
    },
};