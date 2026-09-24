interface Res {
  articles: {
    id: number
    title: string
    share?: string
    url?: string
    thumb?: string
    created_at?: string
    category?: string
  }[]
}

export default defineSource(async () => {
  const res: Res = await myFetch("https://api.dongqiudi.com/app/tabs/web/1.json")

  return res.articles
    .map(item => ({
      id: item.id,
      title: item.title,
      url: item.share || item.url || `https://www.dongqiudi.com/article/${item.id}`,
      pubDate: item.created_at,
      extra: {
        icon: item.thumb,
        info: item.category,
        date: item.created_at ? tranformToUTC(item.created_at) : 0,
      },
    }))
    .sort((a, b) => Number(b.extra.date) - Number(a.extra.date))
})
