import _sources from "./sources.json"
import type { Source, SourceID } from "./types"

export const sources = _sources as Record<SourceID, Source>
export default sources
