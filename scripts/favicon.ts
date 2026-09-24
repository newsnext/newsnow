import fs from "node:fs"

import { fileURLToPath } from "node:url"
import { join } from "node:path"
import { Buffer } from "node:buffer"
import { consola } from "consola"
import { originSources } from "../shared/pre-sources"

const projectDir = fileURLToPath(new URL("..", import.meta.url))
const iconsDir = join(projectDir, "public", "icons")
async function downloadImage(url: string, outputPath: string, id: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${id}: could not fetch ${url}, status: ${response.status}`)
    }

    const image = await (await fetch(url)).arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(image))
    consola.success(`${id}: downloaded successfully.`)
  } catch (error) {
    consola.error(`${id}: error downloading the image. `, error)
  }
}

async function main() {
  await Promise.all(
    Object.entries(originSources).map(async ([id, source]) => {
      try {
        const icon = join(iconsDir, `${id}.png`)
        if (fs.existsSync(icon)) {
          // consola.info(`${id}: icon exists. skip.`)
          return
        }
        if (!source.home) return
        await downloadImage(`https://icons.folo.is/${source.home.replace(/^https?:\/\//, "").replace(/\/$/, "")}`, icon, id)
      } catch (e) {
        consola.error(id, "\n", e)
      }
    }),
  )
}

main()
