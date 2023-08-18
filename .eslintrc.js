module.exports = {
  extends: ['react-app', 'prettier'],
  plugins: ['simple-import-sort'],
  rules: {
    '@typescript-eslint/no-shadow': 'warn',
    'simple-import-sort/imports': 'error',
    // 'simple-import-sort/exports': 'error',
  },
};
