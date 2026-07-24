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

async function backfillTmdbIds() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");

  const casts = await Cast.find({ $or: [{ tmdbId: "" }, { tmdbId: { $exists: false } }] });
  console.log(`Found ${casts.length} Cast profiles missing tmdbId. Starting backfill...`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < casts.length; i++) {
    const cast = casts[i];
    
    try {
      const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cast.name)}`;
      const res = await fetch(searchUrl);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        // Assume the first result is the best match
        const bestMatch = data.results[0];
        
        // Double check it's reasonably close (case-insensitive exact match)
        if (bestMatch.name.toLowerCase() === cast.name.toLowerCase()) {
          cast.tmdbId = String(bestMatch.id);
          if (bestMatch.profile_path && !cast.photo) {
             cast.photo = `https://image.tmdb.org/t/p/w185${bestMatch.profile_path}`;
          }
          await cast.save();
          updatedCount++;
          console.log(`[${i+1}/${casts.length}] ✅ Mapped "${cast.name}" to TMDB ID: ${bestMatch.id}`);
        } else {
           notFoundCount++;
           console.log(`[${i+1}/${casts.length}] ⚠️ Fuzzy match skipped for "${cast.name}" (TMDB returned "${bestMatch.name}")`);
        }
      } else {
        notFoundCount++;
        console.log(`[${i+1}/${casts.length}] ❌ No TMDB results for "${cast.name}"`);
      }
    } catch (err) {
      console.error(`Error fetching TMDB for ${cast.name}:`, err.message);
    }

    // Respect TMDB rate limits (max 50 requests per second, so 30ms sleep is plenty safe)
    await sleep(40);
  }

  console.log("\n════════════════════════════════════════════");
  console.log(`✅ Backfill complete!`);
  console.log(`🔗 Profiles linked to TMDB ID : ${updatedCount}`);
  console.log(`❓ Profiles not found on TMDB : ${notFoundCount}`);
  console.log("════════════════════════════════════════════");

  await mongoose.disconnect();
}

backfillTmdbIds().catch(err => {
  console.error("Fatal error:", err);
  mongoose.disconnect();
});
