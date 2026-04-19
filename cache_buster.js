const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');

const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const p = path.join(publicDir, f);
  let content = fs.readFileSync(p, 'utf8');
  // replace .js" with .js?v=2"
  // be careful not to replace ?v=2?v=2 if it's already there
  content = content.replace(/\.js(\?v=\d+)?"/g, '.js?v=2"');
  fs.writeFileSync(p, content);
});
console.log('Done replacing js cache links');
