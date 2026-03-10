import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";

import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import Cast from "./pages/Cast";
import News from "./pages/News";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddMovie from "./pages/AddMovie";
import ProductionProfile from "./pages/ProductionProfile";
import CastProfile from "./pages/CastProfile";
import NewsDetail from "./pages/NewsDetail";

export default function App() {
  const [production, setProduction] = useState(() => {
    try { const s = localStorage.getItem("op_prod"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const handleAuth = (prod) => {
    setProduction(prod);
    try { localStorage.setItem("op_prod", JSON.stringify(prod)); } catch {}
  };

  const handleLogout = () => {
    setProduction(null);
    try { localStorage.removeItem("op_prod"); localStorage.removeItem("op_token"); } catch {}
  };

  return (
    <BrowserRouter>
      <Navbar production={production} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} />

      <Routes>
        <Route path="/"                       element={<Home />} />
        <Route path="/movies"                 element={<Movies />} />
        <Route path="/movie/:id"              element={<MovieDetails production={production} onToast={showToast} />} />

        <Route path="/cast"                   element={<Cast />} />
        <Route path="/news"                   element={<News />} />
        <Route path="/register"               element={<Register onSuccess={handleAuth} onToast={showToast} />} />
        <Route path="/dashboard"              element={<Dashboard production={production} onToast={showToast} />} />
        <Route path="/dashboard/add-movie"    element={<AddMovie production={production} onToast={showToast} />} />
        <Route path="/production/:id"         element={<ProductionProfile production={production} />} />
        <Route path="/cast/:id"               element={<CastProfile />} />
        <Route path="/news/:id"               element={<NewsDetail />} />
      </Routes>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(prod) => { handleAuth(prod); setShowLogin(false); showToast(`Welcome back, ${prod.name}!`); }}
        />
      )}

    
    </BrowserRouter>
  );
}