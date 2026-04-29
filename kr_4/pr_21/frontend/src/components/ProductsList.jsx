import React from "react";
import ProductItem from "./ProductItem";

export default function ProductsList({
  products,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}) {
  if (!products || products.length === 0) {
    return <div className="empty">Нет продуктов</div>;
  }

  return (
    <div className="list">
      {products.map((product) => (
        <ProductItem
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
