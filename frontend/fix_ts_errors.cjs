const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
      filelist.push(dirFile);
    }
  }
  return filelist;
};

const files = walkSync(path.join(__dirname, 'src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  // Remove unused React import from beginning of files
  if (content.match(/import\s+React\s*,\s*{\s*([^}]+)\s*}\s*from\s+['"]react['"]/)) {
    // Keep React if it's used as React.FC or similar, but the linter complains about it being unused
    // Actually, linter says: 'React' is declared but its value is never read.
    // If it's `import React, { ... }`, we can change it to `import { ... }` if React is unused.
  }
  
  if (content.match(/^import React from ['"]react['"];\r?\n/m)) {
    content = content.replace(/^import React from ['"]react['"];\r?\n/m, '');
    updated = true;
  }
  
  if (file.includes('Sidebar.tsx') || file.includes('Dashboard.tsx') || file.includes('Recent.tsx') || file.includes('SearchResults.tsx') || file.includes('SharedWithMe.tsx') || file.includes('Trash.tsx') || file.includes('AppRoutes.tsx') || file.includes('ProtectedRoute.tsx')) {
    if (content.match(/import React(?:,\s*{(?:[^}]+)})?\s*from\s+['"]react['"];/)) {
      content = content.replace(/import React,\s*{([^}]+)}\s*from\s+['"]react['"];/, "import { $1 } from 'react';");
      content = content.replace(/import React\s*from\s+['"]react['"];\r?\n?/, "");
      updated = true;
    }
  }

  if (file.includes('VersionHistoryModal.tsx')) {
    content = content.replace(/useRef\s*,\s*/, '');
    content = content.replace(/,\s*useRef/, '');
    content = content.replace(/catch \(err\)/, 'catch (err: any)');
    updated = true;
  }
  
  if (file.includes('fileApi.ts')) {
    content = content.replace(/type: response\.headers\['content-type'\] \}\)/g, "type: response.headers['content-type'] as string })");
    updated = true;
  }

  if (file.includes('FileBrowser.tsx')) {
    content = content.replace(/\{ parentFolderId: destinationFolderId \}/g, "destinationFolderId === null ? { moveToRoot: true } : { parentFolderId: destinationFolderId }");
    content = content.replace(/\{ folderId: destinationFolderId \}/g, "destinationFolderId === null ? { moveToRoot: true } : { folderId: destinationFolderId }");
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
