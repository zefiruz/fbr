import React from "react";
export default function ProductItem({ product, onEdit, onDelete }) {
    return (
        <div className="productRow">
            <div className="productMain">
                <div className="productId">#{product.id}</div>
                <div className="productName">{product.name}</div>
                <div className="productCost">{product.cost} руб</div>
                <div className="productCategory">Категория: {product.category}</div>
                <div className="productDescription">Описание: {product.description}</div>
                <div className="productCount">Кол-во на складе: {product.count}</div>
            </div>
            <div className="productActions">
                <button className="btn" onClick={() => onEdit(product)}>
                    Редактировать
                </button>
                <button
                    className="btn btn--danger"
                    onClick={() => onDelete(product.id)}
                >
                    Удалить
                </button>
            </div>
        </div>
    );
}