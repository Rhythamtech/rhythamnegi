const fs = require('fs');
const path = require('path');

const contentDir = '/Users/rhythamnegi/Code/rhythamnegi/src/content/';

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath);
    } else if (file === 'index.md') {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('coverImage:')) {
        content = content.replace(/coverImage: "(.*?)\.png"/g, 'coverImage: "$1.svg"');
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
      }
    }
  });
}

walkDir(contentDir);
