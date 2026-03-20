import React from "react";

export default function ProductItem({
  product,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}) {
  return (
    <div className="productRow">
      <div className="productImage">
        <img
          src="https://i.pinimg.com/736x/07/cf/7b/07cf7b0d4a675cdcbca6b6f11a25f5f0.jpg"
          alt={product.name}
        />
      </div>
      <div className="productInfo">
        <div className="productId">#{product.id}</div>
        <div className="productName">{product.name}</div>
        <div className="productCost">{product.cost} руб</div>
        <div className="productCategory">Категория: {product.category}</div>
        <div className="productDescription">
          Описание: {product.description}
        </div>
        <div className="productCount">Кол-во на складе: {product.count}</div>
      </div>
      <div className="productActions">
        {canEdit && (
          <button className="btn" onClick={() => onEdit(product)}>
            Редактировать
          </button>
        )}
        {canDelete && (
          <button
            className="btn btn--danger"
            onClick={() => onDelete(product.id)}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}
