import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const envPath = path.join(rootDir, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const allowedDomains = envContent
  .split('\n')
  .find(line => line.startsWith('ALLOWED_DOMAINS='))
  ?.split('=')[1]
  ?.split(',')
  .map(d => d.trim())
  .filter(Boolean) || [];

console.log('Building with allowed domains:', allowedDomains);

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

copyDir(path.join(rootDir, 'src'), distDir);
copyDir(path.join(rootDir, 'public', 'data'), path.join(distDir, 'data'));
copyDir(path.join(rootDir, 'src', 'locales'), path.join(distDir, 'locales'));

const securityPath = path.join(distDir, 'js', 'security.js');
if (fs.existsSync(securityPath)) {
  let securityJs = fs.readFileSync(securityPath, 'utf8');
  securityJs = securityJs.replace(
    '__ALLOWED_DOMAINS__',
    JSON.stringify(allowedDomains)
  );
  fs.writeFileSync(securityPath, securityJs);
  console.log('Injected domain whitelist into security.js');
}

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = (await import('javascript-obfuscator')).default;
} catch (e) {
  console.log('javascript-obfuscator not installed, skipping obfuscation');
  console.log('Run: npm install');
  process.exit(0);
}

const jsFiles = [
  'dist/js/app.js',
  'dist/js/chart.js',
  'dist/js/i18n.js',
  'dist/js/table.js',
  'dist/js/utils.js',
  'dist/js/security.js'
];

for (const file of jsFiles) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  const code = fs.readFileSync(filePath, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.5,
    renameGlobals: false,
    selfDefending: false
  }).getObfuscatedCode();
  
  fs.writeFileSync(filePath, obfuscated);
  console.log(`Obfuscated: ${file}`);
}

console.log('Build complete: dist/');
