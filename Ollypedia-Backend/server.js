const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "10mb" }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ══════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════

// Production Company (the user/account)
const ProductionSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  logo:        String,
  banner:      String,
  bio:         String,
  founded:     String,
  website:     String,
  location:    String,
}, { timestamps: true });

// Cast / Crew member (shared across system)
const CastSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  type:   { type: String, default: "Actor" },
  bio:    String,
  photo:  String,
  movies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
}, { timestamps: true });

// News article (linked to a movie)
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

// Movie — owned by one production, can have collaborators
const MovieSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  category:    { type: String, default: "Feature Film" },
  genre:       [String],
  releaseDate: String,
  releaseTBA:  Boolean,
  director:    String,
  producer:    String,
  budget:      String,
  language:    { type: String, default: "Odia" },
  synopsis:    String,
  posterUrl:   String,

  // Owner production company
  productionId: { type: mongoose.Schema.Types.ObjectId, ref: "Production", required: true },

  // Collaborating production companies
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "Production" }],

  cast: [{
    castId: { type: mongoose.Schema.Types.ObjectId, ref: "Cast" },
    name:   String,
    photo:  String,
    type:   String,
    role:   String,
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
  reviews:  [ReviewSchema],
  news:     [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
}, { timestamps: true });

const Production = mongoose.model("Production", ProductionSchema);
const Movie      = mongoose.model("Movie",      MovieSchema);
const Cast       = mongoose.model("Cast",       CastSchema);
const News       = mongoose.model("News",       NewsSchema);

// ── Auth middleware ──
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.production = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Helper: check if production is owner OR collaborator
const canEdit = (movie, productionId) =>
  String(movie.productionId) === String(productionId) ||
  movie.collaborators.some(c => String(c) === String(productionId));

// ══════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════

// Register production company
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, logo, bio, founded, website, location } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Company name required" });
    if (!email || !password || password.length < 6)
      return res.status(400).json({ error: "Valid email and password (min 6 chars) required" });

    const exists = await Production.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const prod = await Production.create({
      name, email: email.toLowerCase(), password: hashed,
      logo: logo || "", bio: bio || "", founded: founded || "",
      website: website || "", location: location || "",
    });

    const token = jwt.sign(
      { productionId: prod._id, email: prod.email },
      process.env.JWT_SECRET, { expiresIn: "30d" }
    );
    const obj = prod.toObject(); delete obj.password;
    res.json({ token, production: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Login production company
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const prod = await Production.findOne({ email: email.toLowerCase() });
    if (!prod) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, prod.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { productionId: prod._id, email: prod.email },
      process.env.JWT_SECRET, { expiresIn: "30d" }
    );
    const obj = prod.toObject(); delete obj.password;
    res.json({ token, production: obj });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// PUBLIC ROUTES
// ══════════════════════════════════════════

// Get all production companies (public)
app.get("/api/productions", async (req, res) => {
  try {
    const prods = await Production.find({}, "-password -email").lean();
    // Attach movie count to each
    const counts = await Movie.aggregate([
      { $group: { _id: "$productionId", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[String(c._id)] = c.count; });
    const result = prods.map(p => ({ ...p, movieCount: countMap[String(p._id)] || 0 }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single production company (public)
app.get("/api/productions/:id", async (req, res) => {
  try {
    const prod = await Production.findById(req.params.id, "-password -email").lean();
    if (!prod) return res.status(404).json({ error: "Not found" });
    res.json(prod);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Search productions by name (for collaboration)
app.get("/api/productions/search/:q", async (req, res) => {
  try {
    const prods = await Production.find(
      { name: { $regex: req.params.q, $options: "i" } },
      "-password -email"
    ).limit(10).lean();
    res.json(prods);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all movies for a production (owner + collaborator)
app.get("/api/productions/:id/movies", async (req, res) => {
  try {
    const movies = await Movie.find({
      $or: [
        { productionId: req.params.id },
        { collaborators: req.params.id }
      ]
    }, "-reviews")
    .populate("productionId", "name logo")
    .populate("collaborators", "name logo")
    .populate("news")
    .lean();
    res.json(movies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all movies (public browse)
app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find({}, "-reviews")
      .populate("productionId", "name logo")
      .populate("collaborators", "name logo")
      .lean();
    res.json(movies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single movie
app.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id)
      .populate("productionId", "name logo")
      .populate("collaborators", "name logo")
      .populate("news")
      .lean();
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

// Search cast by name -- must come BEFORE /api/cast/:id
app.get("/api/cast/search/:q", async (req, res) => {
  try {
    const cast = await Cast.find(
      { name: { $regex: req.params.q, $options: "i" } }
    ).limit(10).lean();
    res.json(cast);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single cast member with all their movies
app.get("/api/cast/:id", async (req, res) => {
  try {
    const c = await Cast.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ error: "Not found" });
    const movies = await Movie.find(
      { "cast.castId": c._id },
      "title posterUrl releaseDate verdict productionId genre cast"
    ).populate("productionId", "name logo").lean();
    res.json({ ...c, moviesList: movies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all news
app.get("/api/news", async (req, res) => {
  try {
    const news = await News.find({ published: true }).sort({ createdAt: -1 }).lean();
    res.json(news);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single news article with related news + related movie
app.get("/api/news/:newsId", async (req, res) => {
  try {
    const item = await News.findById(req.params.newsId).lean();
    if (!item) return res.status(404).json({ error: "Not found" });

    // Related news: same category or same movie, exclude self
    const related = await News.find({
      _id: { $ne: item._id },
      published: true,
      $or: [
        { category: item.category },
        { movieId: item.movieId },
      ]
    }).sort({ createdAt: -1 }).limit(4).lean();

    // Related movie
    let movie = null;
    if (item.movieId) {
      movie = await Movie.findById(item.movieId, "title posterUrl genre verdict releaseDate productionId")
        .populate("productionId", "name logo").lean();
    }

    res.json({ ...item, related, movie });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all songs
app.get("/api/songs", async (req, res) => {
  try {
    const movies = await Movie.find({}, "title posterUrl media").lean();
    const songs = movies.flatMap(m =>
      (m.media?.songs || []).map(s => ({
        ...s, movieTitle: m.title, movieId: m._id, moviePoster: m.posterUrl,
      }))
    );
    res.json(songs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Post a review (public)
app.post("/api/movies/:id/reviews", async (req, res) => {
  try {
    const { user, rating, text } = req.body;
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: { user, rating, text, date: new Date().toISOString().split("T")[0] } } },
      { new: true }
    );
    res.json(movie.reviews);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════
// PROTECTED ROUTES (production company login required)
// ══════════════════════════════════════════

// Create a new movie
app.post("/api/movies", auth, async (req, res) => {
  try {
    const body = req.body;
    console.log("📥 body keys:", Object.keys(body), "cast type:", typeof body.cast, "isArray:", Array.isArray(body.cast));

    // Extract ONLY safe scalar fields — never spread req.body to avoid cast leak
    const title       = body.title       || "";
    const category    = body.category    || "Feature Film";
    const genre       = Array.isArray(body.genre) ? body.genre : [];
    const releaseDate = body.releaseDate  || "";
    const releaseTBA  = !!body.releaseTBA;
    const director    = body.director    || "";
    const producer    = body.producer    || "";
    const budget      = body.budget      || "";
    const language    = body.language    || "Odia";
    const synopsis    = body.synopsis    || "";
    const posterUrl   = body.posterUrl   || "";
    const verdict     = body.verdict     || "Upcoming";
    const status      = body.status      || "Upcoming";
    const media       = (body.media && typeof body.media === "object") ? body.media : { trailer: {}, songs: [] };

    // Normalise cast — handle array or accidental JSON string
    let castArray = [];
    if (Array.isArray(body.cast)) {
      castArray = body.cast;
    } else if (typeof body.cast === "string") {
      try { castArray = JSON.parse(body.cast); } catch { castArray = []; }
    }
    console.log("📋 castArray length:", castArray.length);

    // Normalise collaborators
    let collabRaw = body.collaborators;
    const collabList = Array.isArray(collabRaw) ? collabRaw
      : typeof collabRaw === "string" ? (() => { try { return JSON.parse(collabRaw); } catch { return []; } })()
      : [];

    // Process cast entries
    const castIds = [];
    for (const c of castArray) {
      if (!c.castId) {
        const nc = await Cast.create({
          name: c.name, type: c.type || "Actor",
          bio: c.bio || "", photo: c.photo || "", movies: []
        });
        castIds.push({ castId: nc._id, name: nc.name, photo: nc.photo || "", type: nc.type, role: c.role || "" });
      } else {
        const oid = new mongoose.Types.ObjectId(String(c.castId).trim());
        castIds.push({ castId: oid, name: c.name, photo: c.photo || "", type: c.type, role: c.role || "" });
      }
    }
    console.log("✅ castIds built:", castIds.length);

    // Validate collaborators
    const collabIds = [];
    for (const cid of collabList) {
      const p = await Production.findById(cid);
      if (p) collabIds.push(p._id);
    }

    // Build movie with ONLY explicit fields — no spread
    const movie = await Movie.create({
      title, category, genre, releaseDate, releaseTBA,
      director, producer, budget, language, synopsis, posterUrl,
      verdict, status, media,
      productionId: req.production.productionId,
      collaborators: collabIds,
      cast: castIds,
    });

    // Update cast.movies back-references
    for (const c of castIds) {
      await Cast.findByIdAndUpdate(c.castId, { $addToSet: { movies: movie._id } });
    }

    const populated = await Movie.findById(movie._id)
      .populate("productionId", "name logo")
      .populate("collaborators", "name logo")
      .lean();

    res.json(populated)
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update movie details (owner or collaborator)
app.patch("/api/movies/:id", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (!canEdit(movie, req.production.productionId))
      return res.status(403).json({ error: "Forbidden" });

    const allowed = ["title","category","genre","releaseDate","releaseTBA","director",
      "producer","budget","language","synopsis","posterUrl","verdict","status"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (req.body.verdict) update.status = req.body.verdict === "Upcoming" ? "Upcoming" : "Released";

    const updated = await Movie.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("productionId", "name logo").populate("collaborators", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update box office
app.patch("/api/movies/:id/boxoffice", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (!canEdit(movie, req.production.productionId))
      return res.status(403).json({ error: "Forbidden" });
    const { opening, firstWeek, total, verdict } = req.body;
    const updated = await Movie.findByIdAndUpdate(
      req.params.id,
      { boxOffice: { opening, firstWeek, total }, verdict, status: verdict === "Upcoming" ? "Upcoming" : "Released" },
      { new: true }
    ).populate("productionId", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add cast member to movie (owner only)
app.post("/api/movies/:id/cast", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== String(req.production.productionId))
      return res.status(403).json({ error: "Only owner can manage cast" });

    const c = req.body; // { name, type, role, photo, bio, isNew, castId }
    let castEntry;
    if (c.isNew) {
      const nc = await Cast.create({ name: c.name, type: c.type || "Actor", bio: c.bio || "", photo: c.photo || "" });
      await Cast.findByIdAndUpdate(nc._id, { $addToSet: { movies: movie._id } });
      castEntry = { castId: nc._id, name: nc.name, photo: nc.photo || "", type: nc.type, role: c.role || "" };
    } else {
      await Cast.findByIdAndUpdate(c.castId, { $addToSet: { movies: movie._id } });
      castEntry = { castId: c.castId, name: c.name, photo: c.photo || "", type: c.type, role: c.role || "" };
    }

    const updated = await Movie.findByIdAndUpdate(
      req.params.id, { $push: { cast: castEntry } }, { new: true }
    ).populate("productionId", "name logo").populate("collaborators", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove cast member from movie (owner only)
app.delete("/api/movies/:id/cast/:castId", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== String(req.production.productionId))
      return res.status(403).json({ error: "Only owner can manage cast" });
    const updated = await Movie.findByIdAndUpdate(
      req.params.id,
      { $pull: { cast: { castId: req.params.castId } } },
      { new: true }
    ).populate("productionId", "name logo").populate("collaborators", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add song (owner only)
app.post("/api/movies/:id/songs", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== String(req.production.productionId))
      return res.status(403).json({ error: "Only owner can manage media" });
    const song = { title: req.body.title, singer: req.body.singer || "", ytId: req.body.ytId || "", url: req.body.url || "" };
    const updated = await Movie.findByIdAndUpdate(
      req.params.id, { $push: { "media.songs": song } }, { new: true }
    ).populate("productionId", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update trailer (owner only)
app.patch("/api/movies/:id/trailer", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== String(req.production.productionId))
      return res.status(403).json({ error: "Only owner can manage media" });
    const updated = await Movie.findByIdAndUpdate(
      req.params.id, { "media.trailer": req.body }, { new: true }
    ).populate("productionId", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove song (owner only)
app.delete("/api/movies/:id/songs/:songIndex", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== String(req.production.productionId))
      return res.status(403).json({ error: "Only owner can manage media" });
    const idx = parseInt(req.params.songIndex);
    const songs = (movie.media?.songs || []).filter((_, i) => i !== idx);
    const updated = await Movie.findByIdAndUpdate(
      req.params.id, { "media.songs": songs }, { new: true }
    ).populate("productionId", "name logo").lean();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add collaborator
app.post("/api/movies/:id/collaborators", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (String(movie.productionId) !== String(req.production.productionId))
      return res.status(403).json({ error: "Only owner can add collaborators" });
    const collab = await Production.findById(req.body.productionId);
    if (!collab) return res.status(404).json({ error: "Production company not found" });
    await Movie.findByIdAndUpdate(req.params.id, { $addToSet: { collaborators: collab._id } });
    res.json({ message: `${collab.name} added as collaborator` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add news (owner + collaborators)
app.post("/api/movies/:id/news", auth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: "Not found" });
    if (!canEdit(movie, req.production.productionId))
      return res.status(403).json({ error: "Forbidden" });
    const item = await News.create({ ...req.body, movieId: movie._id, movieTitle: movie.title });
    await Movie.findByIdAndUpdate(req.params.id, { $push: { news: item._id } });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Edit news (owner + collaborators)
app.patch("/api/news/:newsId", auth, async (req, res) => {
  try {
    const item = await News.findById(req.params.newsId);
    if (!item) return res.status(404).json({ error: "Not found" });
    const movie = await Movie.findById(item.movieId);
    if (!movie) return res.status(404).json({ error: "Movie not found" });
    if (!canEdit(movie, req.production.productionId))
      return res.status(403).json({ error: "Forbidden" });
    const allowed = ["title","content","category","imageUrl","published"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const updated = await News.findByIdAndUpdate(req.params.newsId, update, { new: true });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete news (owner + collaborators)
app.delete("/api/news/:newsId", auth, async (req, res) => {
  try {
    const item = await News.findById(req.params.newsId);
    if (!item) return res.status(404).json({ error: "Not found" });
    const movie = await Movie.findById(item.movieId);
    if (!movie) return res.status(404).json({ error: "Movie not found" });
    if (!canEdit(movie, req.production.productionId))
      return res.status(403).json({ error: "Forbidden" });
    await News.findByIdAndDelete(req.params.newsId);
    await Movie.findByIdAndUpdate(item.movieId, { $pull: { news: item._id } });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update production profile
app.patch("/api/productions/me", auth, async (req, res) => {
  try {
    const allowed = ["name","logo","banner","bio","founded","website","location"];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const prod = await Production.findByIdAndUpdate(
      req.production.productionId, update, { new: true, select: "-password -email" }
    );
    res.json(prod);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 4000, () =>
  console.log(`🚀 Server on port ${process.env.PORT || 4000}`)
);