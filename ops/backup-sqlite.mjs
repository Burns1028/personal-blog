#!/usr/bin/env node
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = process.env.BLOG_DB_PATH;
if (!databasePath) throw new Error("BLOG_DB_PATH is required for backup");
const backupRoot = join(dirname(databasePath), "backups");
mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = join(backupRoot, `blog-${stamp}.sqlite`);
const escapedBackupPath = backupPath.replaceAll("'", "''");

const source = new DatabaseSync(databasePath, { timeout: 30_000 });
try {
  source.exec(`VACUUM INTO '${escapedBackupPath}'`);
} finally {
  source.close();
}

const backup = new DatabaseSync(backupPath, { readOnly: true });
try {
  const result = backup.prepare("PRAGMA integrity_check").get();
  if (!result || Object.values(result)[0] !== "ok") {
    throw new Error("SQLite backup integrity check failed");
  }
} finally {
  backup.close();
}

const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1_000;
for (const file of readdirSync(backupRoot)) {
  if (!/^blog-.*\.sqlite$/.test(file)) continue;
  const path = join(backupRoot, file);
  if (statSync(path).mtimeMs < cutoff) rmSync(path);
}

console.log(JSON.stringify({ backup: backupPath, integrity: "ok" }));
