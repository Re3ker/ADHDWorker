/**
 * Rendert das App-Icon aus resources/icon/*.svg in alle benötigten Größen.
 * Ausführen mit `npm run icons`; die Ergebnisse werden eingecheckt.
 */
import { Resvg } from "@resvg/resvg-js"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const large = readFileSync(resolve(root, "resources/icon/icon.svg"), "utf8")
const small = readFileSync(
  resolve(root, "resources/icon/icon-small.svg"),
  "utf8"
)

function png(svg: string, size: number) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng()
}

/** ICO mit PNG-Einträgen (32-bit RGBA, Windows Vista+). */
function ico(images: Array<{ size: number; data: Buffer }>) {
  const header = Buffer.alloc(6 + images.length * 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt8(0, entry + 2)
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map((image) => image.data)])
}

const icoImages = [16, 24, 32, 48, 64, 128, 256].map((size) => ({
  size,
  data: png(size <= 32 ? small : large, size),
}))

writeFileSync(resolve(root, "resources/icon/icon.ico"), ico(icoImages))
writeFileSync(resolve(root, "public/app-icon.png"), png(large, 512))
writeFileSync(resolve(root, "public/tray-icon.png"), png(small, 32))
writeFileSync(
  resolve(root, "src/renderer/assets/app-icon.png"),
  png(large, 256)
)
console.log("Icons erzeugt.")
