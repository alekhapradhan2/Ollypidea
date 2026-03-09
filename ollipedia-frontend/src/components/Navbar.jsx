import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ padding: 20, background: "#111", color: "white" }}>
      <Link to="/" style={{ marginRight: 20 }}>Home</Link>
      <Link to="/movies" style={{ marginRight: 20 }}>Movies</Link>
      <Link to="/cast" style={{ marginRight: 20 }}>Cast</Link>
      <Link to="/news">News</Link>
    </nav>
  );
}