// pages/UsersPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Добавлен Link
import { api, auth } from "../api";
import "./UsersPage.css";

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [userRole, setUserRole] = useState(null); // Добавлено состояние для роли

  useEffect(() => {
    // Получаем роль текущего пользователя
    const role = auth.getUserRole();
    setUserRole(role);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const role = auth.getUserRole();
    if (role !== "admin") {
      navigate("/products", { replace: true }); // Перенаправляем на продукты, если не админ
      return;
    }

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getUsers();
        setUsers(data);
      } catch (err) {
        console.error("Error loading users:", err);
        if (err.response?.status === 401) {
          auth.logout();
          navigate("/login", { replace: true });
        } else if (err.response?.status === 403) {
          navigate("/products", { replace: true });
        } else {
          setError("Ошибка при загрузке пользователей");
        }
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [navigate]);

  const handleLogout = () => {
    auth.logout();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      return;
    }

    try {
      await api.deleteUser(userId);
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Error deleting user:", err);
      if (err.response?.status === 401) {
        auth.logout();
        navigate("/login", { replace: true });
      } else if (err.response?.status === 403) {
        alert("У вас недостаточно прав для удаления пользователей");
      } else {
        alert("Ошибка при удалении пользователя");
      }
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const updatedUser = await api.updateUser(userId, userData);
      setUsers(users.map((user) => (user.id === userId ? updatedUser : user)));
      setModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      if (err.response?.status === 401) {
        auth.logout();
        navigate("/login", { replace: true });
      } else if (err.response?.status === 403) {
        alert("У вас недостаточно прав для редактирования пользователей");
      } else {
        alert("Ошибка при обновлении пользователя");
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const getRoleClass = (role) => {
    switch (role) {
      case "admin":
        return "role-badge-table--admin";
      case "seller":
        return "role-badge-table--seller";
      default:
        return "role-badge-table--user";
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case "admin":
        return "Администратор";
      case "seller":
        return "Продавец";
      default:
        return "Пользователь";
    }
  };

  const getRoleDisplay = (role) => {
    const roles = {
      admin: "Администратор",
      seller: "Продавец",
      user: "Пользователь",
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty">Загрузка пользователей...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty">Ошибка: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Products App</div>
          <div className="header__nav">
            <Link to="/products" className="btn btn--nav">
              Продукты
            </Link>
            {userRole === "admin" && (
              <Link to="/users" className="btn btn--nav">
                Пользователи
              </Link>
            )}
          </div>
          <div className="header__right">
            {userRole && (
              <span className="role-badge">{getRoleDisplay(userRole)}</span>
            )}
            <button className="btn" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Пользователи</h1>
          </div>

          {users.length === 0 ? (
            <div className="empty">Нет пользователей</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>Возраст</th>
                  <th>Роль</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="user-id">{user.id}</span>
                    </td>
                    <td>{user.username}</td>
                    <td>{user.age}</td>
                    <td>
                      <span
                        className={`role-badge-table ${getRoleClass(user.role)}`}
                      >
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn--edit"
                          onClick={() => handleEdit(user)}
                        >
                          Редактировать
                        </button>
                        <button
                          className="btn btn--danger"
                          onClick={() => handleDelete(user.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} Users App
        </div>
      </footer>

      {modalOpen && editingUser && (
        <div className="backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <span className="modal__title">Редактировать пользователя</span>
              <button className="iconBtn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleUpdateUser(editingUser.id, {
                  username: formData.get("username"),
                  age: parseInt(formData.get("age")),
                  role: formData.get("role"),
                });
              }}
            >
              <label className="label">
                Имя пользователя:
                <input
                  type="text"
                  name="username"
                  defaultValue={editingUser.username}
                  required
                  className="input"
                />
              </label>

              <label className="label">
                Возраст:
                <input
                  type="number"
                  name="age"
                  defaultValue={editingUser.age}
                  required
                  className="input"
                />
              </label>

              <label className="label">
                Роль:
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  className="select"
                >
                  <option value="user">Пользователь</option>
                  <option value="seller">Продавец</option>
                  <option value="admin">Администратор</option>
                </select>
              </label>

              <div className="modal__footer">
                <button type="button" className="btn" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn--primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
