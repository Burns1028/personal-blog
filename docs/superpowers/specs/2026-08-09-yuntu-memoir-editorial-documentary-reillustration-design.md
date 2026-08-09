# 《云图回忆录》编辑纪实配图重做设计

日期：2026-08-09
状态：已获方向确认，待实施前复核

## 1. 目标与结论

这次配图重做的目标，不是把文章里的技术概念逐项“解释成图”，而是让图片参与讲述一段真实的四年成长经历。

《云图回忆录》的主线是：作者带着第一次 1024 比赛的冠军进入云图，在旧服务、业务判断、答辩、协作和 AI Agent 项目中逐渐成为能够定义问题、接住事情的 Builder，最后又带着一次 1024 AI Agent 比赛的冠军离开，走向新的 Infra 团队。

因此，图片应当服务于“一个人在四年里怎样变化”这条故事线，而不是服务于 Spark、OLAP、Multi-Agent、长上下文等知识点。四张已有的真实照片承担时间锚点；三张 AI 情境插图补足没有影像记录、但确实改变了作者的关键时刻。

本设计取代此前针对本文章的新增概念插图方案。此前生成的 OLAP 硬件、老虎规则、Agent 闸门、卡尺与机械臂四张图，不再出现在正文中。

## 2. 叙事诊断

文章的情绪和成长线可以压缩成七个画面节点：

1. 第一次 1024 获奖，带着 Pico 入职，故事开始。
2. 第一个旧服务迁移项目：没有成熟工具，只能独自把复杂度一层层理清。
3. 转正答辩第一次不顺利，随后在他人的帮助下反复演练并完成修正。
4. 周末主动搭 Agent 平台；当时没有明确用途的积累，后来成为机会的入口。
5. 第二次 1024 比赛现场分享，代表能力从“做出来”走向“讲清楚”。
6. 与队友合影，代表复杂项目不是一个人的独角戏。
7. 一等奖与创新奖，首尾呼应，作者带着新的冠军离开云图。

技术判断、组织协作和 AI 时代的观点仍由文字完成。配图只在能补充人物状态、时间感与经历感时出现。

## 3. 保留、撤下与新增

### 3.1 保留的真实照片

- 第一次 1024 获得的 Pico。
- 第二次 1024 比赛中的现场分享。
- 第二次 1024 比赛与队友的合影。
- 第二次 1024 比赛的一等奖、创新奖结果截图。

真实照片不做 AI 风格化，不伪造当时场景，不改变其作为经历证据的性质。现场分享与队友合影继续使用现有的双栏响应式布局；宽屏一行两张，窄屏自动堆叠。

### 3.2 从正文撤下的旧 AI 图片

- OLAP 硬件意象图。
- “老虎”切词规则图。
- Agent 闸门图。
- 卡尺与机械臂图。

撤下是指删除 Markdown 中的图片引用和图注。旧资源文件可以保留在资产目录中，避免执行无必要的破坏性删除，但发布后的文章不得再加载它们。

### 3.3 新增的 AI 情境插图

只新增三张，分别补足“第一个项目”“答辩修正”“周末积累”三个没有真实照片、但对人物成长不可替代的节点。

## 4. 统一视觉语言

三张图均采用编辑纪实摄影的表达方式，参考 Guizang Image 2.0 配图方法中的 Type 1 人物纪实方向。

- 比例：统一为横向 3:2。
- 质感：Fujifilm / Leica 式编辑纪实摄影，自然光或可信的室内环境光，低饱和度，轻微胶片颗粒。
- 人物：年轻工程师，但不复制作者本人长相，不出现可识别身份特征；以背影、侧影或环境中的人物为主。
- 场景：真实、克制、有生活痕迹；允许桌面、线缆、电脑、白板、会议桌等具体物件参与叙事。
- 情绪：专注、略带压力，但不卖惨；有人的温度，不是商业摆拍或励志海报。
- 构图：以一个明确的人物动作作为视觉中心，环境提供上下文；不将多个概念平铺成信息卡片。
- 页面角色：作为正文中的嵌入式横图，不是独立海报或幻灯片。

三张图必须保持相近的色温、反差、人物尺度和视觉密度，放在同一篇文章里应被看作同一组作品。

## 5. 三张图片的完整设计

### 5.1 图二：第一个项目——把复杂度一层层理清

**叙事任务**

表现作者第一次面对复杂旧服务时的真实状态：没有 AI，也没有成熟的 Coding 工具，只能沿着调用链逐层翻找并承担结果。这张图不是“程序员加班”套图，而是文章中“细致加靠谱”“把事情接住”的第一次落地。

**插入位置**

放在以下段落之后：

> 它未必需要一个人多聪明，但需要你把事情接住。

**画面设计**

