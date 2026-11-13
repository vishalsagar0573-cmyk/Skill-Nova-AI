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
let issues = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match import { ... } from 'lucide-react'
  const lucideMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const importedIcons = new Set();
  if (lucideMatch) {
    lucideMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean).forEach(icon => {
      importedIcons.add(icon);
    });
  }

  // Find JSX elements: <IconName or IconName.something or IconName in tags
  // Also check if any icon is referenced in nav items or arrays: { icon: IconName }
  const tagMatches = content.match(/<([A-Z][a-zA-Z0-9]+)\b/g) || [];
  tagMatches.forEach(tag => {
    const name = tag.slice(1);
    // Ignore React components defined in file or known HTML/lib tags
    if (['Route', 'Routes', 'Navigate', 'Link', 'AnimatePresence', 'motion', 'ResponsiveContainer', 'RadarChart', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis', 'Radar', 'Tooltip', 'BarChart', 'Bar', 'XAxis', 'YAxis', 'CartesianGrid', 'PieChart', 'Pie', 'Cell', 'Legend', 'AreaChart', 'Area'].includes(name)) return;
    // Check if it's imported or defined in file
    const isDefined = new RegExp(`(function\\s+${name}|const\\s+${name}|let\\s+${name}|class\\s+${name}|import\\s+${name}|import\\s*\\{[^}]*\\b${name}\\b)`).test(content);
    if (!isDefined) {
      console.error(`In ${file}: Element <${name}> is used but NOT defined or imported!`);
      issues++;
    }
  });

  // Check { icon: IconName }
  const iconProps = content.match(/icon:\s*([A-Z][a-zA-Z0-9]+)/g) || [];
  iconProps.forEach(ip => {
    const name = ip.split(':')[1].trim();
    const isDefined = new RegExp(`(function\\s+${name}|const\\s+${name}|let\\s+${name}|class\\s+${name}|import\\s+${name}|import\\s*\\{[^}]*\\b${name}\\b)`).test(content);
    if (!isDefined) {
      console.error(`In ${file}: Icon reference '${name}' is used but NOT defined or imported!`);
      issues++;
    }
  });
});

console.log('Icon & component check finished. Issues found:', issues);
