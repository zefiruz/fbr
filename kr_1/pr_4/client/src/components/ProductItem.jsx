import React from 'react';
import './ProductItem.scss'

const ProductItem = ({ product, onDelete, onEdit }) => {
    return (
        <div className="product-card">
            <h3>{product.name}</h3>
            <p><strong>Категория:</strong> {product.category}</p>
            <p>{product.description}</p>
            <p className="price">{product.price} ₽</p>
            <p>На складе: {product.quantity} шт.</p>
            <div className="card-actions">
                <button className="edit-btn" onClick={() => onEdit(product)}>Редактировать</button>
                <button className="delete-btn" onClick={() => onDelete(product.id)}>Удалить</button>
            </div>
        </div>
    );
};

export default ProductItem;