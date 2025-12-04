#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const matchesDir = path.join(repoRoot, 'matches');
const backupDir = path.join(repoRoot, `matches_backup_${Date.now()}`);

function isDirEmpty(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files.length === 0;
  } catch (e) {
    return true;
  }
}

(async () => {
  let backedUp = false;
  try {
    if (fs.existsSync(matchesDir) && !isDirEmpty(matchesDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      const entries = fs.readdirSync(matchesDir);
      for (const name of entries) {
        const src = path.join(matchesDir, name);
        const dest = path.join(backupDir, name);
        fs.renameSync(src, dest);
      }
      console.log('Backed up matches to', backupDir);
      backedUp = true;
    } else {
      console.log('matches is empty or missing; no backup needed.');
    }

    if (!fs.existsSync(matchesDir)) fs.mkdirSync(matchesDir, { recursive: true });
    const gitkeep = path.join(matchesDir, '.gitkeep');
    if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');

    console.log('Running electron build (with empty matches)...');
    execSync('npm run electron:build', { stdio: 'inherit', cwd: repoRoot, env: process.env });
    console.log('Build finished.');
  } catch (err) {
    console.error('Build failed:', err);
    process.exitCode = 1;
  } finally {
    if (backedUp && fs.existsSync(backupDir)) {
      const entries = fs.readdirSync(backupDir);
      for (const name of entries) {
        const src = path.join(backupDir, name);
        const dest = path.join(matchesDir, name);
        fs.renameSync(src, dest);
      }
      try {
        fs.rmdirSync(backupDir, { recursive: true });
      } catch (e) {}

      // remove .gitkeep if there are real files restored
      try {
        const remaining = fs.readdirSync(matchesDir).filter(n => n !== '.gitkeep');
        if (remaining.length > 0) {
          const kg = path.join(matchesDir, '.gitkeep');
          if (fs.existsSync(kg)) fs.unlinkSync(kg);
        }
      } catch (e) {}

      console.log('Restored matches from backup.');
    } else {
      console.log('No backup to restore.');
    }
  }
})();
