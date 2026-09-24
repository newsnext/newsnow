import * as cheerio from "cheerio"
import type { NewsItem } from "@shared/types"

export default defineSource(async () => {
  const response: any = await myFetch("https://store.steampowered.com/stats/stats/")
  const $ = cheerio.load(response)
  const $rows = $("#detailStats tr.player_count_row")
  const news: NewsItem[] = []

  $rows.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.gameLink")
    const url = $a.attr("href")
    const gameName = $a.text().trim()
    const currentPlayers = $el.find("td:first-child .currentServers").text().trim()

    if (url && gameName && currentPlayers) {
      const title = gameName
      news.push({
        url,
        title,
        id: url,
        pubDate: Date.now(),
        extra: {
          info: currentPlayers,
        },
      })
    }
  })

  return news
})