深夜但仍有人使用过的办公室。一名年轻工程师独自坐在工位前，身体微微前倾，在两块显示器之间追踪复杂旧服务。屏幕可呈现代码、终端和层叠窗口的视觉形态，但所有内容不可读。桌面有水杯、便签、键盘和少量线缆，空间大部分已经熄灯，人物所在区域由显示器与一盏普通工位灯照亮。镜头从斜后方观察，像一位同事偶然记录下来的瞬间。

画面重点是“顺着复杂性往下追”，而不是疲惫、孤独或高科技感。

**生成提示词核心**

> Editorial documentary photograph for a Chinese personal tech memoir, a young software engineer alone in a mostly quiet late-night office, leaning forward while tracing a complicated legacy service across two monitors, believable code and terminal window shapes but no readable text, ordinary desk lamp, water cup, keyboard and a few cables, observed from behind at a slight angle, focused and responsible rather than exhausted, natural practical lighting, low saturation, subtle film grain, Fujifilm/Leica feeling, candid and human, landscape 3:2. No logos, no legible UI, no sci-fi interface, no commercial stock-photo posing.

**文件名**

`17-legacy-service-night-office-image2-v1.png`

**替代文本**

`深夜办公室里，一名年轻工程师独自面对显示复杂代码的屏幕梳理旧服务`

**图注**

`图 2：没有成熟工具的时候，复杂度只能靠人一层层理清。AI 生成的情境插图。`

### 5.2 图三：转正答辩——第一次没答好以后

**叙事任务**

表现转正答辩从不顺利到顺利之间真正发生的事情：不是突然逆转，而是接受反馈、重新组织问题、一次次演练。它同时让“感谢帮助过我的人”变得可见。

**插入位置**

放在以下段落之后：

> 转正从一开始的不顺利走到后面的顺利，我一直很感谢这些帮助。

**画面设计**

夜晚的小会议室，一名年轻工程师站在普通投影屏或电视屏前进行答辩演练，手里拿着翻页器并自然地做解释手势；两位同事坐在会议桌边认真听，一位在笔记本电脑上记录，另一位准备提出反馈。屏幕只呈现不可读的模糊版式，不出现任何公司标识或具体业务内容。桌上有开过会留下的水瓶、笔记本和线缆。镜头像在会议室角落旁观，不看镜头，不排队合影。

人物之间应有真实的注意力流向：演练者在努力讲清楚，同事在认真帮助他改进。避免塑造成培训课、公开演讲或胜利庆祝。

**生成提示词核心**

> Editorial documentary photograph for a Chinese personal tech memoir, a small conference-room rehearsal at night, one young software engineer standing near an ordinary presentation screen and explaining seriously with a clicker, exactly two colleagues seated at the table listening closely, one taking notes on a laptop and the other preparing candid feedback, subtle signs of a long working session such as notebooks, water bottles and cables, presentation layout visible only as unreadable shapes, observed from the corner of the room, restrained tension and mutual trust, natural office lighting, low saturation, subtle film grain, Fujifilm/Leica feeling, landscape 3:2. No logos, no readable slide text, no staged classroom pose, no celebration.

**文件名**

`18-conversion-rehearsal-image2-v1.png`

**替代文本**

`夜晚会议室里，一名工程师站在屏幕前演练，两位同事坐在桌边认真反馈`

**图注**

`图 3：第一次答得不好以后，后面的顺利来自一次次把问题重新讲清楚。AI 生成的情境插图。`

### 5.3 图四：周末积累——未来会重新连接的点

**叙事任务**

表现作者在没有项目要求、也不知道是否有用时，周末主动搭 Agent 平台和尝试大模型服务。这是文章里“connect the dots”真正成立的前因，也是后面获得 Agent 项目机会的入口。

**插入位置**

放在以下段落之后：

> 但一些当时没有答案的积累，会在未来某个机会里重新出现。

**画面设计**

一个有生活痕迹的家中书桌。自然的午后光线从侧面照进来，一名年轻工程师独自尝试尚未成熟的软件系统。桌面上有普通笔记本电脑、一块小型开发板、少量线缆、耳机、喝了一半的咖啡和随手记下的少量笔记。电脑界面只提供“正在搭建和试验”的抽象视觉证据，不可读。

场景要让人感到这是出于好奇心的自发探索，而不是正式项目、创业广告或赛博实验室。具体物件用于增加可信度，不能排列成产品陈列。

**生成提示词核心**

> Editorial documentary photograph for a Chinese personal tech memoir, a lived-in home desk on a weekend afternoon in soft natural side light, one young software engineer quietly experimenting with an unfinished software system, an ordinary laptop with unreadable interface shapes, one small development board, a few loose cables, headphones, half-finished coffee and casual notes, self-directed curiosity rather than a formal assignment, candid side or rear view, low saturation, subtle film grain, Fujifilm/Leica feeling, intimate and believable, landscape 3:2. No logos, no readable UI, no AI robot, no futuristic laboratory, no product display, no commercial stock-photo pose.

**文件名**

