const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.jsx')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('frontend/src');
console.log('Found JSX files:', files.length);

let missingCount = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (/<Link\b/.test(content) && !/import[\s\S]*?\bLink\b[\s\S]*?from ['"]react-router-dom['"]/.test(content)) {
    console.error('MISSING Link import in:', file);
    missingCount++;
  }
  if (/\buseNavigate\b/.test(content) && !/import[\s\S]*?\buseNavigate\b[\s\S]*?from ['"]react-router-dom['"]/.test(content)) {
    console.error('MISSING useNavigate import in:', file);
    missingCount++;
  }
  if (/\buseLocation\b/.test(content) && !/import[\s\S]*?\buseLocation\b[\s\S]*?from ['"]react-router-dom['"]/.test(content)) {
    console.error('MISSING useLocation import in:', file);
    missingCount++;
  }
  if (/\buseTheme\b/.test(content) && !/import[\s\S]*?\buseTheme\b[\s\S]*?from/.test(content)) {
    console.error('MISSING useTheme import in:', file);
    missingCount++;
  }
});

console.log('Check completed. Total missing imports found:', missingCount);
