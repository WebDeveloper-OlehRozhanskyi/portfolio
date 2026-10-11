import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { imgToPicture as htmlImgToPicture } from './plugins/htmlImgToPicture.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Усі .html у корені — окремі сторінки збірки
const htmlPages = Object.fromEntries(
 fs
  .readdirSync(__dirname)
  .filter(file => file.endsWith('.html'))
  .map(file => [path.basename(file, '.html'), path.resolve(__dirname, file)])
)

export default defineConfig({
 base: '/portfolio/',
 build: {
  assetsDir: 'assets',
  rollupOptions: {
   input: htmlPages,
   output: {
    assetFileNames: assetInfo => {
     const name = assetInfo.name || ''
     const ext = name.split('.').pop()?.toLowerCase() || ''

     if (/(woff2?|ttf|otf|eot)$/i.test(ext)) {
      return 'assets/fonts/[name]-[hash][extname]'
     }

     if (/(png|jpe?g|gif|svg|webp|avif)$/i.test(ext)) {
      return 'assets/images/[name]-[hash][extname]'
     }

     if (/(mp4|webm|ogg|mp3|wav|flac|aac)$/i.test(ext)) {
      return 'assets/media/[name]-[hash][extname]'
     }

     return 'assets/[name]-[hash][extname]'
    },
   },
  },
 },
 resolve: {
  alias: {
   '@': path.resolve(__dirname, './src'),
  },
 },
 css: {
  preprocessorOptions: {
   scss: {
    loadPaths: ['src/scss', 'src/scss/components'],
   },
  },
 },
 plugins: [
  ViteImageOptimizer({
   png: { quality: 70, compressionLevel: 8 },
   jpeg: { quality: 70, progressive: true },
   webp: { quality: 70 },
   avif: { quality: 70 },
   includePublic: false,
  }),
  htmlImgToPicture({
   formats: ['avif', 'webp'],
   // AVIF при тій самій цифрі важчий, тож для нього нижча (див. коментар у плагіні)
   quality: { avif: 50, webp: 75, jpeg: 75, png: 75 },
  }),
  createSvgIconsPlugin({
   iconDirs: [path.resolve(process.cwd(), 'src/images/icons')],
   symbolId: 'icon-[name]',
   svgoOptions: {
    plugins: [
     { name: 'removeDoctype', active: true },
     { name: 'removeXMLProcInst', active: true },
     { name: 'removeComments', active: true },
     { name: 'removeMetadata', active: true },
     { name: 'removeTitle', active: true },
     { name: 'removeDesc', active: true },
     {
      name: 'removeAttrs',
      params: {
       attrs: ['fill', 'stroke', 'style', 'class', 'data-name', 'role'],
      },
     },
     { name: 'removeDimensions', active: true },
     { name: 'removeViewBox', active: false },
     { name: 'convertShapeToPath', active: true },
     { name: 'mergePaths', active: true },
     { name: 'convertColors', params: { currentColor: true } },
     { name: 'cleanupIDs', active: true },
     { name: 'removeUselessDefs', active: true },
    ],
   },
  }),
 ],
})
