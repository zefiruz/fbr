import React, { useState, useEffect } from "react";
import { api } from "../api";
import ProductItem from "../components/ProductItem";
import ProductModal from "../components/ProductModal";
import "./ProductsPage.scss";

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null); // Для редактирования

    const fetchProducts = async () => {
        const res = await api.getProducts();
        setProducts(res.data);
    };

    useEffect(() => { fetchProducts(); }, []);

    const handleAddClick = () => {
        setCurrentProduct(null); // Сбрасываем данные
        setIsModalOpen(true);
    };

    const handleEditClick = (product) => {
        setCurrentProduct(product); // Устанавливаем товар для правки
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (data) => {
        if (currentProduct) {
            await api.updateProduct(currentProduct.id, data);
        } else {
            await api.createProduct(data);
        }
        setIsModalOpen(false);
        fetchProducts();
    };

    const handleDelete = async (id) => {
        if (window.confirm("Удалить этот товар?")) {
            await api.deleteProduct(id);
            fetchProducts();
        }
    };

    return (
        <div className="products-container">
            <header className="page-header">
                <h1>Магазин электроники</h1>
                <button className="add-main-btn" onClick={handleAddClick}>+ Добавить товар</button>
            </header>

            <div className="products-grid">
                {products.map(item => (
                    <ProductItem 
                        key={item.id} 
                        product={item} 
                        onDelete={handleDelete} 
                        onEdit={handleEditClick} 
                    />
                ))}
            </div>

            <ProductModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSubmit={handleFormSubmit}
                initialData={currentProduct}
            />
        </div>
    );
};

export default ProductsPage;