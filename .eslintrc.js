module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  extends: [
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  rules: {
    // Favor const over let
    'prefer-const': 'error',
    // Encourage use of function declarations or arrow functions
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    // Encourage use of arrow functions as callbacks
    'prefer-arrow-callback': 'error',
    // Disallow reassignment of function parameters
    'no-param-reassign': 'error',
    // Encourage use of array methods like map, filter, reduce
    'array-callback-return': 'error',
    // Encourage use of object spread
    'prefer-object-spread': 'error',
    // Encourage use of template literals
    'prefer-template': 'error',
    // Discourage use of var
    'no-var': 'error',
    // Encourage use of optional chaining
    '@typescript-eslint/prefer-optional-chain': 'error',
    // Encourage use of nullish coalescing
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    // Encourage explicit return types on functions and class methods
    '@typescript-eslint/explicit-function-return-type': 'warn',
    // Encourage use of readonly properties
    '@typescript-eslint/prefer-readonly': 'warn',
    // Discourage use of null
    '@typescript-eslint/no-explicit-any': 'error',
    // Encourage use of undefined over null
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'caughtErrorsIgnorePattern': '^_'
    }],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '*.json', '*.js'],
};
