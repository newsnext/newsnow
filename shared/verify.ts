function isRecord(target: unknown): target is Record<string, unknown> {
  return typeof target === "object" && target !== null && !Array.isArray(target)
}

export function verifyPrimitiveMetadata(target: unknown) {
  if (!isRecord(target) || typeof target.updatedTime !== "number" || !isRecord(target.data)) {
    throw new Error("Invalid primitive metadata")
  }

  for (const sources of Object.values(target.data)) {
    if (!Array.isArray(sources) || !sources.every(source => typeof source === "string")) {
      throw new Error("Invalid primitive metadata")
    }
  }
}
