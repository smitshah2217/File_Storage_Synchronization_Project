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

  if (content.includes("from '../types'") || content.includes("from '../../types'")) {
    content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]*types)['"]/g, "import type { $1 } from '$2'");
    updated = true;
  }
  
  if (content.includes('RootState')) {
    content = content.replace(/import\s+{([^}]*RootState[^}]*)}\s+from\s+['"]([^'"]*store)['"]/g, "import type { $1 } from '$2'");
    updated = true;
  }
  
  if (content.includes('PayloadAction')) {
    content = content.replace(/import\s+{\s*createSlice\s*,\s*PayloadAction\s*}\s+from\s+['"]@reduxjs\/toolkit['"]/, "import { createSlice } from '@reduxjs/toolkit';\nimport type { PayloadAction } from '@reduxjs/toolkit'");
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
