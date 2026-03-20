import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function RegistrationPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        age: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            navigate("/products");
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:3000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: formData.username,
                    age: parseInt(formData.age),
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                navigate("/login", {
                    state: {
                        successMessage: "Регистрация успешна! Теперь войдите в систему",
                    },
                });
            } else {
                setServerError(data.error || "Ошибка при регистрации");
            }
        } catch {
            setServerError("Ошибка соединения с сервером");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <h2>Регистрация</h2>
                    <p>Создайте новый аккаунт</p>
                </div>

                {serverError && (
                    <div className="message message--error">{serverError}</div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Имя пользователя</label>
                        <input
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Введите имя"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Возраст</label>
                        <input
                            name="age"
                            type="number"
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="Введите возраст"
                            min="1"
                            max="120"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Пароль</label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Введите пароль"
                            required
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? "Регистрация..." : "Зарегистрироваться"}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Уже есть аккаунт? <Link to="/login">Войти</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}