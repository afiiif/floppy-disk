module.exports = {
  '!((comparison|examples)/**)*.{js,jsx,ts,tsx}': 'eslint --fix --quiet',
  '!((comparison|examples)/**)*.{js,jsx,ts,tsx,css,scss,json,html,md,mdx}': 'prettier --write',
  '!((comparison|examples)/**)*.{ts,tsx}': () => 'tsc --noEmit --skipLibCheck',
};
