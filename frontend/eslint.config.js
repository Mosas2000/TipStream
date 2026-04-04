import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { 
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        destructuredArrayIgnorePattern: '^[A-Z_]',
        ignoreRestSiblings: true 
      }],
      // Ban PostConditionMode.Allow — always use Deny with explicit conditions
      'no-restricted-properties': ['error', {
        object: 'PostConditionMode',
        property: 'Allow',
        message: 'Use PostConditionMode.Deny with explicit post conditions. See lib/post-conditions.js.',
      }],
      // Ban direct bypass functions and PostConditionMode['Allow'] string access
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='PostConditionMode'][property.value='Allow']",
          message: 'Use PostConditionMode.Deny with explicit post conditions. See lib/post-conditions.js.',
        },
        {
          selector: "Literal[value='set-paused']",
          message: 'Direct set-paused bypasses the timelock. Use propose-pause-change and execute-pause-change instead.',
        },
        {
          selector: "Literal[value='set-fee-basis-points']",
          message: 'Direct set-fee-basis-points bypasses the timelock. Use propose-fee-change and execute-fee-change instead.',
        },
      ],
    },
  },
  // Test files configuration
  {
    files: ['**/*.test.{js,jsx}', '**/test/**/*.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Node.js scripts configuration
  {
    files: ['scripts/**/*.{js,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
])
