// Builds the static site into dist/ and writes config.js from environment variables.
// Vercel runs this automatically (see vercel.json). Locally: SUPABASE_URL=... node build.mjs
import { mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';

const cfg = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  API_URL: (process.env.API_URL || '').replace(/\/$/, '')
};
const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) console.warn('⚠ Missing environment variables: ' + missing.join(', ') + ' — the site will show "Setup needed".');

mkdirSync('dist', { recursive: true });
copyFileSync('index.html', 'dist/index.html');
// The anon key is designed to be public; Row Level Security in Supabase protects the data.
writeFileSync('dist/config.js', 'window.GDJ_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n');
if (existsSync('config.local.js')) copyFileSync('config.local.js', 'dist/config.js');
console.log('Built dist/ for', cfg.API_URL || '(no API_URL)');
