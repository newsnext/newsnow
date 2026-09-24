import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

const baseURL = "https://news.ycombinator.com"

async function fetchDirect(): Promise<NewsItem[]> {
  const html: any = await myFetch(baseURL)
  const $ = cheerio.load(html)
  const $main = $(".athing")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el).find(".titleline a").first()
    const title = a.text()
    const id = $(el).attr("id")
    const score = $(`#score_${id}`).text()
    const url = `${baseURL}/item?id=${id}`
    if (url && id && title) {
      news.push({
        url,
        title,
        id,
        extra: {
          info: score,
        },
      })
    }
  })
  return news
}

async function fetchViaRSS(): Promise<NewsItem[]> {
  const data = await rss2json("https://hnrss.org/frontpage?count=30")
  if (!data?.items.length) throw new Error("Cannot fetch rss data")
  return data.items.map((item) => {
    const description = item.description ?? ""
    const url = /Comments URL: <a href="([^"]+)"/.exec(description)?.[1] ?? item.link
    const id = /id=(\d+)/.exec(url)?.[1] ?? url
    const points = /Points: (\d+)/.exec(description)?.[1]
    return {
      id,
      title: item.title,
      url,
      pubDate: item.created,
      extra: points
        ? {
            info: `${points} points`,
          }
        : undefined,
    }
  }).filter(item => item.id && item.title && item.url)
}

export default defineSource(async () => {
  const news = await fetchDirect().catch(() => [])
  if (news.length) return news
  return fetchViaRSS()
})
