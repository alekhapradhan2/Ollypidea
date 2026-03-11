import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { setToken, setCastToken } from "./api/api";

import Navbar        from "./components/Navbar";
import LoginModal    from "./components/LoginModal";
import { Toast }     from "./components/UI";

import Home              from "./pages/Home";
import Movies            from "./pages/Movies";
import MovieDetails      from "./pages/MovieDetails";
import Cast              from "./pages/Cast";
import CastProfile       from "./pages/CastProfile";
import News              from "./pages/News";
import NewsDetail        from "./pages/NewsDetail";
import Register          from "./pages/Register";
import ProductionProfile from "./pages/ProductionProfile";

// Production portal pages
import Dashboard  from "./pages/Dashboard";
import AddMovie   from "./pages/AddMovie";

// Cast member portal
import CastRegister from "./pages/CastRegister";
import CastPortal   from "./pages/CastPortal";

// Portal-wrapped pages (open inside portal layout)
import PortalMovieDetails from "./pages/PortalMovieDetails";
import PortalCastProfile  from "./pages/PortalCastProfile";

function AppInner({ production, setProduction, castMember, setCastMember }) {
  const location   = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [toast,     setToast]     = useState(null);

  const isProdPortal = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/portal");
  const isCastPortal = location.pathname.startsWith("/cast-portal");
  const isAnyPortal  = isProdPortal || isCastPortal;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleProdAuth = (prod, token) => {
    setProduction(prod);
    setToken(token);
    try { localStorage.setItem("op_prod", JSON.stringify(prod)); } catch {}
  };
  const handleProdLogout = () => {
    setProduction(null);
    setToken(null);
    try { localStorage.removeItem("op_prod"); } catch {}
  };

  const handleCastAuth = (member, token) => {
    setCastMember(member);
    setCastToken(token);
    try { localStorage.setItem("cm_member", JSON.stringify(member)); } catch {}
  };
  const handleCastLogout = () => {
    setCastMember(null);
    setCastToken(null);
    try { localStorage.removeItem("cm_member"); localStorage.removeItem("cm_token"); } catch {}
  };

  const updateProduction = (p) => {
    setProduction(p);
    try { localStorage.setItem("op_prod", JSON.stringify(p)); } catch {}
  };
  const updateCastMember = (m) => {
    setCastMember(m);
    try { localStorage.setItem("cm_member", JSON.stringify(m)); } catch {}
  };

  return (
    <>
      {/* Public navbar — hidden inside portals */}
      {!isAnyPortal && (
        <Navbar
          production={production}
          castMember={castMember}
          onLoginClick={() => setShowLogin(true)}
          onLogout={handleProdLogout}
          onCastLogout={handleCastLogout}
        />
      )}

      <Routes>
        {/* ── Public ── */}
        <Route path="/"               element={<Home production={production} />} />
        <Route path="/movies"         element={<Movies />} />
        <Route path="/movie/:id"      element={<MovieDetails production={production} onToast={showToast} />} />
        <Route path="/cast"           element={<Cast />} />
        <Route path="/cast/:id"       element={<CastProfile />} />
        <Route path="/news"           element={<News />} />
        <Route path="/news/:id"       element={<NewsDetail />} />
        <Route path="/production/:id" element={<ProductionProfile production={production} />} />
        <Route path="/register"       element={<Register onSuccess={(p,t) => { handleProdAuth(p,t); }} onToast={showToast} />} />
        <Route path="/cast-register"  element={<CastRegister onSuccess={(m,t) => { handleCastAuth(m,t); }} onToast={showToast} />} />

        {/* ── Production Portal ── */}
        <Route path="/dashboard" element={
          <Dashboard
            production={production}
            onToast={showToast}
            onLogout={handleProdLogout}
            onProductionUpdate={updateProduction}
          />
        } />
        <Route path="/dashboard/add-movie" element={
          <AddMovie production={production} onToast={showToast} />
        } />
        {/* Portal-wrapped movie & cast pages */}
        <Route path="/portal/movie/:id" element={
          <PortalMovieDetails production={production} onToast={showToast} />
        } />
        <Route path="/portal/cast/:id" element={
          <PortalCastProfile production={production} />
        } />

        {/* ── Cast Member Portal ── */}
        <Route path="/cast-portal" element={
          <CastPortal
            castMember={castMember}
            onToast={showToast}
            onLogout={handleCastLogout}
            onUpdate={updateCastMember}
          />
        } />
      </Routes>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(prod, token) => {
            handleProdAuth(prod, token);
            setShowLogin(false);
            showToast(`Welcome back, ${prod.name}!`);
          }}
          onCastSuccess={(member, token) => {
            handleCastAuth(member, token);
            setShowLogin(false);
            showToast(`Welcome, ${member.name}!`);
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default function App() {
  const [production, setProduction] = useState(() => {
    try { const s = localStorage.getItem("op_prod"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [castMember, setCastMember] = useState(() => {
    try { const s = localStorage.getItem("cm_member"); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  return (
    <BrowserRouter>
      <AppInner
        production={production} setProduction={setProduction}
        castMember={castMember} setCastMember={setCastMember}
      />
    </BrowserRouter>
  );
}