# Writing 主题筛选验证

日期：2026-10-25（Asia/Shanghai）。基于 GitHub main 的 cb89299 开发；原本地 personal-blog 的多个源码文件为 iCloud dataless，且 iCloud 已退出登录，因此使用独立开发副本，保留原目录。

## 当前实现：加宽与连续阅读

根据用户对首版的反馈，文章区从 780px 扩至 1120px，保留手机自适应边距。移除 Writing 的分页与每页 4 篇限制，全部文章一次显示 13 篇，Agent / RSI 显示完整 6 篇；旧链接中的 page 参数不再截断结果。

主题采用浅色选中底与细边框，重排列表标题、摘要、日期及月相。快捷目录默认收起，展开后桌面两列、手机单列，随页面自然延伸，没有内部滚动条。

再次验证：204 项测试通过；Astro 检查 124 文件、0 errors / warnings / hints，构建成功。Chrome 验证全部文章数量、旧分页链接、分类内搜索、清空搜索、文章直达、键盘展开收起、关闭 JavaScript 浏览，以及 320 / 375 / 768 / 844px 无横向溢出。桌面实测列宽 1120px，分类点击区域不小于 44px。

新版截图：工作区 `output/writing-types-20261025/wide-desktop-agents.png`、`wide-desktop-all.png`、`wide-directory-open.png`、`wide-mobile-agents.png`、`wide-mobile-directory.png`。

以下是首版 a51e522 的验证记录，其中分页与目录默认展开行为已由上述调整替代。当前仍仅为本地预览，未部署生产。

## 自动检查

- `npm run test:content`：204 项通过，0 失败。
- `npm run build`：成功；Astro 检查 124 个文件，0 errors、0 warnings、0 hints。构建工具仍报告原有 Markdown 配置弃用和大 chunk 提示。
- `git diff --check`：通过。

## 浏览器检查

使用本机 Chrome 的无头模式，通过 Playwright 检查：

1. 全部文章显示 13 篇，各主题数为 1、6、4、1、1。
2. AI Infra 筛选仅显示 DeepInfer 小解；选中态唯一。
3. 二级目录可直达正文，浏览器返回恢复主题。
4. Agent / RSI 共 6 篇，目录跨越两页完整列出。
5. 搜索保留主题并回到第一页；分页保留主题及关键词。
6. 切换主题保留关键词、回到第一页；无结果时清空搜索保留主题。
7. 无效主题回到全部文章；超出范围的页码由现有分页逻辑收敛。
8. 320、375、768px 无横向溢出，主题入口最小高度 44px。
9. 文章目录支持键盘 Enter 展开和收起。
10. 关闭 JavaScript 后主题目录及正文跳转仍可用；无页面脚本异常。

构建产物另在本地 4329 端口启动，AI Infra、Agent / RSI 搜索第二页、阅读分类无匹配三条 SSR 路径均返回 200 且包含预期内容。

## 预览与范围

- 本地预览：`http://127.0.0.1:4328/writing?type=ai-infra`。
- 预览数据库：`/tmp/burns-writing-preview-20261025.sqlite`，仅从公开 API 取得 13 篇文章的标题、标签、摘要等元数据；预览正文使用摘要，不包含完整文章正文。未写生产数据库。
- 截图位于工作区 `output/writing-types-20261025/`：desktop-all.png、desktop-ai-infra.png、mobile-agents.png、mobile-reading.png。
- 本次未推送远端或部署生产。
