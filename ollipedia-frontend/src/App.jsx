import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { setToken } from "./api/api";
import { extractId } from "./utils/slugs";

import Navbar     from "./components/Navbar";
import { Toast }  from "./components/UI";

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
import AdminLogin   from "./pages/AdminLogin";
import AdminPortal  from "./pages/AdminPortal";

/**
 * Redirect legacy bare-id URLs to slug URLs.
 * e.g. /movie/686abc123ef456def789012 → /movie/daman-2024-686abc123ef456def789012
 * We do this by checking: if the param looks like ONLY a 24-char hex id (no hyphens),
 * redirect to the same path (the page component will handle building the slug URL
 * on first load via replaceState — simpler than fetching here).
 *
 * Actually the cleanest approach: just let the page components use extractId()
 * to get the real id from whatever slug format arrives. No redirect needed.
 */

function AppInner({ admin, setAdmin }) {
  const location = useLocation();
  const [toast, setToast] = useState(null);
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
      {!isAdminPortal && <Navbar admin={admin} onAdminLogout={handleAdminLogout} />}

      <Routes>
        {/* ── Public ── */}
        <Route path="/"        element={<Home />} />
        <Route path="/movies"  element={<Movies />} />
        <Route path="/cast"    element={<Cast />} />
        <Route path="/news"    element={<News />} />
        <Route path="/songs"   element={<AllSongs />} />

        {/* Slug routes — param contains "title-year-id" or bare "id" */}
        <Route path="/movie/:slug"                  element={<MovieDetails onToast={showToast} />} />
        <Route path="/cast/:slug"                   element={<CastProfile />} />
        <Route path="/news/:slug"                   element={<NewsDetail />} />
        <Route path="/song/:movieSlug/:songIndex"   element={<SongDetail />} />
        <Route path="/song/:movieSlug"              element={<SongDetail />} />
        <Route path="/production/:id"               element={<ProductionProfile />} />

        {/* ── Admin ── */}
        <Route path="/admin/login" element={<AdminLogin onSuccess={handleAdminAuth} onToast={showToast} />} />
        <Route path="/admin/*"     element={<AdminPortal admin={admin} onLogout={handleAdminLogout} onToast={showToast} />} />
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