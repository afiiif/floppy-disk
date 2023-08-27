import { readdir, readFile, writeFile } from 'node:fs/promises';

import { extname, join } from 'path';

const reactFilesPath = './src/react';
const preactFilesPath = './src/preact';

async function copyAndReplace() {
  try {
    const files = await readdir(reactFilesPath);

    // Filter out only .ts files
    const tsFiles = files.filter((file) => extname(file) === '.ts');

    // Copy and replace in each file
    await Promise.all(
      tsFiles.map(async (tsFile) => {
        const reactFilePath = join(reactFilesPath, tsFile);
        const preactFilePath = join(preactFilesPath, tsFile);

        // Read the content of the React file
        const data = await readFile(reactFilePath, 'utf8');

        // Replace "from 'react'" with "from 'preact/hooks'"
        const replacedContent = data.replace(/from 'react'/g, "from 'preact/hooks'");

        // Write the modified content to the Preact file
        await writeFile(preactFilePath, replacedContent, 'utf8');
        console.log(`Copied and replaced in ${preactFilePath}`);
      }),
    );

    console.log('All files copied and replaced successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

copyAndReplace();
