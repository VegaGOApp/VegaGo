const fs = require('fs');
const content = fs.readFileSync('c:/Users/User/Documents/vega antes de implementar cambio de mapa/Vega2/src/data/busLines.js', 'utf8');

// Mock export to get the array
let busLines = [];
try {
  const evalContent = content.replace('export const busLines =', 'busLines =')
                             .replace('export const getBusLineById =', '//');
  eval(evalContent);
} catch(e) {
  console.error(e);
}

const urbanLines = busLines.filter(l => l.type === 'urbano');
console.log(JSON.stringify(urbanLines, null, 2));
