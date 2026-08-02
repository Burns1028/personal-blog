import type { DatabaseSync } from "node:sqlite";
import { upsertActivity, type ActivityInput } from "./activity-store.ts";
import { upsertProject, type ProjectInput } from "./project-store.ts";

export interface ProjectProgressPackage {
  project: ProjectInput;
  activity: ActivityInput;
}

export function publishProjectProgress(
  input: ProjectProgressPackage,
  database: DatabaseSync,
  validateOnly = false,
) {
  if (input.activity.source !== "github") {
    throw new TypeError("Project progress activity source must be github.");
  }
  if (input.activity.projectSlug !== input.project.slug) {
    throw new TypeError("Project progress activity must reference the same project slug.");
  }

  database.exec("BEGIN IMMEDIATE;");
  try {
    const project = upsertProject(input.project, database);
    const activity = upsertActivity(input.activity, database);
    if (validateOnly) {
      database.exec("ROLLBACK;");
      return { validated: true, project, activity };
    }
    database.exec("COMMIT;");
    return { validated: false, project, activity };
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK;");
    throw error;
  }
}