`19-weekend-agent-prototyping-image2-v1.png`

**替代文本**

`周末自然光照进生活化工作空间，一名工程师独自试验尚未成熟的软件系统`

**图注**

`图 4：当时不知道有没有用的积累，后来成了机会的入口。AI 生成的情境插图。`

## 6. 明确禁用项

三张新图全部禁用以下视觉语言：

- 纸张、手稿、旧书页、折痕、宣纸、牛皮纸等“纸张感”。
- 墨迹、毛笔、铅笔草图、伪手绘、拼贴、剪贴簿。
- 星空、宇宙、发光轨道、漂浮粒子、神秘能量线。
- 思维导图、流程图、框线图、标签墙、卡片阵列、信息图。
- 为表达技术而强行加入 CPU、内存、SSD 等物品的静物陈列。
- 机器人、人形 AI、大脑、芯片、闸门、天平、卡尺、齿轮等陈词滥调。
- 未来实验室、HUD、透明屏、霓虹赛博空间。
- 海报标题、页眉、页脚、页码、角标、边框、装饰性大字。
- 公司商标、产品 Logo、可读的代码、UI、文档或投影文字。
- 商务图库式握手、看镜头微笑、过度整洁的样板办公室。

## 7. 图注、真实性与证据边界

真实照片与 AI 情境插图必须在读者感知上清楚区分：

- 真实照片用事实性图注，记录奖品、现场、队友与奖项。
- AI 图片统一在图注结尾写明“AI 生成的情境插图”。
- AI 图片不得复制真实照片中的人物面容，不得暗示它是当年的现场记录。
- 图中的代码、投影与工作内容保持不可读，不伪造公司内部资料。
- 图片补充的是情绪与场景理解，不承担对任何技术细节或组织事实的举证责任。

## 8. 最终图序与版式

发布后正文共七张图：

1. 图 1：第一次 1024 比赛获得的 Pico。
2. 图 2：第一个项目，深夜梳理旧服务的情境插图。
3. 图 3：转正答辩后的演练与反馈情境插图。
4. 图 4：周末主动尝试 Agent 平台的情境插图。
5. 图 5：第二次 1024 比赛现场分享。
6. 图 6：第二次 1024 比赛与队友合影。
7. 图 7：第二次 1024 比赛的一等奖与创新奖。

版式规则：

- 图 1、图 2、图 3、图 4、图 7 单图居中展示。
- 图 5 与图 6 保持宽屏双栏、窄屏单栏的响应式图片组。
- 三张新图使用完全一致的 3:2 输出比例，不在 Markdown 或 CSS 中做破坏性裁切。
- 图注延续现有文章的居中、弱化样式，AI 声明不得省略。

## 9. 实施范围

实施阶段需要完成：

1. 使用 ImageGen 分别生成三张原始图片，不在本地另行叠字、叠框或拼版。
2. 逐张检查人物动作、场景可信度、屏幕文字、Logo 与统一风格；不合格则重新生成，不靠后期遮盖核心问题。
3. 将通过检查的图片加入文章资产目录，并使用本文约定的文件名。
4. 修改《云图回忆录》Markdown：撤下四张旧 AI 图，插入三张新图，更新全部图号与图注。
5. 保留第二次比赛两张照片的一行双图布局。
6. 本地构建并检查桌面与移动端文章页面。
7. 发布为文章的新修订版本。若当前线上版本仍为 revision 6，则本次发布预期成为 revision 7；实际版本号以发布接口返回为准。

## 10. 验收标准

只有同时满足以下条件，才可以发布：

- 正文只包含四张真实照片和三张新情境插图，共七张图。
- 四张被否决的旧 AI 图在文章源码与线上页面中均无引用。
- 三张新图分别能在不读图注时让人感到“独自梳理复杂项目”“有人帮助演练与修正”“周末出于好奇主动探索”，但不会被误认成技术教程图。
- 三张图没有纸张、手稿、墨迹、星空、信息图、标签、框线或赛博 UI。
- 图片中无 Logo、无可辨认的内部信息、无明显乱码文字。
- 三张图的色调、摄影语言、比例和视觉密度统一。
- 所有 AI 图注明确标明其为 AI 生成的情境插图。
- 七个图号连续、图注与内容对应。
- 现场分享与队友合影在桌面端一行两张，在窄屏下自然堆叠。
- 本地构建通过，线上文章可访问，图片全部加载成功。

## 11. 设计依据

- Burns Writing：文章以事实、个人判断和成长弧线为核心；配图必须保持活人感，不替作者制造不存在的经历。
- Guizang Image 2.0 配图方法：先决定图片承担的叙事角色，再决定类型与比例；本组采用 Type 1 人物纪实风，不使用把概念堆成海报的信息图方法。
- 用户反馈：彻底移除纸张感、手稿感、墨迹、星空和过度抽象的概念图；图片要言之有物、有调性，但不能退化成思维导图或框线图。
