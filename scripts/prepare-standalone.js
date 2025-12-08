const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
    if (fs.existsSync(src)) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            fs.readdirSync(src).forEach(child => {
                copyRecursiveSync(path.join(src, child), path.join(dest, child));
            });
        } else {
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(src, dest);
        }
    }
}

function removeRecursiveSync(target) {
    if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        console.log(`Removed: ${target}`);
    }
}

function findServerJs(dir, depth = 0) {
    if (depth > 5) return null; // Prevent deep recursion

    console.log(`Searching in: ${dir}`);
    if (fs.existsSync(path.join(dir, 'server.js'))) {
        return dir;
    }

    if (!fs.existsSync(dir)) return null;

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        // Skip node_modules, .next, and release to avoid deep recursion and false positives
        if (item === 'node_modules' || item === '.next' || item === 'release') continue;

        try {
            if (fs.statSync(fullPath).isDirectory()) {
                const found = findServerJs(fullPath, depth + 1);
                if (found) return found;
            }
        } catch (e) {
            console.warn(`Error accessing ${fullPath}:`, e.message);
        }
    }
    return null;
}

const projectRoot = path.join(__dirname, '..');
const standaloneBase = path.join(projectRoot, '.next', 'standalone');

console.log('Preparing standalone build...');

// 1. Detect target directory (where server.js is)
let targetDir = findServerJs(standaloneBase);

if (!targetDir) {
    // Fallback logic for known structure
    const nestedPath = path.join(standaloneBase, 'code', 'runs');
    if (fs.existsSync(path.join(nestedPath, 'server.js'))) {
        targetDir = nestedPath;
        console.log(`Detected server.js at fallback path: ${targetDir}`);
    } else {
        console.warn('Warning: server.js not found in standalone folder. Using base.');
        targetDir = standaloneBase;
    }
} else {
    console.log(`Detected server.js at: ${targetDir}`);
}

// 2. Cleanup release folder from standalone if it exists
// (It might be copied if it existed in project root during build)
const releaseInStandalone = path.join(targetDir, 'release');
removeRecursiveSync(releaseInStandalone);

// 3. Copy static assets
const staticSrc = path.join(projectRoot, '.next', 'static');
const staticDest = path.join(targetDir, '.next', 'static');
const publicSrc = path.join(projectRoot, 'public');
const publicDest = path.join(targetDir, 'public');

if (fs.existsSync(staticSrc)) {
    console.log(`Copying static assets from ${staticSrc} to ${staticDest}`);
    copyRecursiveSync(staticSrc, staticDest);
} else {
    console.warn(`Warning: Static source not found at ${staticSrc}`);
}

if (fs.existsSync(publicSrc)) {
    console.log(`Copying public assets from ${publicSrc} to ${publicDest}`);
    copyRecursiveSync(publicSrc, publicDest);
} else {
    console.warn(`Warning: Public source not found at ${publicSrc}`);
}

console.log('Standalone preparation complete.');
