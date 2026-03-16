import React, { useState, useCallback, Suspense, lazy } from "react";
import { HashRouter } from "react-router-dom";
import { setToken } from "./api/api";

import Navbar    from "./components/Navbar";
import Footer    from "./components/Footer";
import { Toast } from "./components/UI";

// ── Critical path — loaded eagerly (above the fold) ───────────────
import Home from "./pages/Home";

// ── All other pages — code-split, loaded on demand ────────────────
// Each lazy() creates a separate JS chunk that only downloads when
// the user navigates to that route — dramatically reduces initial bundle.
const Movies           = lazy(() => import("./pages/Movies"));
const MovieDetails     = lazy(() => import("./pages/MovieDetails"));
const Cast             = lazy(() => import("./pages/Cast"));
const CastProfile      = lazy(() => import("./pages/CastProfile"));
const News             = lazy(() => import("./pages/News"));
const NewsDetail       = lazy(() => import("./pages/NewsDetail"));
const SongDetail       = lazy(() => import("./pages/SongDetail"));
const AllSongs         = lazy(() => import("./pages/AllSongs"));
const ProductionProfile= lazy(() => import("./pages/ProductionProfile"));
const AdminLogin       = lazy(() => import("./pages/AdminLogin"));
const AdminPortal      = lazy(() => import("./pages/AdminPortal"));
// Legal / info pages (tiny, also lazy)
const PrivacyPolicy    = lazy(() => import("./pages/PrivacyPolicy"));
const AboutUs          = lazy(() => import("./pages/AboutUs"));
const ContactUs        = lazy(() => import("./pages/ContactUs"));

// ── Minimal fallback shown during chunk load ──────────────────────
function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", color: "var(--muted)", flexDirection: "column", gap: 12,
    }}>
      <div style={{ fontSize: "1.8rem" }}>🎬</div>
      <p style={{ fontSize: ".82rem" }}>Loading…</p>
    </div>
  );
}

function AppInner({ admin, setAdmin }) {
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const isAdminPortal = location.pathname.startsWith("/admin");
  // Don't show public Footer inside admin portal
  const showFooter = !isAdminPortal;

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

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"       element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/cast"   element={<Cast />} />
          <Route path="/news"   element={<News />} />
          <Route path="/songs"  element={<AllSongs />} />

          {/* Slug / detail routes */}
          <Route path="/movie/:slug"                element={<MovieDetails onToast={showToast} />} />
          <Route path="/cast/:slug"                 element={<CastProfile />} />
          <Route path="/news/:slug"                 element={<NewsDetail />} />
          <Route path="/song/:movieSlug/:songIndex" element={<SongDetail />} />
          <Route path="/song/:movieSlug"            element={<SongDetail />} />
          <Route path="/production/:id"             element={<ProductionProfile />} />

          {/* ── Info / Legal ── */}
          <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
          <Route path="/about"           element={<AboutUs />} />
          <Route path="/contact"         element={<ContactUs />} />

          {/* ── Admin ── */}
          <Route path="/admin/login" element={<AdminLogin onSuccess={handleAdminAuth} onToast={showToast} />} />
          <Route path="/admin/*"     element={<AdminPortal admin={admin} onLogout={handleAdminLogout} onToast={showToast} />} />
        </Routes>
      </Suspense>

      {showFooter && <Footer />}

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