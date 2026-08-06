import type { DatabaseSync } from "node:sqlite";
import { upsertProject, type ProjectInput } from "./project-store.ts";

export function publishProject(
  input: ProjectInput,
  database: DatabaseSync,
  validateOnly = false,
) {
  database.exec("BEGIN IMMEDIATE;");
  try {
    const project = upsertProject(input, database);
    if (validateOnly) {
      database.exec("ROLLBACK;");
      return { validated: true, project };
    }
    database.exec("COMMIT;");
    return { validated: false, project };
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK;");
    throw error;
  }
}
