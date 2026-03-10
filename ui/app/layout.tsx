"use client";
import { useState, useCallback, ReactNode } from "react";
import "./globals.css";
import Navbar from "../components/Navbar";
import LoginModal from "../components/LoginModal";
import Toast from "../components/Toast";

interface Movie {
  _id: string;
  title: string;
}

interface ToastData {
  message: string;
  type: "success" | "error";
}

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem("op_movie");
        return s ? JSON.parse(s) : null;
      } catch { 
        return null; 
      }
    }
    return null;
  });
  
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const handleLoginSuccess = (movie: Movie) => {
    setCurrentMovie(movie);
    if (typeof window !== 'undefined') {
      try { 
        localStorage.setItem("op_movie", JSON.stringify(movie)); 
      } catch {}
    }
    showToast("Welcome back! " + movie.title, "success");
  };

  const handleLogout = () => {
    setCurrentMovie(null);
    if (typeof window !== 'undefined') {
      try { 
        localStorage.removeItem("op_movie"); 
      } catch {}
    }
  };

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  return (
    <html lang="en">
      <body>
        <Navbar
          currentMovie={currentMovie}
          onLoginClick={() => setShowLogin(true)}
          onRefresh={handleLogout}
        />
        {children}
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
      </body>
    </html>
  );
}