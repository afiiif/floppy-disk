import { readdir, readFile, writeFile } from 'node:fs/promises';

import { join } from 'path';

if (process.env.PREACT !== 'true') process.exit();

const reactFilesPath = './src/react';
const preactFilesPath = './src/preact';

async function copyAndReplace() {
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
            "import React, { createContext, ReactNode, useContext, useState } from 'react';",
            `import { ComponentChildren, createContext } from 'preact';
             import { useContext, useState } from 'preact/hooks';`,
          )
          .replace('ReactNode', 'ComponentChildren')
          .replace('return <Context.Provider', '// @ts-ignore\nreturn <Context.Provider')
          .replace(/from 'react'/g, "from 'preact/hooks'");

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
