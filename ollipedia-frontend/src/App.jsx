import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import Toast from "./components/Toast";

import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import Cast from "./pages/Cast";
import News from "./pages/News";
import Register from "./pages/Register";

export default function App() {
  const [currentMovie, setCurrentMovie] = useState(() => {
    try {
      const s = localStorage.getItem("op_movie");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState(null);

  const handleLoginSuccess = (movie) => {
    setCurrentMovie(movie);
    try { localStorage.setItem("op_movie", JSON.stringify(movie)); } catch {}
    showToast("Welcome back! " + movie.title, "success");
  };

  const handleLogout = () => {
    setCurrentMovie(null);
    try { localStorage.removeItem("op_movie"); } catch {}
  };

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  return (
    <BrowserRouter>
      <Navbar
        currentMovie={currentMovie}
        onLoginClick={() => setShowLogin(true)}
        onRefresh={handleLogout}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movie/:id" element={
          <MovieDetails currentMovie={currentMovie} onToast={showToast} />
        } />
        <Route path="/cast" element={<Cast />} />
        <Route path="/news" element={<News />} />
        <Route path="/register" element={
          <Register onSuccess={handleLoginSuccess} />
        } />
      </Routes>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={handleLoginSuccess}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </BrowserRouter>
  );
}