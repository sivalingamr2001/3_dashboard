const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Hardcoded path based on your image and structure
const PROJECT_ROOT = 'D:\\New Workspace\\3_Dashboard\\client';
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

function findUnusedAndEmptyFiles() {
  const allFiles = getFiles(SRC_DIR);
  const emptyFiles = [];
  const potentiallyUnused = [];
  
  // 1. Separate completely empty files first (0 bytes)
  const nonFolderFiles = allFiles.filter(f => {
    const stats = fs.statSync(f);
    if (stats.size === 0) {
      emptyFiles.push(f);
      return false; // Skip empty files from dependency checking
    }
    return true;
  });

  // 2. Mark main entry points as "used"
  const usedFiles = new Set(nonFolderFiles.filter(f => 
    /index|App|main|vite-env/i.test(f)
  ));
  
  const fileContents = nonFolderFiles.reduce((acc, f) => {
    acc[f] = fs.readFileSync(f, 'utf8');
    return acc;
  }, {});

  let changed = true;
  while (changed) {
    changed = false;
    nonFolderFiles.forEach(file => {
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

  // Files that are not empty, but are not used
  const unusedFiles = nonFolderFiles.filter(f => !usedFiles.has(f));

  return { emptyFiles, unusedFiles };
}

// Recursively finds all empty directories under a target folder
function findEmptyFolders(dir, emptyFolders = []) {
  if (!fs.existsSync(dir)) return emptyFolders;

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      findEmptyFolders(name, emptyFolders);
    }
  });

  if (fs.readdirSync(dir).length === 0) {
    emptyFolders.push(dir);
  }

  return emptyFolders;
}

async function main() {
  console.log(`--- Analyzing: ${SRC_DIR} ---`);

  if (!fs.existsSync(SRC_DIR)) {
    console.error('Error: Source folder not found. Please check the PROJECT_ROOT path.');
    return;
  }

  const { emptyFiles, unusedFiles } = findUnusedAndEmptyFiles();
  
  // Combine all files targeted for deletion to predict folder structures
  const filesToDelete = new Set([...emptyFiles, ...unusedFiles]);

  function predictEmptyFolders(dir, emptyFolders = []) {
    const files = fs.readdirSync(dir);
    let absoluteRemainingCount = 0;

    files.forEach(file => {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        predictEmptyFolders(name, emptyFolders);
        if (!emptyFolders.includes(name)) absoluteRemainingCount++;
      } else {
        if (!filesToDelete.has(name)) absoluteRemainingCount++;
      }
    });

    if (absoluteRemainingCount === 0) {
      emptyFolders.push(dir);
    }
    return emptyFolders;
  }

  const unusedFolders = predictEmptyFolders(SRC_DIR).filter(dir => dir !== SRC_DIR);

  if (emptyFiles.length === 0 && unusedFiles.length === 0 && unusedFolders.length === 0) {
    console.log('✨ No empty files, unused files, or empty folders found.');
    return;
  }

  if (emptyFiles.length > 0) {
    console.log(`\nFound ${emptyFiles.length} empty files (0 bytes):`);
    emptyFiles.forEach(f => console.log(`- [Empty File] ${path.relative(PROJECT_ROOT, f)}`));
  }

  if (unusedFiles.length > 0) {
    console.log(`\nFound ${unusedFiles.length} potentially unused files:`);
    unusedFiles.forEach(f => console.log(`- [Unused File] ${path.relative(PROJECT_ROOT, f)}`));
  }

  if (unusedFolders.length > 0) {
    console.log(`\nFound ${unusedFolders.length} folders that will become empty:`);
    unusedFolders.forEach(d => console.log(`- [Empty Folder] ${path.relative(PROJECT_ROOT, d)}`));
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  rl.question('\nDelete all listed files and empty folders? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      // 1. Delete all target files (empty and unused)
      filesToDelete.forEach(f => {
        fs.unlinkSync(f);
        console.log(`Deleted File: ${path.relative(PROJECT_ROOT, f)}`);
      });

      // 2. Delete empty folders using a bottom-up cleanup approach
      const actualEmptyFolders = findEmptyFolders(SRC_DIR).filter(dir => dir !== SRC_DIR);
      actualEmptyFolders.forEach(d => {
        fs.rmdirSync(d);
        console.log(`Deleted Folder: ${path.relative(PROJECT_ROOT, d)}`);
      });

      console.log('\nCleanup complete.');
    } else {
      console.log('\nOperation cancelled. No files or folders were deleted.');
    }
    rl.close();
  });
}

main();
