// pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../api";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await auth.login({ username, password });
      navigate("/products");
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  // Быстрый вход под разными ролями
  const quickLogin = async (role) => {
    setLoading(true);
    setError("");

    try {
      await auth.login({ username: role, password: "123" });
      navigate("/products");
    } catch {
      setError(`Ошибка входа как ${role}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h2>Добро пожаловать</h2>
          <p>Войдите в свой аккаунт</p>
        </div>

        {error && <div className="message message--error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Логин</label>
            <input
              type="text"
              placeholder="Введите логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="quick-login">
          <p className="quick-login__title">Быстрый вход</p>
          <div className="quick-login__buttons">
            <button
              onClick={() => quickLogin("user")}
              className="quick-login__btn quick-login__btn--user"
              disabled={loading}
            >
              User
            </button>
            <button
              onClick={() => quickLogin("seller")}
              className="quick-login__btn quick-login__btn--seller"
              disabled={loading}
            >
              Seller
            </button>
            <button
              onClick={() => quickLogin("admin")}
              className="quick-login__btn quick-login__btn--admin"
              disabled={loading}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
