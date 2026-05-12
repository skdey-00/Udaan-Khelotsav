const fs = require('fs');
const content = fs.readFileSync('src/data/players.ts', 'utf8');

// Extract PLAYERS array - simple line by line parsing
const players = [];
const lines = content.split('\n');
let inPlayersArray = false;
let currentObj = null;

for (const line of lines) {
  if (line.trim() === 'export const PLAYERS: Player[] = [') {
    inPlayersArray = true;
    continue;
  }
  if (line.trim() === '];' && inPlayersArray) {
    inPlayersArray = false;
    continue;
  }
  if (!inPlayersArray) continue;

  // Extract name
  const nameMatch = line.match(/"name":\s*"([^"]+)"/);
  if (nameMatch) {
    currentObj = { name: nameMatch[1] };
    players.push(currentObj);
  }
  const genderMatch = line.match(/"gender":\s*"([^"]+)"/);
  if (genderMatch && currentObj) currentObj.gender = genderMatch[1];
  const categoryMatch = line.match(/"category":\s*"([^"]+)"/);
  if (categoryMatch && currentObj) currentObj.category = categoryMatch[1];
  const gradeMatch = line.match(/"grade":\s*"([^"]+)"/);
  if (gradeMatch && currentObj) currentObj.grade = gradeMatch[1];
}

console.log('SITE PLAYERS (' + players.length + '):');
players.forEach((p, i) => console.log((i+1).toString().padStart(2, '0') + '. ' + p.name.padEnd(30) + ' | Grade: ' + p.grade + ' | ' + p.gender + ' | ' + p.category));
