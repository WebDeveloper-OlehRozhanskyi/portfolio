import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { gzipSync } from 'zlib'

const defaultOptions = {
 include: /\.html$/,
 formats: ['avif', 'webp'],
 quality: 70,
 outputDir: '/assets/images',
 defaultSizes: '(min-width: %widthpx) %widthpx, 100vw',
 isRetinaSupport: true,
 lazyLoading: true,
 isDebugMode: false,
}

const colors = {
 reset: '\x1b[0m',
 bold: '\x1b[1m',
 dim: '\x1b[2m',
 green: '\x1b[32m',
 blue: '\x1b[34m',
 cyan: '\x1b[36m',
 magenta: '\x1b[35m',
 yellow: '\x1b[33m',
 white: '\x1b[37m',
 gray: '\x1b[90m',
}

const imageColors = [
 colors.cyan,
 colors.yellow,
 colors.blue,
 colors.magenta,
 colors.green,
 colors.white,
]

export function imgToPicture(userOptions = {}) {
 const options = { ...defaultOptions, ...userOptions }

 if (options.quality < 1 || options.quality > 100) {
  throw new Error('Quality must be between 1 and 100')
 }

 let config
 const processedImages = []
 const processedPartials = []
 const imageStats = []
 const imageCache = new Map()
 const imageMetadataCache = new Map()
 const imageColorMap = new Map()

 const getColorForImage = baseName => {
  if (!imageColorMap.has(baseName)) {
   const colorIndex = imageColorMap.size % imageColors.length
   imageColorMap.set(baseName, imageColors[colorIndex])
  }

  return imageColorMap.get(baseName)
 }

 // sizes виймаємо окремо: якщо він є в <img>, використовуємо його
 // замість defaultSizes і НЕ дублюємо в otherAttributes
 const extractAttributes = imgTag => {
  const attributes = {}
  // [\w-]: без дефіса aria-hidden обрізався до hidden і ховав картинку.
  // \2: значення закінчується тією ж лапкою, якою почалось (Oleh's)
  const attrRegex = /([\w-]+)=(["'])([\s\S]*?)\2/g
  let attrMatch

  while ((attrMatch = attrRegex.exec(imgTag)) !== null) {
   const [, key, , value] = attrMatch

   if (!['src', 'alt', 'sizes'].includes(key)) {
    attributes[key] = value
   }
  }

  return attributes
 }

 const extractSizes = imgTag => {
  const sizesMatch = imgTag.match(/sizes=["']([^"']*)["']/)
  return sizesMatch ? sizesMatch[1] : null
 }

 const getImageMetadata = async imagePath => {
  if (imageMetadataCache.has(imagePath)) {
   return imageMetadataCache.get(imagePath)
  }

  const metadata = await sharp(imagePath).metadata()
  const aspectRatio = metadata.height / metadata.width
  const metadataObj = {
   width: metadata.width,
   height: metadata.height,
   aspectRatio,
   isPortrait: metadata.height > metadata.width,
  }

  imageMetadataCache.set(imagePath, metadataObj)
  return metadataObj
 }

 const getImageHash = async imagePath => {
  const buffer = await fs.readFile(imagePath)
  return createHash('sha256').update(buffer).digest('hex').slice(0, 8)
 }

 const calculateHeight = (width, aspectRatio) => {
  return Math.round(width * aspectRatio)
 }

 const formatFileSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
 }

 const getGzipSize = buffer => {
  try {
   const compressed = gzipSync(buffer)
   return compressed.length
  } catch {
   return 0
  }
 }

 const resolveImagePath = (src, baseDir) => {
  const projectRoot = path.resolve(config.root, '..')

  if (src.startsWith('/')) {
   return path.resolve(projectRoot, 'src', src.slice(1))
  } else {
   return path.resolve(baseDir, src)
  }
 }

 const generateImageVariants = async (imagePath, baseName, ext, metadata) => {
  const variants = []
  const formatTasks = []
  const baseWidth = options.isRetinaSupport
   ? Math.round(metadata.width / 2)
   : metadata.width

  for (const format of [...options.formats, ext]) {
   formatTasks.push(
    (async () => {
     const targetHeight = calculateHeight(baseWidth, metadata.aspectRatio)
     const outputFilename = `${baseName}.${format}`
     // густина в ключі: без неї при isRetinaSupport:false
     // ключі 1x і 2x збігаються і перетирають один одного
     const cacheKey = `${imagePath}-${baseWidth}-${format}-1x`

     if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey)
     }

     let buffer
     try {
      buffer = await sharp(imagePath)
       .resize({
        width: baseWidth,
        height: targetHeight,
        withoutEnlargement: true,
        fit: 'inside',
       })
       .toFormat(format, {
        quality: options.quality,
       })
       .toBuffer()
     } catch (error) {
      console.warn(`Failed to process ${outputFilename}:`, error.message)
      return null
     }

     const resizedMetadata = await sharp(buffer).metadata()

     const variant = {
      buffer,
      finalPath: `${options.outputDir}/${outputFilename}`,
      targetWidth: baseWidth,
      width: resizedMetadata.width,
      height: resizedMetadata.height,
      format,
      density: '1x',
      aspectRatio: resizedMetadata.height / resizedMetadata.width,
      baseName: baseName,
     }

     imageCache.set(cacheKey, variant)

     if (options.isDebugMode) {
      console.log(
       `Generated ${outputFilename} (${variant.width}x${variant.height})`
      )
     }

     return variant
    })()
   )

   if (options.isRetinaSupport) {
    formatTasks.push(
     (async () => {
      const outputFilename = `${baseName}@2x.${format}`
      const cacheKey = `${imagePath}-${metadata.width}-${format}-2x`

      if (imageCache.has(cacheKey)) {
       return imageCache.get(cacheKey)
      }

      let buffer
      try {
       if (format === ext) {
        buffer = await fs.readFile(imagePath)
       } else {
        buffer = await sharp(imagePath)
         .toFormat(format, {
          quality: options.quality,
         })
         .toBuffer()
       }
      } catch (error) {
       console.warn(`Failed to process ${outputFilename}:`, error.message)
       return null
      }

      const variant = {
       buffer,
       finalPath: `${options.outputDir}/${outputFilename}`,
       targetWidth: metadata.width,
       width: metadata.width,
       height: metadata.height,
       format,
       density: '2x',
       aspectRatio: metadata.aspectRatio,
       baseName: baseName,
      }

      imageCache.set(cacheKey, variant)

      if (options.isDebugMode) {
       console.log(
        `Using original as 2x: ${outputFilename} (${variant.width}x${variant.height})`
       )
      }

      return variant
     })()
    )
   }
  }

  const results = await Promise.allSettled(formatTasks)

  results.forEach(result => {
   if (result.status === 'fulfilled' && result.value) {
    variants.push(result.value)
   } else if (options.isDebugMode && result.status === 'rejected') {
    console.warn('Failed to generate variant:', result.reason)
   }
  })

  return variants
 }

 const processImagesInContent = async (content, baseDir, fileId) => {
  const imgRegex = /<img[^>]+src="([^">]+\.(jpg|jpeg|png))"[^>]*>/gi
  let modifiedContent = content
  let hasChanges = false

  if (baseDir.includes('partials')) {
   baseDir = baseDir.replace('partials', '')
  }

  const matches = []
  let match
  while ((match = imgRegex.exec(content)) !== null) {
   matches.push(match)
  }

  if (matches.length > 0 && options.isDebugMode) {
   console.log(`Found ${matches.length} images in ${path.basename(fileId)}`)
  }

  for (const match of matches) {
   const [fullMatch, src, originalExt] = match

   if (
    src.startsWith('http') ||
    src.startsWith('data:') ||
    src.startsWith('/')
   ) {
    continue
   }

   try {
    const imagePath = resolveImagePath(src, baseDir)

    try {
     await fs.access(imagePath)
    } catch {
     if (options.isDebugMode) {
      console.warn(`Image file not found: ${imagePath}`)
     }
     continue
    }

    const metadata = await getImageMetadata(imagePath)
    const baseWidth = options.isRetinaSupport
     ? Math.round(metadata.width / 2)
     : metadata.width
    // хеш вмісту в назві: однойменні картинки з різних папок не перетирають
    // одна одну, а оновлений файл отримує нову адресу й не береться з кешу
    const imageName = path.basename(src, path.extname(src))
    const imageHash = await getImageHash(imagePath)
    const imageBaseName = `${imageName}-${imageHash}`

    const variants = await generateImageVariants(
     imagePath,
     imageBaseName,
     originalExt,
     metadata
    )
    processedImages.push(...variants)

    variants.forEach(variant => {
     const size = variant.buffer.length
     const gzipSize = getGzipSize(variant.buffer)
     imageStats.push({
      path: variant.finalPath,
      size,
      gzipSize,
      format: variant.format,
      density: variant.density,
      baseName: variant.baseName,
     })
    })

    const formatGroups = {}
    variants.forEach(variant => {
     if (!formatGroups[variant.format]) {
      formatGroups[variant.format] = []
     }
     formatGroups[variant.format].push(variant)
    })

    // sort потребує ДВА аргументи (a, b) — порівняння пари.
    // Було: sort(a => ...) — результат не залежав від b, порядок випадковий
    Object.values(formatGroups).forEach(group => {
     group.sort(
      (a, b) => (a.density === '1x' ? 0 : 1) - (b.density === '1x' ? 0 : 1)
     )
    })

    const altMatch = fullMatch.match(/alt="([^"]*)"/)
    const alt = altMatch ? altMatch[1] : ''
    const originalAttributes = extractAttributes(fullMatch)
    const otherAttributes = Object.entries(originalAttributes)
     .map(([key, value]) => `${key}="${value}"`)
     .join(' ')

    // sizes із самого <img> має пріоритет над defaultSizes
    const customSizes = extractSizes(fullMatch)
    const sizesValue =
     customSizes ||
     options.defaultSizes.replaceAll('%width', baseWidth.toString())

    const originalFormatVariants = formatGroups[originalExt] || []
    const imgSrcVariant =
     originalFormatVariants.find(v => v.density === '1x') ||
     originalFormatVariants[0]

    // finalPath відносний до dist, тому в HTML додаємо base (напр. /portfolio/)
    const toUrl = finalPath => `${config.base.replace(/\/$/, '')}${finalPath}`

    const sourceTags = []
    for (const format of options.formats) {
     if (formatGroups[format]) {
      const formatVariants = formatGroups[format]
      const srcset = formatVariants
       .map(v => `${toUrl(v.finalPath)} ${v.density}`)
       .join(', ')
      sourceTags.push(
       `<source type="image/${format}" srcset="${srcset}" sizes="${sizesValue}">`
      )
     }
    }

    const originalSrcset = originalFormatVariants
     .map(variant => `${toUrl(variant.finalPath)} ${variant.density}`)
     .join(', ')

    const imgAttributes = [
     `src="${imgSrcVariant ? toUrl(imgSrcVariant.finalPath) : src}"`,
     originalSrcset ? `srcset="${originalSrcset}"` : '',
     `sizes="${sizesValue}"`,
     'decoding="async"',
     // loading із самого <img> має пріоритет: він уже є в otherAttributes.
     // Інакше атрибутів буде два, а браузер бере перший — плагінний
     'loading' in originalAttributes
      ? ''
      : `loading="${options.lazyLoading ? 'lazy' : 'eager'}"`,
     `alt="${alt}"`,
     otherAttributes,
    ]
     .filter(Boolean)
     .join(' ')

    const pictureHtml = `<picture>${sourceTags.join('')}<img ${imgAttributes}></picture>`

    modifiedContent = modifiedContent.replace(fullMatch, pictureHtml)
    hasChanges = true
   } catch (error) {
    if (options.isDebugMode) {
     console.warn(`Skipping image ${src}: ${error.message}`)
    }
   }
  }

  return hasChanges ? modifiedContent : content
 }

 const processPartials = async (content, baseDir) => {
  const loadRegex = /<load\s+src="([^"]+\.html)"\s*\/>/gi
  let modifiedContent = content
  let hasChanges = false

  let match
  while ((match = loadRegex.exec(content)) !== null) {
   const [fullMatch, partialPath] = match

   if (processedPartials.includes(partialPath)) {
    continue
   }

   try {
    const partialFilePath = resolveImagePath(partialPath, baseDir)

    try {
     await fs.access(partialFilePath)
    } catch {
     if (options.isDebugMode) {
      console.warn(`Partial file not found: ${partialFilePath}`)
     }
     continue
    }

    const partialContent = await fs.readFile(partialFilePath, 'utf-8')

    // третій аргумент прибрано — функція приймає лише (content, baseDir)
    const processedPartial = await processPartials(
     partialContent,
     path.dirname(partialFilePath)
    )
    const finalPartial = await processImagesInContent(
     processedPartial,
     path.dirname(partialFilePath),
     partialFilePath
    )

    modifiedContent = modifiedContent.replace(fullMatch, finalPartial)
    hasChanges = true
    processedPartials.push(partialPath)

    if (options.isDebugMode) {
     console.log(`Processed partial: ${partialPath}`)
    }
   } catch (error) {
    if (options.isDebugMode) {
     console.warn(`Error processing partial ${partialPath}:`, error.message)
    }
   }
  }

  return hasChanges ? modifiedContent : content
 }

 return {
  name: 'vite-plugin-html-img-to-picture',

  async configResolved(resolvedConfig) {
   config = resolvedConfig

   if (options.isDebugMode) {
    console.log(`${colors.bold}HTML Image Converter ${colors.reset}initialized`)
   }
  },

  async transform(code, id) {
   if (!options.include.test(id)) return null
   if (id.includes('node_modules')) return null

   try {
    const baseDir = path.dirname(id)

    let processedContent = await processPartials(code, baseDir)
    processedContent = await processImagesInContent(
     processedContent,
     baseDir,
     id
    )

    if (processedContent !== code) {
     return {
      code: processedContent,
      map: null,
     }
    }

    return null
   } catch (error) {
    console.error('Error in vite-html-image-optimizer:', error)
    return null
   }
  },

  async writeBundle() {
   const distDir = path.resolve(config.root, config.build.outDir)

   if (processedImages.length > 0) {
    console.log(`Writing ${processedImages.length} optimized images to dist...`)
   }

   for (const image of processedImages) {
    try {
     const destPath = path.join(distDir, image.finalPath)
     await fs.mkdir(path.dirname(destPath), { recursive: true })
     await fs.writeFile(destPath, image.buffer)
    } catch (error) {
     console.warn(`Failed to write image ${image.finalPath}:`, error.message)
    }
   }
  },

  async closeBundle() {
   if (imageStats.length > 0) {
    console.log('\nOptimized images:')

    const maxPathLength = Math.max(...imageStats.map(stat => stat.path.length))
    const maxSizeLength = Math.max(
     ...imageStats.map(stat => formatFileSize(stat.size).length)
    )

    imageStats.sort((a, b) => a.baseName.localeCompare(b.baseName))

    imageStats.forEach(stat => {
     const sizeFormatted = formatFileSize(stat.size)
     const gzipFormatted = formatFileSize(stat.gzipSize)
     const pathPadding = ' '.repeat(maxPathLength - stat.path.length)
     const sizePadding = ' '.repeat(maxSizeLength - sizeFormatted.length)
     const imageColor = getColorForImage(stat.baseName)

     console.log(
      `${colors.gray}../dist${colors.reset}` +
       `${imageColor}${stat.path}${colors.reset}` +
       `${pathPadding}  ` +
       `${colors.dim}${sizePadding}${colors.bold}${sizeFormatted}${colors.reset}${colors.dim} │ gzip: ${gzipFormatted}${colors.reset}`
     )
    })
    console.log('')
   }

   imageCache.clear()
   imageMetadataCache.clear()
   imageColorMap.clear()
  },
 }
}
