export const documentStatusLabels: Record<string, string> = {
  living: "持续更新",
  stable: "稳定",
  archived: "已归档",
};

export const projectStatusLabels: Record<string, string> = {
  active: "活跃",
  maintained: "维护中",
  experiment: "实验中",
  archived: "已归档",
};

export const statusLabel = (status: string) =>
  documentStatusLabels[status] ?? projectStatusLabels[status] ?? status;
