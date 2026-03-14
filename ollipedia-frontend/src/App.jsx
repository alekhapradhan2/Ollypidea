import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { setToken } from "./api/api";

import Navbar     from "./components/Navbar";
import { Toast }  from "./components/UI";

// Public pages
import Home             from "./pages/Home";
import Movies           from "./pages/Movies";
import MovieDetails     from "./pages/MovieDetails";
import Cast             from "./pages/Cast";
import CastProfile      from "./pages/CastProfile";
import News             from "./pages/News";
import NewsDetail       from "./pages/NewsDetail";
import ProductionProfile from "./pages/ProductionProfile";
import SongDetail        from "./pages/SongDetail";
import AllSongs          from "./pages/AllSongs";

// Admin portal
import AdminLogin   from "./pages/AdminLogin";
import AdminPortal  from "./pages/AdminPortal";

function AppInner({ admin, setAdmin }) {
  const location  = useLocation();
  const [toast,   setToast]   = useState(null);

  const isAdminPortal = location.pathname.startsWith("/admin");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleAdminAuth = (adminObj, token) => {
    setAdmin(adminObj);
    setToken(token);
    try { localStorage.setItem("op_admin", JSON.stringify(adminObj)); } catch {}
  };

  const handleAdminLogout = () => {
    setAdmin(null);
    setToken(null);
    try { localStorage.removeItem("op_admin"); localStorage.removeItem("op_admin_token"); } catch {}
  };

  return (
    <>
      {!isAdminPortal && (
        <Navbar admin={admin} onAdminLogout={handleAdminLogout} />
      )}

      <Routes>
        {/* ── Public ── */}
        <Route path="/"               element={<Home />} />
        <Route path="/movies"         element={<Movies />} />
        <Route path="/movie/:id"      element={<MovieDetails onToast={showToast} />} />
        <Route path="/cast"           element={<Cast />} />
        <Route path="/cast/:id"       element={<CastProfile />} />
        <Route path="/news"           element={<News />} />
        <Route path="/news/:id"       element={<NewsDetail />} />
        <Route path="/production/:id" element={<ProductionProfile />} />
        <Route path="/song/:movieId/:songIndex" element={<SongDetail />} />
        <Route path="/songs"                   element={<AllSongs />} />
        <Route path="/song/:movieId" element={<SongDetail />} />

        {/* ── Admin ── */}
        <Route path="/admin/login" element={
          <AdminLogin onSuccess={handleAdminAuth} onToast={showToast} />
        } />
        <Route path="/admin/*" element={
          <AdminPortal
            admin={admin}
            onLogout={handleAdminLogout}
            onToast={showToast}
          />
        } />
      </Routes>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(() => {
    try { const s = localStorage.getItem("op_admin"); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  return (
    <BrowserRouter>
      <AppInner admin={admin} setAdmin={setAdmin} />
    </BrowserRouter>
  );
}