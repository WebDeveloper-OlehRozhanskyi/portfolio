import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import globals from 'globals'

export default [
 {
  ignores: [
   '**/node_modules/**',
   '**/dist/**',
   '**/public/**',
   '**/project_info/**',
  ],
 },

 js.configs.recommended,

 // Основні правила для JS/TS файлів (додаси TS за потреби)
 {
  files: ['**/*.{js,mjs,cjs}'],
  languageOptions: {
   ecmaVersion: 'latest',
   sourceType: 'module',
   globals: { ...globals.browser, ...globals.node },
  },
  rules: {
   eqeqeq: ['error', 'always'],
   camelcase: ['error', { properties: 'never', ignoreDestructuring: true }],
  },
 },

 // Має бути останнім: вимикає правила, що конфліктують із Prettier
 eslintConfigPrettier,
]
