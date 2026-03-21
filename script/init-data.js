const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../database/db.example.json");
const dest = path.join(__dirname, "../database/db.json");

fs.copyFile(src, dest, (err) => {
  if (err) {
    console.error("Erreur lors de la copie:", err);
  } else {
    console.log("Fichier copié avec succès.");
  }
});
