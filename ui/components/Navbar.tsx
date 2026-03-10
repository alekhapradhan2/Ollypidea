"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, setToken } from "../lib/api";

interface Movie {
  _id: string;
  title: string;
}

interface NavbarProps {
  currentMovie: Movie | null;
  onLoginClick?: () => void;
  onRefresh?: () => void;
}

export default function Navbar({ currentMovie, onLoginClick, onRefresh }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoggedIn = !!getToken();

  const handleLogout = () => {
    setToken(null);
    onRefresh && onRefresh();
    router.push("/");
  };

  const active = (path: string) =>
    pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        OLLI<span>PEDIA</span>
      </Link>

      <Link href="/" className={active("/")}>Home</Link>
      <Link href="/movies" className={active("/movies")}>Movies</Link>
      <Link href="/cast" className={active("/cast")}>Cast</Link>
      <Link href="/news" className={active("/news")}>News</Link>

      <div className="nav-actions">
        {isLoggedIn && currentMovie ? (
          <>
            <Link href={`/movie/${currentMovie._id}`} className="btn btn-outline btn-sm">
              My Movie
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => onLoginClick && onLoginClick()}>
              Login
            </button>
            <Link href="/register" className="btn btn-gold btn-sm">
              Register Movie
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}