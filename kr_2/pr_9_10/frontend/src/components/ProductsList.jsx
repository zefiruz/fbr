import React from "react";
import ProductItem from "./ProductItem";
export default function ProductsList({ products, onEdit, onDelete }) {
    if (!products.length) {
        return <div className="empty">Продуктов пока нет</div>;
    }
    return (
        <div className="list">
            {products.map((u) => (
                <ProductItem key={u.id} product={u} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </div>
    );
}