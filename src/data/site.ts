/**
 * Replace the values in this file with your real identity and links.
 * All shared site chrome reads from this one object.
 */
export const site = {
  title: "Burns’ Blog",
  shortTitle: "Burns’ Blog",
  author: "Burns",
  description:
    "关于智能体系统、大模型基础设施、产品设计，以及如何把复杂系统讲明白的思考与记录。",
  email: "datazngao@gmail.com",
  github: "https://github.com/Burns1028",
  x: "https://x.com/GaoZhangyo96596",
  jike: "https://web.okjike.com/u/1B6E3DA3-83C2-4686-ACF6-221B730D4707",
  wechat: "rance_gao",
};

/**
 * 首页问候区的一圈联系方式。
 * kind 决定渲染方式：link 直接跳转，copy 点击复制文本（如微信号）。
 */
export const contacts = [
  { label: "X", kind: "link", href: site.x, icon: "x" },
  { label: "Jike", kind: "link", href: site.jike, icon: "jike" },
  { label: "GitHub", kind: "link", href: site.github, icon: "github" },
  { label: "Email", kind: "link", href: `mailto:${site.email}`, icon: "mail" },
  { label: "WeChat", kind: "copy", value: site.wechat, icon: "wechat" },
] as const;

export const nav = [
  { href: "/writing", label: "Writing" },
  { href: "/projects", label: "Projects" },
  { href: "/ideas", label: "Ideas" },
];
