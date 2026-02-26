import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api",
});

export const api = {
    getProducts: () => apiClient.get("/products"),
    createProduct: (data) => apiClient.post("/products", data),
    updateProduct: (id, data) => apiClient.patch(`/products/${id}`, data),
    deleteProduct: (id) => apiClient.delete(`/products/${id}`),
};