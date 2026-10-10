// Під час збірки замінює <img src="*.jpg|png"> на <picture> з avif/webp.
// Розмір показу береться з атрибута width (CSS px), тож нічого не треба
// перераховувати, коли міняються картинки чи верстка:
// - файли: ширина показу і подвоєна (для retina), але не більші за джерело;
// - lazy-картинки: sizes="auto" — браузер сам бере ширину слота з верстки;
// - eager-картинки (перший екран): 1x/2x, бо auto дозволений лише з lazy.
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

const defaults = {
 formats: ['avif', 'webp'],
 quality: 70,
 outputDir: 'assets/images',
}

export function imgToPicture(userOptions = {}) {
 const options = { ...defaults, ...userOptions }
 // джерело → варіанти: картинку з кількох сторінок обробляємо й пишемо один раз
 const cache = new Map()
 let base = '/'
 let outDir = 'dist'

 const makeVariants = async (filePath, displayWidth) => {
  const key = `${filePath}|${displayWidth}`
  if (cache.has(key)) return cache.get(key)

  const source = await fs.readFile(filePath)
  const { width: sourceWidth } = await sharp(source).metadata()
  const fileName = path.basename(filePath)

  if (!displayWidth) {
   console.warn(
    `⚠ ${fileName}: немає атрибута width — вважаю файл удвічі більшим за показ`
   )
  }
  // floor: для непарної ширини файлу (463px) подвоєний показ не перевищить файл
  const display = displayWidth || Math.floor(sourceWidth / 2)
  const widths = [
   ...new Set([display, display * 2].map(w => Math.min(w, sourceWidth))),
  ]

  if (sourceWidth < display * 2) {
   console.warn(
    `⚠ ${fileName}: файл ${sourceWidth}px, показ ${display}px — для retina потрібно ${display * 2}px`
   )
  }

  const ext = path.extname(filePath).slice(1).toLowerCase()
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 8)
  const name = `${path.basename(filePath, path.extname(filePath))}-${hash}`

  const variants = []
  for (const format of [...options.formats, ext]) {
   for (const width of widths) {
    const buffer = await sharp(source)
     .resize({ width, withoutEnlargement: true })
     .toFormat(format, { quality: options.quality })
     .toBuffer()
    variants.push({
     format,
     width,
     buffer,
     file: `${options.outputDir}/${name}-${width}.${format}`,
    })
   }
  }

  const result = { display, ext, variants }
  cache.set(key, result)
  return result
 }

 const buildPicture = (tag, { display, ext, variants }) => {
  const url = file => `${base}${file}`
  const isEager = /\sloading=["']eager["']/.test(tag)
  const ownSizes = tag.match(/\ssizes=["']([^"']*)["']/)?.[1]
  const sizes = isEager
   ? ''
   : ownSizes || `auto, (min-width: ${display}px) ${display}px, 100vw`

  // lazy: w-дескриптори + sizes; eager: густина (1x/2x) без sizes
  const srcset = format =>
   variants
    .filter(v => v.format === format)
    .map(
     v =>
      `${url(v.file)} ${isEager ? `${+(v.width / display).toFixed(2)}x` : `${v.width}w`}`
    )
    .join(', ')
  const sizesAttr = sizes ? ` sizes="${sizes}"` : ''

  const sources = options.formats
   .map(f => `<source type="image/${f}" srcset="${srcset(f)}"${sizesAttr}>`)
   .join('')

  // решту атрибутів <img> (alt, class, width, height, loading...) лишаємо як є
  const rest = tag
   .replace(/^<img/, '')
   .replace(/\/?>$/, '')
   .replace(/\s(src|srcset|sizes)=(["'])[\s\S]*?\2/g, '')
   .replace(/\s+/g, ' ')
   .trim()
  const fallback = variants.find(v => v.format === ext)
  const imgAttributes = [
   `src="${url(fallback.file)}"`,
   `srcset="${srcset(ext)}"`,
   sizes && `sizes="${sizes}"`,
   !/\sloading=/.test(tag) && 'loading="lazy"',
   !/\sdecoding=/.test(tag) && 'decoding="async"',
   rest,
  ]
   .filter(Boolean)
   .join(' ')

  return `<picture>${sources}<img ${imgAttributes}></picture>`
 }

 return {
  name: 'html-img-to-picture',
  apply: 'build',

  configResolved(config) {
   base = config.base
   outDir = path.resolve(config.root, config.build.outDir)
  },

  async transform(html, id) {
   if (!id.endsWith('.html')) return null

   const tags = html.match(
    /<img\s[^>]*\ssrc=["'](?!https?:|data:|\/)[^"']+\.(?:jpe?g|png)["'][^>]*>/gi
   )
   if (!tags) return null

   for (const tag of tags) {
    const src = tag.match(/\ssrc=["']([^"']+)["']/)[1]
    const displayWidth = Number(tag.match(/\swidth=["'](\d+)["']/)?.[1]) || 0
    const data = await makeVariants(
     path.resolve(path.dirname(id), src),
     displayWidth
    )
    html = html.replace(tag, buildPicture(tag, data))
   }

   return { code: html, map: null }
  },

  async writeBundle() {
   const all = [...cache.values()].flatMap(r => r.variants)
   for (const v of all) {
    const dest = path.join(outDir, v.file)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, v.buffer)
   }
   const kib = all.reduce((sum, v) => sum + v.buffer.length, 0) / 1024
   console.log(
    `html-img-to-picture: ${cache.size} картинок → ${all.length} файлів, ${kib.toFixed(0)} KiB`
   )
  },

  // у режимі --watch оновлена картинка інакше бралася б зі старого кешу
  closeBundle() {
   cache.clear()
  },
 }
}
