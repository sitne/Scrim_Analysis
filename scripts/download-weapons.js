const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = 'https://valorant-api.com/v1/weapons?language=en-US';
const OUTPUT_DIR = path.join(__dirname, '../public/weapons');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
}

function sanitizeName(name) {
    return name.toLowerCase().replace(/[\s\/]/g, '-').replace(/[^a-z0-9\-]/g, '');
}

async function main() {
    try {
        console.log('Fetching weapon data...');
        const response = await fetch(API_URL);
        const json = await response.json();

        const mapping = {};

        for (const weapon of json.data) {
            const fileName = sanitizeName(weapon.displayName);
            const iconUrl = weapon.killStreamIcon || weapon.displayIcon; // Prefer killStreamIcon (silhouette), fallback to displayIcon

            if (iconUrl) {
                console.log(`Downloading ${weapon.displayName}...`);
                await downloadImage(iconUrl, path.join(OUTPUT_DIR, `${fileName}.png`));
                mapping[weapon.uuid.toLowerCase()] = {
                    name: weapon.displayName,
                    fileName: fileName
                };
            }
        }

        const constantFileContent = `
// This file is auto-generated
export const WEAPON_MAP: Record<string, { name: string; fileName: string }> = ${JSON.stringify(mapping, null, 4)};
`;

        fs.writeFileSync(path.join(__dirname, '../src/lib/weapon-constants.ts'), constantFileContent);
        console.log('Done! Mapping saved to src/lib/weapon-constants.ts');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
