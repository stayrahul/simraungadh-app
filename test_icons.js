const fs = require('fs');
const lucide = fs.readFileSync('node_modules/lucide-react-native/dist/lucide-react-native.d.ts', 'utf8');
const exportsList = lucide.match(/export const [a-zA-Z]+/g);
if (exportsList) {
  const names = exportsList.map(e => e.replace('export const ', ''));
  const badgeMatches = names.filter(n => n.includes('Badge') || n.includes('Check') || n.includes('Crown') || n.includes('Star') || n.includes('Shield') || n.includes('Medal'));
  console.log(badgeMatches.join('\n'));
} else {
  console.log("No exports found");
}
