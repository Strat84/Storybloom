const { createOrGetRepository, commitToRepository } = require('./github.ts');
const fs = require('fs');
const path = require('path');

async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  
  // Skip certain directories and files
  const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'tmp'];
  const skipFiles = ['.env', '.env.local', '.env.production', '.DS_Store'];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          const subFiles = await getAllFiles(fullPath, baseDir);
          files.push(...subFiles);
        }
      } else {
        if (!skipFiles.includes(entry.name) && !entry.name.startsWith('.')) {
          try {
            // Only include text files and certain binary formats
            const content = fs.readFileSync(fullPath, 'utf8');
            files.push({
              path: relativePath.replace(/\\/g, '/'), // Normalize path separators
              content
            });
          } catch (error) {
            // Skip binary files that can't be read as UTF-8
            console.log(`Skipping binary file: ${relativePath}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

async function commitCodebaseToGithub(owner, repoName) {
  try {
    console.log(`Creating or getting repository: ${owner}/${repoName}`);
    
    // Create or get the repository
    const repo = await createOrGetRepository(owner, repoName);
    console.log(`Repository ready: ${repo.html_url}`);
    
    // Get all files from the current directory
    const files = await getAllFiles(process.cwd());
    console.log(`Found ${files.length} files to commit`);
    
    // Commit all files
    const commit = await commitToRepository(
      owner,
      repoName,
      files,
      'Initial commit: StoryMagic children\'s storybook creator with cartoon style selection'
    );
    
    console.log(`Successfully committed to repository: ${commit.html_url}`);
    console.log(`Repository URL: ${repo.html_url}`);
    
  } catch (error) {
    console.error('Error committing to GitHub:', error);
    throw error;
  }
}

module.exports = { commitCodebaseToGithub };