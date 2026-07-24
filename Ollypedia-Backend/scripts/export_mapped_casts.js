const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const CastSchema = new mongoose.Schema({
  name: String,
  tmdbId: String
}, { strict: false });
const Cast = mongoose.model("Cast", CastSchema);

async function exportMappedCasts() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const casts = await Cast.find({ tmdbId: { $ne: "" }, tmdbId: { $exists: true } }).sort({ name: 1 });
  
  let markdown = "# Successfully Mapped Cast Members\n\n";
  markdown += `Total mapped: ${casts.length}\n\n`;
  markdown += "| Name | TMDB ID |\n|---|---|\n";
  
  for (const cast of casts) {
    markdown += `| ${cast.name} | ${cast.tmdbId} |\n`;
  }
  
  const artifactPath = path.join("C:", "Users", "BYTEIQ", ".gemini", "antigravity-ide", "brain", "8a7f5fa7-9381-43e9-b360-13707a118f63", "mapped_casts.md");
  fs.writeFileSync(artifactPath, markdown);
  
  console.log("Exported mapped casts to artifact.");
  await mongoose.disconnect();
}

exportMappedCasts().catch(console.error);
