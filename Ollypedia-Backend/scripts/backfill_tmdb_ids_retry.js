const mongoose = require("mongoose");
const fetch = require("node-fetch");
require("dotenv").config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const CastSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tmdbId: { type: String, default: "", index: true },
  aliases: [{ type: String }],
  photo: { type: String, default: "" },
}, { strict: false });
const Cast = mongoose.model("Cast", CastSchema);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Robust fetch with retry logic
async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Rate limit hit
        await sleep(delay * (i + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      if (i === retries - 1) throw error; // Throw on last attempt
      if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
        await sleep(delay * (i + 1)); // Wait longer on each retry
      } else {
        throw error; // If it's not a connection reset or 429, don't retry
      }
    }
  }
}


async function backfillTmdbIdsRobust() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");

  const casts = await Cast.find({ $or: [{ tmdbId: "" }, { tmdbId: { $exists: false } }] });
  console.log(`Found ${casts.length} Cast profiles STILL missing tmdbId. Starting robust backfill...`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < casts.length; i++) {
    const cast = casts[i];
    
    try {
      const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cast.name)}`;
      const data = await fetchWithRetry(searchUrl);

      if (data && data.results && data.results.length > 0) {
        const bestMatch = data.results[0];
        
        // Exact name match (case insensitive)
        if (bestMatch.name.toLowerCase() === cast.name.toLowerCase()) {
          cast.tmdbId = String(bestMatch.id);
          if (bestMatch.profile_path && !cast.photo) {
             cast.photo = `https://image.tmdb.org/t/p/w185${bestMatch.profile_path}`;
          }
          await cast.save();
          updatedCount++;
          console.log(`[${i+1}/${casts.length}] ✅ Recovered & Mapped "${cast.name}" to TMDB ID: ${bestMatch.id}`);
        } else {
           notFoundCount++;
           console.log(`[${i+1}/${casts.length}] ⚠️ Fuzzy match skipped for "${cast.name}" (TMDB returned "${bestMatch.name}")`);
        }
      } else {
        notFoundCount++;
        console.log(`[${i+1}/${casts.length}] ❌ No TMDB results for "${cast.name}"`);
      }
    } catch (err) {
      console.error(`[${i+1}/${casts.length}] 🛑 Final error fetching TMDB for ${cast.name}:`, err.message);
    }

    // 150ms sleep to avoid hammering the API
    await sleep(150);
  }

  console.log("\n════════════════════════════════════════════");
  console.log(`✅ Robust Backfill complete!`);
  console.log(`🔗 Profiles recovered & linked: ${updatedCount}`);
  console.log(`❓ Profiles truly not found on TMDB: ${notFoundCount}`);
  console.log("════════════════════════════════════════════");

  await mongoose.disconnect();
}

backfillTmdbIdsRobust().catch(err => {
  console.error("Fatal error:", err);
  mongoose.disconnect();
});
