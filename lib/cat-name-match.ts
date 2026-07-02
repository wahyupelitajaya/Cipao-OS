export interface CatMatchCandidate {
  id: string;
  name: string;
  cat_id: string | null;
}

export type CatMatchResult =
  | { status: "matched"; cat: CatMatchCandidate }
  | { status: "not_found" }
  | { status: "ambiguous"; matches: CatMatchCandidate[] };

type NormalizedCat = CatMatchCandidate & {
  nameLower: string;
  catIdLower: string;
};

function normalizeCats(cats: CatMatchCandidate[]): NormalizedCat[] {
  return cats.map((c) => ({
    ...c,
    nameLower: c.name.trim().toLowerCase(),
    catIdLower: (c.cat_id ?? "").trim().toLowerCase(),
  }));
}

/** Cocokkan token nama/ID kucing (exact dulu, lalu partial seperti WhatsApp). */
export function matchCatByToken(cats: CatMatchCandidate[], tokenRaw: string): CatMatchResult {
  const tokenLower = tokenRaw.trim().toLowerCase();
  if (!tokenLower) return { status: "not_found" };

  const list = normalizeCats(cats);

  const exact = list.filter(
    (c) => c.nameLower === tokenLower || (c.catIdLower !== "" && c.catIdLower === tokenLower),
  );
  if (exact.length === 1) return { status: "matched", cat: exact[0]! };
  if (exact.length > 1) {
    return { status: "ambiguous", matches: exact.map(({ id, name, cat_id }) => ({ id, name, cat_id })) };
  }

  const partial = list.filter((c) => c.nameLower.includes(tokenLower));
  if (partial.length === 1) return { status: "matched", cat: partial[0]! };
  if (partial.length > 1) {
    return { status: "ambiguous", matches: partial.map(({ id, name, cat_id }) => ({ id, name, cat_id })) };
  }

  return { status: "not_found" };
}
