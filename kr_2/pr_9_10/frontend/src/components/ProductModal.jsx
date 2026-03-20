import React, { useEffect, useState } from "react";
import './ProductModal.css'

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
    const [name, setName] = useState("");
    const [cost, setCost] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [count, setCount] = useState("");
    useEffect(() => {
        if (!open) return;
        setName(initialProduct?.name ?? "");
        setCost(initialProduct?.cost != null ? String(initialProduct.cost) : "");
        setDescription(initialProduct?.description ?? "");
        setCategory(initialProduct?.category ?? "");
        setCount(initialProduct?.count != null ? String(initialProduct.count) : "");

    }, [open, initialProduct]);
    if (!open) return null;
    const title =
        mode === "edit" ? "Редактирование продукта" : "Создание продукта";
    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const parsedCost = Number(cost);
        const trimmedDescription = description.trim();
        const trimmedCategory = category.trim();
        const parsedCount = Number(count);
        if (!trimmedName) {
            alert("Введите название");
            return;
        }
        if (!Number.isFinite(parsedCost) || parsedCost < 0) {
            alert("Введите цену");
            return;
        }
        if (!trimmedDescription) {
            alert("Введите описание");
        }
        if (!trimmedCategory) {
            alert("Введите категорию");
        }
        if (!Number.isFinite(parsedCount) || parsedCount < 0) {
            alert("Введите количество")
        }
        onSubmit({
            id: initialProduct?.id,
            name: trimmedName,
            cost: parsedCost,
            description: trimmedDescription,
            category: trimmedCategory,
            count: parsedCount
        });
    };
    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div
                className="modal"
                onMouseDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal__header">
                    <div className="modal__title">{title}</div>
                    <button className="iconBtn" onClick={onClose} arialabel="Закрыть">
                        ✕
                    </button>
                </div>
                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Название
                        <input
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например, бананы"
                            autoFocus
                        />
                    </label>
                    <label className="label">
                        Цена
                        <input
                            className="input"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="Например, 200"
                            inputMode="numeric"
                        />
                    </label>
                    <label className="label">
                        Описание
                        <input
                            className="input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Например, бананы отечественные"
                        />
                    </label>
                    <label className="label">
                        Категория
                        <input
                            className="input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Например, фрукты"
                        />
                    </label>
                    <label className="label">
                        Кол-во на складе
                        <input
                            className="input"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            placeholder="Например, 100"
                        />
                    </label>
                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {mode === "edit" ? "Сохранить" : "Создать"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}