import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductsList from "../components/ProductsList";
import ProductModal from "../components/ProductModal";
import { api, auth } from "../api";
import "./ProductsPage.css";
import "./LoginPage.css";
import { Link } from "react-router-dom";


export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);
  const [userRole, setUserRole] = useState(null);



  // Получаем роль пользователя
  useEffect(() => {
    const role = auth.getUserRole();
    setUserRole(role);
  }, []);

  // Проверки прав доступа
  const canCreate = userRole === "seller" || userRole === "admin";
  const canEdit = userRole === "seller" || userRole === "admin";
  const canDelete = userRole === "admin";

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        setProducts(data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          auth.logout();
          navigate("/login", { replace: true });
        } else if (err.response?.status === 403) {
          console.error("Недостаточно прав для просмотра товаров");
          navigate("/unauthorized", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [navigate]);

  const handleLogout = () => {
    auth.logout();
  };

  const openCreate = () => {
    if (!canCreate) {
      alert("У вас нет прав для создания товаров");
      return;
    }
    setModalMode("create");
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    if (!canEdit) {
      alert("У вас нет прав для редактирования товаров");
      return;
    }
    setModalMode("edit");
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      alert("У вас нет прав для удаления товаров");
      return;
    }

    if (!window.confirm("Удалить продукт?")) return;

    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        auth.logout();
        navigate("/login", { replace: true });
      } else if (err.response?.status === 403) {
        alert("У вас недостаточно прав для удаления товаров");
      } else {
        alert("Ошибка при удалении товара");
      }
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        if (!canCreate) {
          alert("У вас нет прав для создания товаров");
          return;
        }
        const newProduct = await api.createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
      } else {
        if (!canEdit) {
          alert("У вас нет прав для редактирования товаров");
          return;
        }
        const updatedProduct = await api.updateProduct(payload.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.id ? updatedProduct : p)),
        );
      }
      closeModal();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        auth.logout();
        navigate("/login", { replace: true });
      } else if (err.response?.status === 403) {
        alert(
          `У вас недостаточно прав для ${modalMode === "create" ? "создания" : "редактирования"} товаров`,
        );
      } else {
        alert(
          `Ошибка при ${modalMode === "create" ? "создании" : "редактировании"} товара`,
        );
      }
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

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Products App</div>
          <div className="header__nav">
            {/* Кнопка перехода на пользователей - только для админов */}
            {userRole === "admin" && (
              <Link to="/users" className="btn btn--nav">
                Пользователи
              </Link>
            )}
            {/* Кнопка перехода на продукты (текущая страница) */}
            <Link to="/products" className="btn btn--nav">
              Продукты
            </Link>
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
            <h1 className="title">Продукты</h1>
            {canCreate && (
              <button className="btn btn--primary" onClick={openCreate}>
                + Создать
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : (
            <ProductsList
              products={products}
              onEdit={openEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} products App
        </div>
      </footer>

      {(canCreate || canEdit) && (
        <ProductModal
          open={modalOpen}
          mode={modalMode}
          initialProduct={editingProduct}
          onClose={closeModal}
          onSubmit={handleSubmitModal}
        />
      )}
    </div>
  );
}
