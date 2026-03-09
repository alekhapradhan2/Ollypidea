const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "10mb" }));

// ── Connect MongoDB ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ══════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════

const CastSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  type:   { type: String, default: "Actor" },
  bio:    String,
  photo:  String,
  movies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
}, { timestamps: true });

const NewsSchema = new mongoose.Schema({
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
  movieTitle: String,
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  category:   { type: String, default: "Update" },
  imageUrl:   String,
  published:  { type: Boolean, default: true },
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  user:   String,
  rating: Number,
  text:   String,
  date:   String,
});

const MovieSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  category:   { type: String, default: "Feature Film" },
  genre:      [String],
  releaseDate: String,
  releaseTBA: Boolean,
  director:   String,
  producer:   String,
  budget:     String,
  language:   { type: String, default: "Odia" },
  synopsis:   String,
  posterUrl:  String,
  cast: [{
    castId:    { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },
    name:      String,
    photo:     String,
    type:      String,
    role:      String,
  }],
  media: {
    trailer: { ytId: String, url: String },
    songs: [{
      title:  String,
      singer: String,
      ytId:   String,
      url:    String,
    }],
  },
  boxOffice: {
    opening:   { type: String, default: "TBA" },
    firstWeek: { type: String, default: "TBA" },
    total:     { type: String, default: "TBA" },
  },
  verdict:  { type: String, default: "Upcoming" },
  status:   { type: String, default: "Upcoming" },
  rating:   { type: Number, default: 0 },
  reviews:  [ReviewSchema],
  news:     [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const Movie = mongoose.model("Movie", MovieSchema);
const Cast  = mongoose.model("Cast",  CastSchema);
const News  = mongoose.model("News",  NewsSchema);

// ── Auth middleware ──
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.movie = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ══════════════════════════════════════════
// ROUTES — PUBLIC
// ══════════════════════════════════════════

// Get all movies (public fields only)
app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}, "-password -email")
      .populate("news").lean();
    res.json(movies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single movie
app.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id, "-password -email")
      .populate("news").lean();
    if (!movie) return res.status(404).json({ error: "Not found" });
    res.json(movie);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all cast
app.get("/api/cast", async (req, res) => {
  try {
    const cast = await Cast.find().lean();
    res.json(cast);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single cast
app.get("/api/cast/:id", async (req, res) => {
  try {
    const c = await Cast.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ error: "Not found" });
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all news
app.get("/api/news", async (req, res) => {
  try {
    const news = await News.find({ published: true }).sort({ createdAt: -1 }).lean();
    res.json(news);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all songs (aggregated from movies)
app.get("/api/songs", async (req, res) => {
  try {
    const movies = await Movie.find({}, "title posterUrl media").lean();
    const songs = movies.flatMap(m =>
      (m.media?.songs || []).map(s => ({
        ...s,
        movieTitle: m.title,
        movieId: m._id,
        moviePoster: m.posterUrl,
      }))
    );
    res.json(songs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Register movie
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, cast: castData, newCast, ...movieData } = req.body;

    if (!email || !password || password.length < 6)
      return res.status(400).json({ error: "Invalid email/password" });
    if (!movieData.title?.trim())
      return res.status(400).json({ error: "Movie title required" });

    const exists = await Movie.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    // Save new cast profiles
    const castIds = [];
    for (const c of castData || []) {
      if (c.isNew) {
        const nc = await Cast.create({ name: c.name, type: c.type, bio: c.bio, photo: c.photo, movies: [] });
        castIds.push({ castId: nc._id, name: nc.name, photo: nc.photo, type: nc.type, role: c.role });
      } else {
        castIds.push({ castId: c.id, name: c.name, photo: c.photo, type: c.type, role: c.role });
      }
    }

    const movie = await Movie.create({
      ...movieData,
      email: email.toLowerCase(),
      password: hashed,
      cast: castIds,
    });

    // Update cast.movies references
    for (const c of castIds) {
      await Cast.findByIdAndUpdate(c.castId, { $addToSet: { movies: movie._id } });
    }

    const token = jwt.sign({ movieId: movie._id, email: movie.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, movie: { ...movie.toObject(), password: undefined } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const movie = await Movie.findOne({ email: email.toLowerCase() }).populate("news");
    if (!movie) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, movie.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ movieId: movie._id, email: movie.email }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const obj = movie.toObject(); delete obj.password;
    res.json({ token, movie: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Post a review (public)
app.post("/api/movies/:id/reviews", async (req, res) => {
  try {
    const { user, rating, text } = req.body;
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: { user, rating, text, date: new Date().toISOString().split("T")[0] } } },
      { new: true, select: "-password -email" }
    );
    res.json(movie.reviews);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// ROUTES — PROTECTED (movie owner only)
// ══════════════════════════════════════════

// Update box office
app.patch("/api/movies/:id/boxoffice", auth, async (req, res) => {
  try {
    if (req.movie.movieId !== req.params.id) return res.status(403).json({ error: "Forbidden" });
    const { opening, firstWeek, total, verdict } = req.body;
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { boxOffice: { opening, firstWeek, total }, verdict, status: verdict === "Upcoming" ? "Upcoming" : "Released" },
      { new: true, select: "-password -email" }
    );
    res.json(movie);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update cast
app.patch("/api/movies/:id/cast", auth, async (req, res) => {
  try {
    if (req.movie.movieId !== req.params.id) return res.status(403).json({ error: "Forbidden" });
    const movie = await Movie.findByIdAndUpdate(req.params.id, { cast: req.body.cast }, { new: true, select: "-password -email" });
    res.json(movie);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update media (trailer + songs)
app.patch("/api/movies/:id/media", auth, async (req, res) => {
  try {
    if (req.movie.movieId !== req.params.id) return res.status(403).json({ error: "Forbidden" });
    const movie = await Movie.findByIdAndUpdate(req.params.id, { media: req.body.media }, { new: true, select: "-password -email" });
    res.json(movie);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add news
app.post("/api/movies/:id/news", auth, async (req, res) => {
  try {
    if (req.movie.movieId !== req.params.id) return res.status(403).json({ error: "Forbidden" });
    const movie = await Movie.findById(req.params.id);
    const item = await News.create({ ...req.body, movieId: movie._id, movieTitle: movie.title });
    await Movie.findByIdAndUpdate(req.params.id, { $push: { news: item._id } });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create cast profile
app.post("/api/cast", auth, async (req, res) => {
  try {
    const c = await Cast.create(req.body);
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 4000, () => console.log(`🚀 Server on port ${process.env.PORT || 4000}`));
