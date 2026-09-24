import type { PrimitiveAtom } from "jotai"
import type { FixedColumnID, PrimitiveMetadata, SourceID } from "@shared/types"
import type { Update } from "./types"

function createPrimitiveMetadataAtom(
  key: string,
  initialValue: PrimitiveMetadata,
  preprocess: ((stored: PrimitiveMetadata) => PrimitiveMetadata),
): PrimitiveAtom<PrimitiveMetadata> {
  const getInitialValue = (): PrimitiveMetadata => {
    const item = localStorage.getItem(key)
    try {
      if (item) {
        const stored = JSON.parse(item) as PrimitiveMetadata
        verifyPrimitiveMetadata(stored)
        return preprocess({
          ...stored,
          action: "init",
        })
      }
    } catch { }
    return initialValue
  }
  const baseAtom = atom(getInitialValue())
  const derivedAtom = atom(get => get(baseAtom), (get, set, update: Update<PrimitiveMetadata>) => {
    const nextValue = update instanceof Function ? update(get(baseAtom)) : update
    if (nextValue.updatedTime > get(baseAtom).updatedTime) {
      set(baseAtom, nextValue)
      localStorage.setItem(key, JSON.stringify(nextValue))
    }
  })
  return derivedAtom
}

const initialMetadata = typeSafeObjectFromEntries(typeSafeObjectEntries(metadata)
  .filter(([id]) => fixedColumnIds.includes(id as any))
  .map(([id, val]) => [id, val.sources] as [FixedColumnID, SourceID[]]))
export function preprocessMetadata(target: PrimitiveMetadata) {
  return {
    data: {
      ...initialMetadata,
      ...typeSafeObjectFromEntries(
        typeSafeObjectEntries(target.data)
          .filter(([id]) => initialMetadata[id])
          .map(([id, s]) => {
            if (id === "focus") return [id, s.filter(k => sources[k]).map(k => sources[k].redirect ?? k)]
            return [id, initialMetadata[id]]
          }),
      ),
    },
    action: target.action,
    updatedTime: target.updatedTime,
  } as PrimitiveMetadata
}

export const primitiveMetadataAtom = createPrimitiveMetadataAtom("metadata", {
  updatedTime: 0,
  data: initialMetadata,
  action: "init",
}, preprocessMetadata)
