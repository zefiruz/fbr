import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import { auth } from "./api";

const ProtectedRoute = ({ children }) => {
  const [isValid, setIsValid] = useState(null);
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValid(false);
        return;
      }

      try {
        await auth.getCurrentUser();
        setIsValid(true);
      } catch (error) {
        console.error("Token validation failed:", error);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setIsValid(false);
      }
    };

    validateToken();
  }, [token]);

  if (isValid === null) {
    return <div>Проверка авторизации...</div>;
  }

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [isValid, setIsValid] = useState(null);
  const [hasRequiredRole, setHasRequiredRole] = useState(null);
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const validateAccess = async () => {
      if (!token) {
        setIsValid(false);
        return;
      }

      try {
        await auth.getCurrentUser();
        const userRole = auth.getUserRole();

        setIsValid(true);

        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          setHasRequiredRole(false);
        } else {
          setHasRequiredRole(true);
        }
      } catch (error) {
        console.error("Access validation failed:", error);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setIsValid(false);
      }
    };

    validateAccess();
  }, [token, allowedRoles]);

  if (isValid === null || hasRequiredRole === null) {
    return <div>Проверка доступа...</div>;
  }

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  // Если нет нужной роли - перенаправляем на главную (продукты)
  if (!hasRequiredRole) {
    return <Navigate to="/products" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    return <Navigate to="/products" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegistrationPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <RoleProtectedRoute allowedRoles={["admin"]}>
              <UsersPage />
            </RoleProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;