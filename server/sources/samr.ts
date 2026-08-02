import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

const sourceURL = "https://www.samrdprc.org.cn/qczh/gnzhqc/"

export function parseSamrRecalls(html: string): NewsItem[] {
  const $ = cheerio.load(html)
  const news: NewsItem[] = []

  $(".boxl_ul li").each((_, element) => {
    const anchor = $(element).find("a").first()
    const href = anchor.attr("href")
    const title = anchor.attr("title")?.trim() || anchor.text().trim()
    const date = $(element).text().match(/\d{4}-\d{2}-\d{2}/)?.[0]
    if (!href || !title) return

    const url = new URL(href, sourceURL).toString()
    news.push({
      id: url,
      title,
      url,
      pubDate: date ? `${date}T00:00:00+08:00` : undefined,
    })
  })

  return news
}

export default defineSource(async () => {
  const html = await myFetch<string>(sourceURL, {
    responseType: "text" as any,
  })
  return parseSamrRecalls(html)
})
