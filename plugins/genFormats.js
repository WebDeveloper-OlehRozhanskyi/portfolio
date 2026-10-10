// Створює 1x з @2x і конвертує у webp/avif для 1x і 2x
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const ROOT = path.resolve('src/images/background') // за потреби змінюй
const exts = new Set(['.jpg', '.jpeg', '.png'])
const WEBP_QUALITY = 80
const AVIF_QUALITY = 80

async function exists(p) {
 try {
  await fs.stat(p)
  return true
 } catch {
  return false
 }
}

async function* walk(dir) {
 for (const e of await fs.readdir(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name)
  if (e.isDirectory()) yield* walk(p)
  else yield p
 }
}

async function makeWebpAvif(srcNoExt) {
 const pairs = [
  { suf: '', inExts: ['.jpg', '.jpeg', '.png'] }, // 1x
  { suf: '@2x', inExts: ['.jpg', '.jpeg', '.png'] }, // 2x
 ]

 for (const { suf, inExts } of pairs) {
  const input = (
   await Promise.all(
    inExts.map(async ext => {
     const p = `${srcNoExt}${suf}${ext}`
     return (await exists(p)) ? p : null
    })
   )
  ).find(Boolean)

  if (!input) continue // немає такого розміру — пропускаємо

  const webpOut = `${srcNoExt}${suf}.webp`
  const avifOut = `${srcNoExt}${suf}.avif`

  if (!(await exists(webpOut))) {
   await sharp(input).webp({ quality: WEBP_QUALITY }).toFile(webpOut)
   console.log('webp:', path.relative('src', webpOut))
  }
  if (!(await exists(avifOut))) {
   await sharp(input).avif({ quality: AVIF_QUALITY }).toFile(avifOut)
   console.log('avif:', path.relative('src', avifOut))
  }
 }
}

;(async () => {
 if (!(await exists(ROOT))) {
  console.log('skip: no', path.relative('src', ROOT))
  return
 }
 for await (const file of walk(ROOT)) {
  const ext = path.extname(file).toLowerCase()
  if (!exts.has(ext)) continue

  // працюємо лише з @2x-джерелами
  const is2x = /@2x\.[^.]+$/.test(file)
  if (!is2x) continue

  const base2xNoExt = file.slice(0, -ext.length) // .../name@2x
  const baseNoExt = base2xNoExt.replace(/@2x$/, '') // .../name

  // якщо 1x.jpg/png немає — створюємо з @2x (50% по ширині)
  const out1xJpg = `${baseNoExt}.jpg`
  const out1xPng = `${baseNoExt}.png`
  const has1x = (await exists(out1xJpg)) || (await exists(out1xPng))

  if (!has1x) {
   const meta = await sharp(file).metadata()
   const newW = meta.width ? Math.max(1, Math.round(meta.width / 2)) : undefined
   await sharp(file)
    .resize({ width: newW })
    .jpeg({ quality: 80 })
    .toFile(out1xJpg)
   console.log('1x jpg:', path.relative('src', out1xJpg))
  }

  // конвертуємо у webp/avif для 1x і 2x
  await makeWebpAvif(baseNoExt)
 }
})()
