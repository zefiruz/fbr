import React, { useState, useEffect } from 'react';
import './ProductModal.scss';

const ProductModal = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({
        name: '', category: '', description: '', price: '', quantity: ''
    });

    // Когда открываем модалку, заполняем форму данными (если они есть)
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({ name: '', category: '', description: '', price: '', quantity: '' });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{initialData ? "Редактировать товар" : "Добавить товар"}</h2>
                <form onSubmit={handleSubmit}>
                    <input 
                        placeholder="Название" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        required 
                    />
                    <input 
                        placeholder="Категория" 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        required 
                    />
                    <textarea 
                        placeholder="Описание" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                    <div className="form-row">
                        <input 
                            type="number" placeholder="Цена" 
                            value={formData.price} 
                            onChange={e => setFormData({...formData, price: e.target.value})} 
                            required 
                        />
                        <input 
                            type="number" placeholder="Кол-во" 
                            value={formData.quantity} 
                            onChange={e => setFormData({...formData, quantity: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="save-btn">Сохранить</button>
                        <button type="button" className="cancel-btn" onClick={onClose}>Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;