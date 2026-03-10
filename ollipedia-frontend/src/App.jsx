import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import { Toast } from "./components/UI";

import Home            from "./pages/Home";
import Movies          from "./pages/Movies";
import MovieDetails    from "./pages/MovieDetails";
import Cast            from "./pages/Cast";
import CastProfile     from "./pages/CastProfile";
import News            from "./pages/News";
import NewsDetail      from "./pages/NewsDetail";
import Register        from "./pages/Register";
import Dashboard       from "./pages/Dashboard";
import AddMovie        from "./pages/AddMovie";
import ProductionProfile from "./pages/ProductionProfile";

function AppInner({ production, setProduction }) {
  const location   = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [toast,     setToast]     = useState(null);

  // Portal = /dashboard routes — full private layout, no public navbar
  const isPortal = location.pathname.startsWith("/dashboard");

  const handleAuth = (prod) => {
    setProduction(prod);
    try { localStorage.setItem("op_prod", JSON.stringify(prod)); } catch {}
  };

  const handleLogout = () => {
    setProduction(null);
    try { localStorage.removeItem("op_prod"); localStorage.removeItem("op_token"); } catch {}
  };

  const handleToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <>
      {/* Navbar only on public pages */}
      {!isPortal && (
        <Navbar
          production={production}
          onLoginClick={() => setShowLogin(true)}
          onLogout={handleLogout}
        />
      )}

      <Routes>
        {/* ── Public routes ── */}
        <Route path="/"               element={<Home production={production} />} />
        <Route path="/movies"         element={<Movies />} />
        <Route path="/movie/:id"      element={<MovieDetails production={production} onToast={handleToast} />} />
        <Route path="/cast"           element={<Cast />} />
        <Route path="/cast/:id"       element={<CastProfile />} />
        <Route path="/news"           element={<News />} />
        <Route path="/news/:id"       element={<NewsDetail />} />
        <Route path="/production/:id" element={<ProductionProfile production={production} />} />
        <Route path="/register"       element={<Register onSuccess={handleAuth} onToast={handleToast} />} />

        {/* ── Portal routes — private, no public navbar ── */}
        <Route path="/dashboard" element={
          <Dashboard
            production={production}
            onToast={handleToast}
            onLogout={handleLogout}
            onProductionUpdate={p => {
              setProduction(p);
              try { localStorage.setItem("op_prod", JSON.stringify(p)); } catch {}
            }}
          />
        } />
        <Route path="/dashboard/add-movie" element={
          <AddMovie production={production} onToast={handleToast} />
        } />
      </Routes>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(prod) => {
            handleAuth(prod);
            setShowLogin(false);
            handleToast(`Welcome back, ${prod.name}!`);
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default function App() {
  const [production, setProduction] = useState(() => {
    try { const s = localStorage.getItem("op_prod"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  return (
    <BrowserRouter>
      <AppInner production={production} setProduction={setProduction} />
    </BrowserRouter>
  );
}