# Contributing to NewsNow

Thank you for considering contributing to NewsNow! This document provides guidelines and instructions for contributing to the project.

## Adding a New Source

NewsNow is built to be easily extensible with new sources. Here's a step-by-step guide on how to add a new source:

### 1. Create a Feature Branch

Always create a feature branch for your changes:

```bash
git checkout -b feature-name
```

For example, to add a Bilibili hot video source:

```bash
git checkout -b bilibili-hot-video
```

### 2. Register the Source in Configuration

Add your new source to the source configuration in `/shared/pre-sources.ts`:

```
  "bilibili": {
  name: "哔哩哔哩",
  color: "blue",
  home: "https://www.bilibili.com",
  sub: {
    "hot-search": {
      title: "热搜",
      column: "china",
      type: "hottest"
    },
    "hot-video": {  // Add your new sub-source here
      title: "热门视频",
      column: "china",
      type: "hottest"
    }
  }
}
```

For a completely new source, add a new top-level entry:

```
"newsource": {
  name: "New Source",
  color: "blue",
  home: "https://www.example.com",
  column: "tech", // Pick an appropriate column
  type: "hottest" // Or "realtime" if it's a news feed
};
```

### 3. Implement the Source Fetcher

Create or modify a file in the `/server/sources/` directory. If your source is related to an existing one (like adding a new Bilibili sub-source), modify the existing file:

```typescript
// In /server/sources/bilibili.ts

// Define interface for API response
interface HotVideoRes {
  code: number
  message: string
  ttl: number
  data: {
    list: {
      aid: number
      // ... other fields
      bvid: string
      title: string
      pubdate: number
      desc: string
      pic: string
      owner: {
        mid: number
        name: string
        face: string
      }
      stat: {
        view: number
        like: number
        reply: number
        // ... other stats
      }
    }[]
  }
}

// Define source getter function
const hotVideo = defineSource(async () => {
  const url = "https://api.bilibili.com/x/web-interface/popular"
  const res: HotVideoRes = await myFetch(url)

  return res.data.list.map(video => ({
    id: video.bvid,
    title: video.title,
    url: `https://www.bilibili.com/video/${video.bvid}`,
    pubDate: video.pubdate * 1000,
    extra: {
      info: `${video.owner.name} · ${formatNumber(video.stat.view)}观看 · ${formatNumber(video.stat.like)}点赞`,
      hover: video.desc,
      icon: video.pic,
    },
  }))
})

// Helper function for formatting numbers
function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${Math.floor(num / 10000)}w+`
  }
  return num.toString()
}

// Export the source
export default defineSource({
  "bilibili": hotSearch,
  "bilibili-hot-search": hotSearch,
  "bilibili-hot-video": hotVideo, // Add your new source here
})
```

For completely new sources, create a new file in `/server/sources/` named after your source (e.g., `newsource.ts`).

### 4. Regenerate Source Files

After adding or modifying source files, run the following command to regenerate the necessary files:

```bash
npm run presource
```

This will update the `sources.json` file and any other necessary configuration.

### 5. Test Your Changes

Start the development server to test your changes:

```bash
npm run dev
```

Access the application in your browser and ensure that your new source is appearing and working correctly.

### 6. Commit Your Changes

Once everything is working, commit your changes:

```bash
git add .
git commit -m "Add new source: source-name"
```

### 7. Create a Pull Request

Push your changes to your fork and create a pull request against the main repository:

```bash
git push origin feature-name
```

## Source Structure

### NewsItem Structure

Each source should return an array of objects that conform to the `NewsItem` interface:

```typescript
interface NewsItem {
  id: string | number // Unique identifier for the item
  title: string // Title of the news item
  url: string // URL to the full content
  mobileUrl?: string // Optional mobile-specific URL
  pubDate?: number | string // Publication date
  extra?: {
    hover?: string // Text to display on hover
    date?: number | string // Formatted date
    info?: false | string // Additional information
    diff?: number // Time difference
    icon?:
      | false
      | string
      | {
        // Icon for the item
        url: string
        scale: number
      }
  }
}
```

## Code Style

Please follow the existing code style in the project. The project uses TypeScript and follows modern ES6+ conventions.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.
