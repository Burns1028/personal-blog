import {
  listPublishedArticles,
  type StoredArticleSummary,
} from "./content-store";

export interface WritingCatalogData {
  title: string;
  summary: string;
  deck?: string;
  publishedAt: Date;
  updatedAt?: Date;
  tags: string[];
  featured: boolean;
  number: string;
  readingTime: string;
}

export interface WritingCatalogEntry {
  id: string;
  articleId: number;
  data: WritingCatalogData;
}

function dateFromStorage(value: string | null): Date {
  if (!value) return new Date(0);

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date(0) : date;
}

function fromStoredArticle(article: StoredArticleSummary): WritingCatalogEntry {
  return {
    id: article.slug,
    articleId: article.id,
    data: {
      title: article.title,
      summary: article.summary,
      deck: article.deck ?? undefined,
      publishedAt: dateFromStorage(article.publishedAt),
      updatedAt: article.updatedAt
        ? dateFromStorage(article.updatedAt)
        : undefined,
      tags: article.tags,
      featured: article.featured,
      number: article.number,
      readingTime: `${article.readingMinutes} 分钟`,
    },
  };
}

export async function getWritingCatalog(): Promise<WritingCatalogEntry[]> {
  return listPublishedArticles().map(fromStoredArticle).sort(
    (a, b) =>
      b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf() ||
      a.id.localeCompare(b.id),
  );
}
