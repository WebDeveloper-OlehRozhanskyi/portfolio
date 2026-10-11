/** @type {import('stylelint').Config} */
export default {
 // recess-order — готовий порядок властивостей (позиціювання → блочна модель → типографіка → вигляд)
 extends: ['stylelint-config-standard-scss', 'stylelint-config-recess-order'],
 rules: {
  // 'scss/dollar-variable-pattern': '^[_]?[a-z][a-zA-Z0-9]*$',
  'selector-class-pattern':
   '^[a-z]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--[a-z0-9-]+)?$',
 },
 ignoreFiles: [
  '**/dist/**',
  '**/node_modules/**',
  '**/project_info/**',
  '**/public/**',
 ],
}
