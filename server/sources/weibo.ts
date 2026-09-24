import * as cheerio from "cheerio"

export default defineSource(async () => {
  const baseurl = "https://s.weibo.com"
  const url = `${baseurl}/top/summary?cate=realtimehot`

  const html = await myFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      // https://github.com/v5tech/weibo-trending-hot-search
      "Cookie": "SUB=_2AkMWIuNSf8NxqwJRmP8dy2rhaoV2ygrEieKgfhKJJRMxHRl-yT9jqk86tRB6PaLNvQZR6zYUcYVT1zSjoSreQHidcUq7",
      "referer": url,
    },
  })

  const $ = cheerio.load(html)

  const rows = $("#pl_top_realtimehot table tbody tr").slice(1)

  const hotNews: NewsItem[] = []

  rows.each((_, row) => {
    const $row = $(row)
    const $link = $row.find("td.td-02 a").filter((_, el) => {
      const href = $(el).attr("href")
      return !!(href && !href.includes("javascript:void(0);"))
    }).first()

    if ($link.length) {
      const title = $link.text().trim()
      const href = $link.attr("href")

      if (title && href) {
        const $flag = $row.find("td.td-03").text().trim()
        const flagUrl = {
          新: "https://simg.s.weibo.com/moter/flags/1_0.png",
          热: "https://simg.s.weibo.com/moter/flags/2_0.png",
          爆: "https://simg.s.weibo.com/moter/flags/4_0.png",
        }[$flag]
        hotNews.push({
          id: title,
          title,
          url: `${baseurl}${href}`,
          mobileUrl: `${baseurl}${href}`,
          extra: {
            icon: flagUrl ? { url: flagUrl, scale: 1.5 } : undefined,
          },
        })
      }
    }
  })
  return hotNews
})
