#!/usr/bin/env node

// MTG Deck Builder - Cross-Platform Setup Script
// Usage: node setup.js [--dev | --build | --prod | --seed | --test]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
process.chdir(ROOT);

function log(msg) { console.log(`\x1b[32m[MTG]\x1b[0m ${msg}`); }
function err(msg) { console.error(`\x1b[31m[MTG]\x1b[0m ${msg}`); }

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, shell: true });
  } catch (e) {
    err(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function checkNode() {
  try {
    const version = execSync('node -v', { encoding: 'utf8' }).trim();
    const major = parseInt(version.replace('v', '').split('.')[0], 10);
    if (major < 18) {
      err(`Node.js 18+ required (found ${version}). Please upgrade.`);
      process.exit(1);
    }
    log(`Node.js ${version} detected`);
  } catch {
    err('Node.js is not installed. Install from https://nodejs.org');
    process.exit(1);
  }
}

function installDeps() {
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    log('Installing dependencies...');
    run('npm install');
  } else {
    log('Dependencies already installed.');
  }
}

function initData() {
  const dataDir = path.join(ROOT, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    log('Created data directory.');
  }
}

// Parse args
const flag = process.argv[2];

console.log('');
console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
console.log('  \u2551   MTG Deck Builder Setup         \u2551');
console.log('  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
console.log('');

checkNode();
installDeps();
initData();

switch (flag) {
  case '--dev':
    log('Starting development server on http://localhost:3000');
    run('npm run dev');
    break;
  case '--build':
    log('Building for production...');
    run('npm run build');
    log('Build complete!');
    break;
  case '--prod':
    log('Building for production...');
    run('npm run build');
    log('Starting production server on http://localhost:3000');
    run('npm run start');
    break;
  case '--seed':
    log('Seeding card database from Scryfall...');
    run('npm run db:seed');
    log('Database seeded!');
    break;
  case '--test':
    log('Running tests...');
    run('npm test');
    break;
  default:
    log('Setup complete! Available commands:');
    console.log('');
    console.log('  node setup.js --dev     Start development server');
    console.log('  node setup.js --build   Build for production');
    console.log('  node setup.js --prod    Build and start production server');
    console.log('  node setup.js --seed    Download card database from Scryfall');
    console.log('  node setup.js --test    Run test suite');
    console.log('');
    log('Quick start: node setup.js --dev');
    log('Then open http://localhost:3000 and click "Download Card Database"');
    console.log('');
    break;
}
