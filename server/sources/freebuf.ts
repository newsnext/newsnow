import process from "node:process"
import { XMLParser } from "fast-xml-parser"
import type { NewsItem } from "@shared/types"

interface RSSItem {
  title?: string
  link?: string
  description?: string
  pubDate?: string
  guid?: string | {
    "#text"?: string
    "$text"?: string
  }
}

async function fetchByCurl(url: string) {
  if (process.env.CF_PAGES) return ""

  try {
    const { execFile } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const execFileAsync = promisify(execFile)
    const { stdout } = await execFileAsync("curl", [
      "-L",
      "--max-time",
      "15",
      "-A",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      url,
    ], {
      maxBuffer: 1024 * 1024,
    })
    return stdout
  } catch {
    return ""
  }
}

function getText(value: any) {
  if (!value) return ""
  if (typeof value === "string") return value
  return value["#text"] || value.$text || ""
}

export default defineSource(async () => {
  const url = "https://www.freebuf.com/feed"
  const xmlText = await myFetch<string>(url, {
    responseType: "text" as any,
  }).catch(() => fetchByCurl(url))

  if (!xmlText) throw new Error("Cannot fetch freebuf feed")

  const xml = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "#text",
    ignoreAttributes: false,
  })
  const result = xml.parse(xmlText)
  const items = result?.rss?.channel?.item
  const list: RSSItem[] = Array.isArray(items) ? items : items ? [items] : []

  const news = list.map<NewsItem>((item) => {
    const link = getText(item.link)
    return {
      id: getText(item.guid) || link,
      title: getText(item.title),
      url: link,
      pubDate: item.pubDate,
      extra: {
        hover: getText(item.description),
      },
    }
  }).filter(item => item.id && item.title && item.url)

  // 被 WAF 拦截时会返回挑战页，解析结果为空，需要抛错走缓存而不是返回空列表
  if (!news.length) throw new Error("Cannot fetch freebuf feed")
  return news
})
