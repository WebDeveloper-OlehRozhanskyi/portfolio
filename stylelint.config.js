/** @type {import('stylelint').Config} */
export default {
 extends: ['stylelint-config-standard-scss'],
 plugins: ['stylelint-scss', 'stylelint-order'],
 rules: {
  'order/properties-order': [
   {
    // 1. Позиціювання
    properties: [
     'position',
     'inset',
     'top',
     'right',
     'bottom',
     'left',
     'z-index',
    ],
   },
   {
    // 2. Блочна модель
    properties: [
     'display',
     'flex',
     'flex-direction',
     'flex-wrap',
     'flex-flow',
     'justify-content',
     'align-items',
     'align-content',
     'place-content',
     'place-items',
     'order',
     'grid',
     'grid-template',
     'grid-template-columns',
     'grid-template-rows',
     'grid-column',
     'grid-row',
     'gap',
     'row-gap',
     'column-gap',
     'overflow',
     'overflow-x',
     'overflow-y',
     'clip-path',
     'visibility',
    ],
   },
   {
    // 3. Розміри
    properties: [
     'width',
     'min-width',
     'max-width',
     'height',
     'min-height',
     'max-height',
     'aspect-ratio',
    ],
   },
   {
    // 4. Відступи
    properties: [
     'margin',
     'margin-top',
     'margin-right',
     'margin-bottom',
     'margin-left',
     'padding',
     'padding-top',
     'padding-right',
     'padding-bottom',
     'padding-left',
    ],
   },
   {
    // 5. Типографіка
    properties: [
     'font',
     'font-family',
     'font-size',
     'font-weight',
     'font-style',
     'line-height',
     'letter-spacing',
     'text-align',
     'text-transform',
     'text-decoration',
     'text-shadow',
     'white-space',
     'color',
    ],
   },
   {
    // 6. Фон, бордери, фігури
    properties: [
     'background',
     'background-color',
     'background-image',
     'background-position',
     'background-repeat',
     'background-size',
     'border',
     'border-width',
     'border-style',
     'border-color',
     'border-radius',
     'outline',
     'box-shadow',
    ],
   },
   {
    // 7. Ефекти
    properties: [
     'opacity',
     'mix-blend-mode',
     'filter',
     'backdrop-filter',
     'transform',
     'transform-origin',
     'transition',
     'animation',
     'cursor',
    ],
   },
   {
    // 8. Інше
    properties: ['content', 'pointer-events', 'user-select'],
   },
  ],
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
