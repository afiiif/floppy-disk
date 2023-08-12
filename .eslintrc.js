module.exports = {
  extends: ['react-app', 'prettier'],
  plugins: ['simple-import-sort'],
  rules: {
    'simple-import-sort/imports': 'error',
    // 'simple-import-sort/exports': 'error',
  },
};
