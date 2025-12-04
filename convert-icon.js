const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'icon.png');
const outputPath = path.join(__dirname, 'public', 'icon.ico');

pngToIco(inputPath)
    .then(buf => {
        fs.writeFileSync(outputPath, buf);
        console.log('ICO file created successfully!');
    })
    .catch(err => {
        console.error('Error:', err);
    });
