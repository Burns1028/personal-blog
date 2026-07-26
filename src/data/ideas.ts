export interface Idea {
  id: string;
  text: string;
  theme: string;
  capturedAt: Date;
}

export const ideas: Idea[] = [
  {
    id: "evidence-before-confidence",
    text: "可靠的智能体不是从不失败，而是每次失败都留下足够的证据，让系统能够被修复。",
    theme: "智能体系统",
    capturedAt: new Date("2026-07-24"),
  },
  {
    id: "smaller-state-space",
    text: "通往清晰的最短路径，往往是缩小状态空间。",
    theme: "系统",
    capturedAt: new Date("2026-07-21"),
  },
  {
    id: "documents-change-decisions",
    text: "一份文档只有改变了下一次决策，才真正值得被保留下来。",
    theme: "知识",
    capturedAt: new Date("2026-07-17"),
  },
  {
    id: "attention-is-an-argument",
    text: "界面本质上是一种判断：什么值得被注意。",
    theme: "设计",
    capturedAt: new Date("2026-07-12"),
  },
  {
    id: "observability-is-memory",
    text: "可观测性，是一种可以被查询的记忆。",
    theme: "基础设施",
    capturedAt: new Date("2026-07-08"),
  },
  {
    id: "remove-negotiation",
    text: "好工具会消除那些反复发生的协商。",
    theme: "产品",
    capturedAt: new Date("2026-07-02"),
  },
  {
    id: "name-the-failure",
    text: "好的抽象，会让失败更容易被准确命名。",
    theme: "工程",
    capturedAt: new Date("2026-06-26"),
  },
  {
    id: "taste-becomes-testable",
    text: "真正发布出去，才会让品味变成一个可以被验证的判断。",
    theme: "创造",
    capturedAt: new Date("2026-06-19"),
  },
];
