import {
  createMarkdownProcessor,
  type MarkdownHeading,
} from "@astrojs/markdown-remark";
import type { StoredArticleAsset } from "./content-store";

interface ArticleNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: ArticleNode[];
}

export interface RenderedArticleMarkdown {
  html: string;
  headings: MarkdownHeading[];
}

function isElement(node: ArticleNode, tagName?: string): boolean {
  return (
    node.type === "element" &&
    (tagName === undefined || node.tagName === tagName)
  );
}

function isWhitespace(node: ArticleNode): boolean {
  return node.type === "text" && (node.value ?? "").trim().length === 0;
}

function textContent(node: ArticleNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

function meaningfulChildren(node: ArticleNode): ArticleNode[] {
  return (node.children ?? []).filter((child) => !isWhitespace(child));
}

function captionChildren(node: ArticleNode): ArticleNode[] | undefined {
  if (!isElement(node, "p")) return undefined;

  const children = meaningfulChildren(node);
  if (children.length === 1 && isElement(children[0], "em")) {
    return children[0].children ?? [];
  }

  const plainText = textContent(node).trim();
  if (/^(?:图\s*[:：]|第[一二三四五六七八九十]+版\s*[:：])/.test(plainText)) {
    return node.children ?? [];
  }

  return undefined;
}

function rehypeArticleDetails() {
  return (tree: ArticleNode) => {
    const visit = (node: ArticleNode) => {
      if (!node.children) return;

      for (const child of node.children) {
        if (isElement(child, "a")) {
          const href = child.properties?.href;
          if (typeof href === "string" && /^https?:\/\//.test(href)) {
            child.properties = {
              ...child.properties,
              target: "_blank",
              rel: ["noopener", "noreferrer"],
            };
          }
        }

        if (isElement(child, "pre")) {
          const code = meaningfulChildren(child).find((item) =>
            isElement(item, "code"),
          );
          const classNames = code?.properties?.className;
          const language = Array.isArray(classNames)
            ? classNames
                .find(
                  (className): className is string =>
                    typeof className === "string" &&
                    className.startsWith("language-"),
                )
                ?.slice("language-".length)
            : undefined;

          child.properties = {
            ...child.properties,
            "data-language": language ?? "text",
            tabindex: 0,
          };
        }

        visit(child);
      }

      for (let index = 0; index < node.children.length; index += 1) {
        const paragraph = node.children[index];
        if (!isElement(paragraph, "p")) continue;

        const paragraphChildren = meaningfulChildren(paragraph);
        if (
          paragraphChildren.length !== 1 ||
          !isElement(paragraphChildren[0], "img")
        ) {
          continue;
        }

        const image = paragraphChildren[0];
        image.properties = {
          ...image.properties,
          loading: "lazy",
          decoding: "async",
        };

        let captionIndex = index + 1;
        while (
          captionIndex < node.children.length &&
          isWhitespace(node.children[captionIndex])
        ) {
          captionIndex += 1;
        }

        const caption =
          captionIndex < node.children.length
            ? captionChildren(node.children[captionIndex])
            : undefined;

        if (!caption) continue;

        const captionText = caption.map(textContent).join("").trim();
        const currentAlt = image.properties?.alt;

        if (
          captionText &&
          (typeof currentAlt !== "string" ||
            currentAlt.trim().length === 0 ||
            currentAlt.trim().toLowerCase() === "image")
        ) {
          image.properties = {
            ...image.properties,
            alt: captionText,
          };
        }

        const figure: ArticleNode = {
          type: "element",
          tagName: "figure",
          properties: {
            className: ["article-figure"],
          },
          children: [
            image,
            {
              type: "element",
              tagName: "figcaption",
              properties: {},
              children: caption,
            },
          ],
        };

        node.children.splice(index, captionIndex - index + 1, figure);
      }
    };

    visit(tree);
  };
}

const processorPromise = createMarkdownProcessor({
  syntaxHighlight: "shiki",
  shikiConfig: {
    themes: {
      light: "github-light",
      dark: "github-dark-dimmed",
    },
    defaultColor: false,
    wrap: true,
  },
  gfm: true,
  smartypants: true,
  rehypePlugins: [rehypeArticleDetails],
});

function addAssetDimensions(
  html: string,
  assets: StoredArticleAsset[],
): string {
  let result = html;

  for (const asset of assets) {
    const sourceAttribute = `src="${asset.publicUrl}"`;
    if (!result.includes(sourceAttribute)) continue;

    const geometry =
      asset.width && asset.height
        ? ` width="${asset.width}" height="${asset.height}"`
        : "";
    const orientation =
      asset.width && asset.height && asset.height > asset.width * 1.15
        ? "article-media--portrait"
        : "article-media--landscape";

    result = result.replaceAll(
      sourceAttribute,
      `${sourceAttribute}${geometry} class="article-media ${orientation}"`,
    );
  }

  return result;
}

export async function renderArticleMarkdown(
  markdown: string,
  assets: StoredArticleAsset[] = [],
): Promise<RenderedArticleMarkdown> {
  const processor = await processorPromise;
  const rendered = await processor.render(markdown);

  return {
    html: addAssetDimensions(rendered.code, assets),
    headings: rendered.metadata.headings,
  };
}
