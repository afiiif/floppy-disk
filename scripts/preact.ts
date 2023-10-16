import { readdir, readFile, writeFile } from 'node:fs/promises';

import { join } from 'path';
import { format } from 'prettier';

if (process.env.PREACT !== 'true') process.exit();

const reactFilesPath = './src/react';
const preactFilesPath = './src/preact';

const copyAndReplace = async () => {
  try {
    const files = await readdir(reactFilesPath);

    // Copy and replace in each file
    await Promise.all(
      files.map(async (tsFile) => {
        const reactFilePath = join(reactFilesPath, tsFile);
        const preactFilePath = join(preactFilesPath, tsFile);

        // Read the content of the React file
        const data = await readFile(reactFilePath, 'utf8');

        // Replace "from 'react'" with "from 'preact/hooks'"
        const replacedContent = data
          .replace(
            "import { createElement, FunctionComponent, useState } from 'react';",
            `import { h as createElement, FunctionComponent } from 'preact';
             import { useState } from 'preact/hooks';`,
          )
          .replace(
            "import { createContext, createElement, ReactNode, useContext, useState } from 'react';",
            `import { ComponentChildren, createContext, createElement } from 'preact';
             import { useContext, useState } from 'preact/hooks';`,
          )
          .replace('ReactNode', 'ComponentChildren')
          .replace(/from 'react'/g, "from 'preact/hooks'");

        // Write the modified content to the Preact file
        await writeFile(
          preactFilePath,
          await format(replacedContent, {
            parser: 'typescript',
            ...require('../.prettierrc.js'),
          }),
          'utf8',
        );
        console.log(`Copied and replaced in ${preactFilePath}`);
      }),
    );

    console.log('All files copied and replaced successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

const updatePackageJson = async () => {
  const packageJsonContent = await readFile('./package.json', 'utf8');
  const packageJson = JSON.parse(packageJsonContent);
  packageJson.exports['./preact'] = {
    types: './lib/preact/index.d.ts',
    import: {
      types: './esm/preact/index.d.ts',
      default: './esm/preact/index.js',
    },
    module: './esm/preact/index.js',
    default: './lib/preact/index.js',
  };
  await writeFile('./package.json', JSON.stringify(packageJson, null, 2), 'utf8');
};

(async () => {
  await copyAndReplace();
  await updatePackageJson();
})();
