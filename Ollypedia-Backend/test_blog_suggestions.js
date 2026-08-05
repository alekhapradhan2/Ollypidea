/**
 * test_blog_suggestions.js — Test runner for the Daily Blog Suggestion Engine
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { runBlogSuggestionEngine, BlogSuggestion } = require("./blogSuggestionEngine");

// Helper to define minimal inline schemas if server.js hasn't loaded them
function initSchemas() {
  if (!mongoose.models.Movie) {
    const MovieSchema = new mongoose.Schema({
      title: String,
      releaseDate: String,
      verdict: String,
      director: String,
      genre: [String],
      cast: [{ name: String, role: String, castId: mongoose.Schema.Types.ObjectId }]
    }, { timestamps: true });
    mongoose.model("Movie", MovieSchema);
  }

  if (!mongoose.models.Cast) {
    const CastSchema = new mongoose.Schema({
      name: String,
      type: String,
      roles: [String],
      location: String,
      movies: [mongoose.Schema.Types.ObjectId]
    }, { timestamps: true });
    mongoose.model("Cast", CastSchema);
  }

  if (!mongoose.models.News) {
    const NewsSchema = new mongoose.Schema({
      title: String,
      category: String,
      content: String
    }, { timestamps: true });
    mongoose.model("News", NewsSchema);
  }

  if (!mongoose.models.Blog) {
    const BlogSchema = new mongoose.Schema({
      title: String,
      content: String,
      category: String,
      tags: [String],
      published: Boolean,
      readTime: Number,
      metaDescription: String,
      author: String
    }, { timestamps: true });
    mongoose.model("Blog", BlogSchema);
  }
}

async function test() {
  console.log("=== Testing Blog Suggestion Engine ===");
  initSchemas();

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ollipedia_test";
  console.log(`Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB.");

    const res = await runBlogSuggestionEngine({ force: true });
    console.log("Run Result:", res);

    const recent = await BlogSuggestion.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log(`Retrieved ${recent.length} recent suggestions from DB:`);
    recent.forEach((item, index) => {
      console.log(`\n[${index + 1}] ${item.title}`);
      console.log(`    Category: ${item.category} | Source: ${item.sourceType} | Accuracy: ${item.accuracyScore}%`);
      console.log(`    Synopsis: ${item.synopsis}`);
      console.log(`    Reason: ${item.reason}`);
      console.log(`    Outline Items: ${item.outline?.length || 0}`);
    });

  } catch (err) {
    console.error("Test execution note:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

test();
