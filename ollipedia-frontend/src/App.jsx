import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import Cast from "./pages/Cast";
import News from "./pages/News";

import Navbar from "./components/Navbar";

function App() {

  return (

    <BrowserRouter>

      <Navbar />

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/movies" element={<Movies />} />

        <Route path="/movie/:id" element={<MovieDetails />} />

        <Route path="/cast" element={<Cast />} />

        <Route path="/news" element={<News />} />

      </Routes>

    </BrowserRouter>

  );

}

export default App;