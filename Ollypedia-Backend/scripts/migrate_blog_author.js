/**
 * migrate_blog_author.js
 * ──────────────────────
 * One-time migration: sets the `author` field to "Alekh Pradhan"
 * on every Blog document in the database.
 *
 * Usage:
 *   node scripts/migrate_blog_author.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌  MONGO_URI not found in .env");
  process.exit(1);
}

const AUTHOR_NAME = "Alekh Pradhan";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");

  // Update ALL blog documents regardless of their current author value
  const result = await mongoose.connection.collection("blogs").updateMany(
    {},                                   // match every document
    { $set: { author: AUTHOR_NAME } }     // overwrite author
  );

  console.log(
    `✅  Done. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
  );

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
