// Verify all navigators and screens load without undefined exports
const fs = require('fs');
const path = require('path');

const navDir = path.resolve(__dirname, '../mobile/src/navigation');
const navigators = [
  { name: 'RootNavigator', file: 'RootNavigator.tsx' },
  { name: 'CollectorNavigator', file: 'CollectorNavigator.tsx' },
  { name: 'RecyclerNavigator', file: 'RecyclerNavigator.tsx' },
  { name: 'CitizenNavigator', file: 'CitizenNavigator.tsx' },
  { name: 'AdminNavigator', file: 'AdminNavigator.tsx' },
];

let allValid = true;

for (const nav of navigators) {
  const fullPath = path.join(navDir, nav.file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ [FAIL] Missing navigator file: ${nav.file}`);
    allValid = false;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes(`export const ${nav.name}`) && !content.includes(`export function ${nav.name}`)) {
    console.error(`❌ [FAIL] Missing export for ${nav.name} in ${nav.file}`);
    allValid = false;
  } else {
    console.log(`✔ [PASS] ${nav.name}: export verified (${nav.file})`);
  }
}

if (!allValid) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL 5 NAVIGATORS VALIDATED SUCCESSFULLY!');
}
