import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Read local CSS imports in cascade order for presentation contracts. */
export function readStyles(path: string): string {
  return readFileSync(path, "utf8").replace(
    /@import "(\.\/.+?\.css)";/g,
    (_, relativePath: string) => readStyles(resolve(dirname(path), relativePath)),
  );
}
