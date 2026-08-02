import { describe, expect, it } from "vitest"
import { parseSamrRecalls } from "../server/sources/samr"

describe("parseSamrRecalls", () => {
  it("parses official recall entries", () => {
    const html = `
      <div class="boxl_ul">
        <ul>
          <li>
            <a href="./202607/t20260730_115807.html"
              title="广汽丰田汽车有限公司召回部分铂智7汽车">
              广汽丰田汽车有限公司召回部分铂智7汽车
            </a>
            <span>2026-07-31</span>
          </li>
        </ul>
      </div>
    `

    expect(parseSamrRecalls(html)).toEqual([
      {
        id: "https://www.samrdprc.org.cn/qczh/gnzhqc/202607/t20260730_115807.html",
        title: "广汽丰田汽车有限公司召回部分铂智7汽车",
        url: "https://www.samrdprc.org.cn/qczh/gnzhqc/202607/t20260730_115807.html",
        pubDate: "2026-07-31T00:00:00+08:00",
      },
    ])
  })
})
