require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");

  const moviesColl = mongoose.connection.collection("movies");
  
  const restoreFile = path.join(__dirname, "../restore.txt");
  if (!fs.existsSync(restoreFile)) {
    console.error("❌  restore.txt not found!");
    process.exit(1);
  }

  const content = fs.readFileSync(restoreFile, "utf8");
  const lines = content.split("\n");

  let restored = 0;

  for (const line of lines) {
    if (!line.includes("✅ UPDATED")) continue;

    // Pattern: 📅 "Movie Title": 2015-09-17 → 1960-01-01
    const match = line.match(/"([^"]+)":\s*([\d-]+|NONE)\s*→/);
    if (!match) continue;

    const title = match[1];
    let originalDate = match[2];
    
    if (originalDate === "NONE") {
      originalDate = ""; // revert to empty if it had none
    }

    await moviesColl.updateOne(
      { title: title },
      { $set: { releaseDate: originalDate } }
    );

    console.log(`✅ Restored "${title}" back to ${originalDate || "empty"}`);
    restored++;
  }

  console.log(`\n🎉 Successfully restored ${restored} movies!`);
  await mongoose.disconnect();
}

main().catch(console.error);
