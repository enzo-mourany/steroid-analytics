const fs = require('fs');
const path = require('path');

// Lire le fichier compilé
const inputFile = path.join(__dirname, 'dist', 'steroid-analytics.js');
const outputFile = path.join(__dirname, 'dist', 'steroid-analytics.min.js');

if (!fs.existsSync(inputFile)) {
  console.error('Fichier source non trouvé. Lancez d\'abord: npm run build');
  process.exit(1);
}

let content = fs.readFileSync(inputFile, 'utf8');

// Minification basique (enlève les commentaires et espaces superflus)
// Pour une vraie minification, utiliser uglify-js ou terser
content = content
  .replace(/\/\*\*[\s\S]*?\*\//g, '') // Enlève les commentaires bloc
  .replace(/\/\/.*$/gm, '') // Enlève les commentaires ligne
  .replace(/\s+/g, ' ') // Remplace multiples espaces par un seul
  .replace(/\s*{\s*/g, '{')
  .replace(/\s*}\s*/g, '}')
  .replace(/\s*;\s*/g, ';')
  .trim();

fs.writeFileSync(outputFile, content);
console.log(`✅ Fichier minifié créé: ${outputFile}`);
console.log(`Taille: ${(content.length / 1024).toFixed(2)} KB`);

