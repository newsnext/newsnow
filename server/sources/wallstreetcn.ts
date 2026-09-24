interface Item {
  uri: string
  id: number
  title?: string
  content_text: string
  content_short: string
  display_time: number
  type?: string
}
interface LiveRes {
  data: {
    items: Item[]
  }
}

interface NewsRes {
  data: {
    items: {
      // ad
      resource_type?: string
      resource: Item
    }[]
  }
}

interface HotRes {
  data: {
    day_items: Item[]
  }
}

// https://github.com/DIYgod/RSSHub/blob/master/lib/routes/wallstreetcn/live.ts
const live = defineSource(async () => {
  const apiUrl = `https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30`

  const res: LiveRes = await myFetch(apiUrl)
  return res.data.items
    .map((k) => {
      return {
        id: k.id,
        title: k.title || k.content_text,
        extra: {
          date: k.display_time * 1000,
        },
        url: k.uri,
      }
    })
})

const news = defineSource(async () => {
  const apiUrl = `https://api-one.wallstcn.com/apiv1/content/information-flow?channel=global-channel&accept=article&limit=30`

  const res: NewsRes = await myFetch(apiUrl)
  return res.data.items
    .filter(k => k.resource_type !== "theme" && k.resource_type !== "ad" && k.resource.type !== "live" && k.resource.uri)
    .map(({ resource: h }) => {
      return {
        id: h.id,
        title: h.title || h.content_short,
        extra: {
          date: h.display_time * 1000,
        },
        url: h.uri,
      }
    })
})

const hot = defineSource(async () => {
  const apiUrl = `https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all`

  const res: HotRes = await myFetch(apiUrl)
  return res.data.day_items
    .map((h) => {
      return {
        id: h.id,
        title: h.title!,
        url: h.uri,
      }
    })
})

export default defineSource({
  "wallstreetcn": live,
  "wallstreetcn-quick": live,
  "wallstreetcn-news": news,
  "wallstreetcn-hot": hot,
})
