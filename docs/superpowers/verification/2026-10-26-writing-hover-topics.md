# Writing 悬停二级筛选与时间顺序

根据用户反馈，移除一级分类的选中边框与背景，改为细下划线；移除独立快捷目录栏。一级分类点击显示该类所有文章，悬停显示二级主题选项，点击二级后筛选文章列表。手机使用分类旁箭头展开；键盘支持聚焦打开、向下进入选项及 Escape 关闭。

现有文章分为 DeepInfer、RSI 综述、Agent 研究、纳瓦尔宝典、人月神话、产品与审美、工作回忆等二级主题，选项及数量只取自已发布文章。一级、二级、搜索取交集，URL 使用 type、topic、q 保存状态。

排序入口改为“时间顺序 ↓ / ↑”，默认新到旧，点击改为旧到新（sort=asc）；再次点击恢复默认。分类、二级主题、关键词在排序和搜索时均保留。Writing 继续一次呈现所有匹配文章，无分页。

验证：

- `npm run test:content`：207 项通过，0 失败。
- `npm run build`：Astro 检查 124 文件，0 errors / warnings / hints，构建成功；原有工具弃用和 chunk 大小提示仍存在。
- Chrome 检查一级点击、悬停不改变列表、RSI 和书名筛选、正反时间顺序、搜索及排序保留条件、跨一级无效二级参数恢复、键盘和点击外部关闭。
- 手机通过真实 touch 事件验证箭头展开和二级筛选；检查 320、375、768、844px 下弹层无横向溢出；关闭 JavaScript 时悬停可用。
- 导航恢复触发的 scroll 事件不会关闭刚打开的菜单；弹层相对分类定位，无需监听滚动关闭。

截图保存在工作区 `output/writing-types-20261025/hover-desktop-default.png`、`hover-desktop-menu.png`、`hover-mobile-default.png`、`hover-mobile-menu.png`。本地预览与数据来源沿用前一版，不含完整正文，未部署生产。
