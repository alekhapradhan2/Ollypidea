import { Link } from "react-router-dom";

export default function MovieCard({ movie }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 20 }}>
      <h3>{movie.title}</h3>
      <p>{movie.director}</p>
      <Link to={`/movie/${movie._id}`}>View Details</Link>
    </div>
  );
}