import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { pinyin } from "@napi-rs/pinyin"
import { consola } from "consola"
import { projectDir } from "../shared/dir"
import { genSources } from "../shared/pre-sources"
import packageJSON from "../package.json"

const sources = genSources()

function git(args: string[]) {
  return execFileSync("git", args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

function tagExists(tag: string) {
  try {
    git(["rev-parse", "--verify", "--quiet", tag])
    return true
  } catch {
    return false
  }
}

function getTagCommit(tag: string) {
  return git(["rev-list", "-n", "1", tag])
}

function isHead(tag: string) {
  try {
    return getTagCommit(tag) === git(["rev-parse", "HEAD"])
  } catch {
    return false
  }
}

function getVersionTags() {
  return git(["tag", "--sort=-version:refname", "--list", "v[0-9]*"])
    .split("\n")
    .filter(Boolean)
}

function getPreviousVersionTag(tag: string, offset = 1) {
  try {
    const tags = getVersionTags()
    const index = tags.indexOf(tag)
    return index === -1 ? undefined : tags[index + offset]
  } catch {}
}

function getVersionBaseRef() {
  try {
    const tags = [`v${packageJSON.version}`, packageJSON.version]
    for (const tag of tags) {
      if (!tagExists(tag)) continue
      if (isHead(tag)) return getPreviousVersionTag(tag, 2) ?? getPreviousVersionTag(tag) ?? tag
      return getPreviousVersionTag(tag) ?? tag
    }

    const tag = git(["describe", "--tags", "--abbrev=0"])
    return isHead(tag) ? getPreviousVersionTag(tag, 2) ?? getPreviousVersionTag(tag) ?? tag : tag
  } catch {}
}

function setSourceUpdatedAt(target: Map<string, number>, sourceId: string, updatedAt: number) {
  const normalizedId = sourceId.replace(/^_/, "")
  Object.keys(sources).forEach((id) => {
    if (id === normalizedId || id.startsWith(`${normalizedId}-`)) {
      target.set(id, Math.max(target.get(id) ?? 0, updatedAt))
    }
  })
}

function hasWorkingTreeChange(file: string) {
  try {
    git(["diff", "--quiet", "--", file])
    git(["diff", "--cached", "--quiet", "--", file])
    return false
  } catch {
    return true
  }
}

function getFileUpdatedAt(baseRef: string, file: string) {
  if (hasWorkingTreeChange(file)) return Number.MAX_SAFE_INTEGER

  const timestamp = git(["log", "-1", "--format=%ct", `${baseRef}..HEAD`, "--", file])
  return timestamp ? Number(timestamp) : 0
}

function getUpdatedSourceIds() {
  try {
    const baseRef = getVersionBaseRef()
    const ids = new Map<string, number>()
    if (!baseRef) return

    const changedFiles = git(["diff", "--name-only", baseRef, "--", "server/sources"])
      .split("\n")
      .filter(Boolean)

    changedFiles.forEach((file) => {
      const sourceFile = /^server\/sources\/(.+?)(?:\/index)?\.ts$/.exec(file)
      if (sourceFile) {
        setSourceUpdatedAt(ids, sourceFile[1].split("/")[0], getFileUpdatedAt(baseRef, file))
      }
    })

    return [...ids.entries()]
      .filter(([id]) => sources[id as keyof typeof sources] && !sources[id as keyof typeof sources].redirect)
      .sort(([, m], [, n]) => n - m)
      .map(([id]) => id)
  } catch {
    consola.warn("Skip updated sources: failed to read git info.")
  }
}

try {
  const pinyinMap = Object.fromEntries(Object.entries(sources)
    .filter(([, v]) => !v.redirect)
    .map(([k, v]) => {
      return [k, pinyin(v.title ? `${v.name}-${v.title}` : v.name).join("")]
    }))

  writeFileSync(join(projectDir, "./shared/pinyin.json"), JSON.stringify(pinyinMap, undefined, 2))
  consola.info("Generated pinyin.json")
} catch {
  consola.error("Failed to generate pinyin.json")
}

try {
  writeFileSync(join(projectDir, "./shared/sources.json"), JSON.stringify(Object.fromEntries(Object.entries(sources)), undefined, 2))
  consola.info("Generated sources.json")
} catch {
  consola.error("Failed to generate sources.json")
}

try {
  const updatedSourceIds = getUpdatedSourceIds()
  if (updatedSourceIds) {
    writeFileSync(join(projectDir, "./shared/updated-sources.ts"), `export const updatedSourceIds = ${JSON.stringify(updatedSourceIds, undefined, 2)} as const\n`)
    consola.info("Generated updated-sources.ts")
  } else {
    consola.info("Skipped updated-sources.ts")
  }
} catch {
  consola.error("Failed to generate updated-sources.ts")
}
