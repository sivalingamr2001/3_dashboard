const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Hardcoded path based on your image and structure
const PROJECT_ROOT = 'D:\\New Workspace\\3_Dashboard\\client';
//D:\New Workspace\3_Dashboard\client
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Supported React extensions
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'];

function getFiles(dir, allFiles = []) {
  if (!fs.existsSync(dir)) return allFiles;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, allFiles);
    } else if (EXTENSIONS.includes(path.extname(name))) {
      allFiles.push(name);
    }
  });
  return allFiles;
}

function findUnusedFiles() {
  const allFiles = getFiles(SRC_DIR);
  
  // Mark main entry points as "used"
  const usedFiles = new Set(allFiles.filter(f => 
    /index|App|main|vite-env/i.test(f)
  ));
  
  const fileContents = allFiles.reduce((acc, f) => {
    acc[f] = fs.readFileSync(f, 'utf8');
    return acc;
  }, {});

  let changed = true;
  while (changed) {
    changed = false;
    allFiles.forEach(file => {
      if (usedFiles.has(file)) return;
      
      const fileName = path.basename(file, path.extname(file));
      
      // Check if this file is imported/referenced in any "used" file
      const isReferenced = Object.keys(fileContents).some(otherFile => 
        usedFiles.has(otherFile) && fileContents[otherFile].includes(fileName)
      );

      if (isReferenced) {
        usedFiles.add(file);
        changed = true;
      }
    });
  }

  return allFiles.filter(f => !usedFiles.has(f));
}

async function main() {
  console.log(`--- Analyzing: ${SRC_DIR} ---`);

  if (!fs.existsSync(SRC_DIR)) {
    console.error('Error: Source folder not found. Please check the PROJECT_ROOT path.');
    return;
  }

  const unused = findUnusedFiles();

  if (unused.length === 0) {
    console.log('✨ No unused component files found.');
    return;
  }

  console.log(`\nFound ${unused.length} potentially unused files:`);
  unused.forEach(f => console.log(`- ${path.relative(PROJECT_ROOT, f)}`));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  rl.question('\nDelete all listed files? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      unused.forEach(f => {
        fs.unlinkSync(f);
        console.log(`Deleted: ${path.relative(PROJECT_ROOT, f)}`);
      });
      console.log('\nCleanup complete.');
    } else {
      console.log('\nOperation cancelled. No files were deleted.');
    }
    rl.close();
  });
}

main();
