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
          src="https://i.pinimg.com/736x/57/a0/4e/57a04edb5b42d9abde5c59ab661e8cb5.jpg"
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
