export interface ArticleHeading {
  depth: number;
  slug: string;
  text: string;
}

export function selectTopLevelArticleHeadings<T extends ArticleHeading>(
  headings: readonly T[],
): T[] {
  const eligible = headings.filter(({ slug }) => slug !== "footnote-label");
  if (eligible.length === 0) return [];

  const topDepth = Math.min(...eligible.map(({ depth }) => depth));
  return eligible.filter(({ depth }) => depth === topDepth);
}
