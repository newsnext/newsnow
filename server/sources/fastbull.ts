import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

const express = defineSource(async () => {
  const baseURL = "https://www.fastbull.com"
  const html: any = await myFetch(`${baseURL}/cn/express-news`)
  const $ = cheerio.load(html)
  const $main = $(".content-list.news-list")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const $el = $(el)
    const a = $el.find(".title_name")
    const url = $el.find("[data-href]").attr("data-href") || $el.find("[data-id]").attr("data-id")
    const titleText = a.text()
    const title = titleText.match(/【(.+)】/)?.[1] ?? titleText
    const date = $el.attr("data-date")
    if (url && title && date) {
      const pathname = url.startsWith("/") ? url : `/cn/fastshort/${url}`
      news.push({
        url: baseURL + pathname,
        title: title.length < 4 ? titleText : title,
        id: url,
        pubDate: Number(date),
      })
    }
  })
  return news.sort((a, b) => Number(b.pubDate) - Number(a.pubDate))
})

const news = defineSource(async () => {
  const baseURL = "https://www.fastbull.com"
  const html: any = await myFetch(`${baseURL}/cn/news`)
  const $ = cheerio.load(html)
  const $main = $(".trending_type")
  const news: NewsItem[] = []
  $main.each((_, el) => {
    const a = $(el)
    const url = a.attr("href")
    const title = a.find(".title").text()
    const date = a.find("[data-date]").attr("data-date")
    if (url && title && date) {
      news.push({
        url: url.startsWith("http") ? url : baseURL + url,
        title,
        id: url,
        pubDate: Number(date),
      })
    }
  })
  return news.sort((a, b) => Number(b.pubDate) - Number(a.pubDate))
})

export default defineSource(
  {
    "fastbull": express,
    "fastbull-express": express,
    "fastbull-news": news,
  },
)
