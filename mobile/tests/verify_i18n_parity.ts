import fs from 'fs';
import path from 'path';

// Load translation files
import { en } from '../src/i18n/locales/en';
import { hi } from '../src/i18n/locales/hi';
import { mr } from '../src/i18n/locales/mr';
import { or } from '../src/i18n/locales/or';

// Flatten function
function flattenObj(obj: any, prefix = ''): Record<string, string> {
  let res: Record<string, string> = {};
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      res = { ...res, ...flattenObj(val, keyPath) };
    } else {
      res[keyPath] = String(val);
    }
  }
  return res;
}

const enFlat = flattenObj(en);
const hiFlat = flattenObj(hi);
const mrFlat = flattenObj(mr);
const orFlat = flattenObj(or);

const enKeys = Object.keys(enFlat);
const hiKeys = new Set(Object.keys(hiFlat));
const mrKeys = new Set(Object.keys(mrFlat));
const orKeys = new Set(Object.keys(orFlat));

const missingHI = enKeys.filter(k => !hiKeys.has(k));
const missingMR = enKeys.filter(k => !mrKeys.has(k));
const missingOR = enKeys.filter(k => !orKeys.has(k));

console.log('--- EN / HI / MR / OR KEY PARITY AUDIT ---');
console.log(`EN total keys: ${enKeys.length}`);
console.log(`HI total keys: ${Object.keys(hiFlat).length} (Missing: ${missingHI.length})`);
console.log(`MR total keys: ${Object.keys(mrFlat).length} (Missing: ${missingMR.length})`);
console.log(`OR total keys: ${Object.keys(orFlat).length} (Missing: ${missingOR.length})`);

if (missingHI.length || missingMR.length || missingOR.length) {
  console.error('PARITY AUDIT FAILED! Missing keys present!');
  process.exit(1);
} else {
  console.log('PARITY AUDIT SUCCESSFUL! 100% Parity across all 4 languages.');
}
