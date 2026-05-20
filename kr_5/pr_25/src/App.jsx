import { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

import Home from './pages/Home';

// Динамический импорт
const About = lazy(() => import('./pages/About'));

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <Link to="/">Главная</Link>
        <Link to="/about">О нас (Lazy Load)</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />

        {/* Suspense показывает fallback, пока загружается чанк страницы About */}
        <Route
          path="/about"
          element={
            <Suspense fallback={<div>Загрузка страницы...</div>}>
              <About />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}

export default App;