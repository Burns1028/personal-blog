export function applyDisplayOrder(project, rawValue) {
  if (rawValue === undefined) return project;

  const value = rawValue.trim().toLowerCase();
  if (value === "none") return { ...project, displayOrder: null };
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(
      "--display-order must be an integer from 1 to 100000 or none",
    );
  }

  const displayOrder = Number(value);
  if (!Number.isSafeInteger(displayOrder) || displayOrder > 100000) {
    throw new Error(
      "--display-order must be an integer from 1 to 100000 or none",
    );
  }

  return { ...project, displayOrder };
}
