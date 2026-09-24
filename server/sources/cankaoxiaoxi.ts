interface Res {
  list: {
    data: {
      id: string
      title: string
      // 北京时间
      url: string
      publishTime: string
    }
  }[]
}

export default defineSource(async () => {
  const res = await Promise.all(["zhongguo", "guandian", "gj"].map(k => myFetch(`http://china.cankaoxiaoxi.com/json/channel/${k}/list.json`) as Promise<Res>))
  return res.map(k => k.list).flat().map(k => ({
    id: k.data.id,
    title: k.data.title,
    extra: {
      date: tranformToUTC(k.data.publishTime),
    },
    url: k.data.url,
  })).sort((m, n) => m.extra.date < n.extra.date ? 1 : -1)
})
