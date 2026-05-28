# from-tokens-to-tools — Design

**Date:** 2026-05-29
**Status:** Approved (pre-implementation)

## 0. 一句话

一份可滚动的可视化长文,从"模型只是个概率机器"走到"这个概率机器在控制我的电脑",
回答**"为什么一个生成 token 的东西能让我的电脑做事"**。

## 1. 项目目标

主要受众是作者本人(学习目的),次要受众是有基础工程背景、对 LLM agent 感到好奇但
未深入了解的读者。

成功标准:

- 读者读完后,能用自己的话回答"为什么 token 生成器能控制电脑";
- 前 6 站揭示一连串"约定"(切词 → softmax → 采样 → schema → 执行 → 循环),
  把"概率机器"和"控制电脑"之间的鸿沟拆成 6 层。Station 7 不是第 7 层约定,
  而是同一套约定下的 agent 设计权衡(reactive vs deliberative);
- demo 在静态部署下零 API key 即可完整运行。

## 2. 总体形态

- **单页 SPA**,垂直滚动,7 个 station 章节纵向排列。
- **顶部固定栏:** 滚动进度条 / 例子切换(4 个胶囊按钮)/ 语言切换(zh ↔ en)。
- 每站结构: 站名 → 引子文案 → 主可视化区(可交互)→ 解释卡片 → 滚动触发下一站。
- 站间过渡:Framer Motion `useScroll` + `useTransform`,不走路由切换。
- **例子切换:保留滚动位置,只 swap 数据 context,并把当前 station 的动画
  timeline 重置到 0**(因为新例子的同一站数据不同,继续播放会错乱)。Station
  1-(当前-1)显示新例子的"已看过"终态(final frame)。
- **语言切换:** 切语言时如果当前 station 有 in-flight 动画(逐字流出之类),
  重置当前 station 的 timeline 到 0,文案换语言后重播。其他 station 文本静默替换。
- **状态重置粒度(切例子 / 切语言时):** 重置范围包括 scroll-linked animation
  progress、Station 3 的 sampling 参数(temperature/top-k/top-p 回默认)、
  Station 5 的 observation 折叠态、Station 6 的 step-through 当前 iteration、
  Station 7 的并行步进位置 —— **所有 station 的交互状态都回到默认值**。Zustand
  store 提供一个 `resetAllStationState()` action。
- **初始 example:** 默认加载 `downloads-bigfiles`(本地沙箱、无网络依赖、最直观
  地贴近"控制电脑"主题)。
- **数据懒加载:** 首屏只 import 默认 example × 默认语言的 5 个 JSON。切例子或切
  语言时 `import('@/data/examples/' + id + '/topology.' + lang + '.json')` 等懒载,
  Vite 自动 code split。
- **Loading 态:** 切例子/切语言触发的 import 通常 50-200ms。期间当前 station 的
  内容透明度降到 0.4 + 显示一个小的"白板蹭笔"动画作为 loading 指示。加载完成后
  渐显新内容。**禁止白屏。**

## 3. 技术栈

- Vite + React + TypeScript
- Tailwind(白板主题:米白 `#FAF7F0` / 墨黑 `#1A1A1A` / 强调蓝 `#2C5282` / 强调橙 `#DD6B20`)
- Framer Motion(scroll-linked animations)
- **Zustand**(全局 state:current example / current language / 各 station 的动画
  timeline 进度 / `ToolOutputStore`)。轻、对 Framer Motion 友好、不用 Context 嵌套
- **Zod**(运行时 JSON schema 校验,见 §11)
- KaTeX(只用于 Station 3 的 softmax 公式;JS + CSS 都通过 dynamic import 懒加载,
  不进首屏 bundle)
- 字体全部**自托管 woff2**(零网络依赖):
  - **Patrick Hand / Caveat(手写体,只用于英文标题和钩子)** —— 这两个字体
    是 Latin-only,**zh 模式下中文标题自动 fall through 到系统手写体或无衬线**
    (`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei",
    sans-serif`)。"白板感"在 zh 模式靠 stroke 和布局营造,不强求手写体字体
  - Inter Variable(英文正文)—— subset 后 ~80KB woff2;`font-display: swap`
  - **中文正文**用系统字体栈,不打包 web 字体(完整 CJK web font 太重,subset
    工程量大,运行时受益有限);UI 默认走系统 `PingFang SC` / `Microsoft YaHei` /
    `Noto Sans CJK SC`
- 沙箱: 自研轻量内存 FS(`Map<path, {size, mtime}>`,只存元数据,无文件内容)。
  不引 `@zenfs/core` —— 该例子只用到 `list_directory` / `get_file_size`,真实 FS API 是 overkill
- 静态构建,部署到 Netlify / Vercel / GitHub Pages 任意

**模型提供商:全程 OpenAI(或 OpenAI 兼容代理)。** 同时支持 logprobs 和 function calling,
7 站叙事主体始终是同一个模型。录制时读 `OPENAI_API_KEY` + `OPENAI_BASE_URL` 两个环境变量,
后者允许指向自托管的 LiteLLM 代理。运行时零依赖。

## 4. 7 个 Station

主线: 模型只是个概率机器(1-3) → 概率机器吐出的字符串被外部 runtime 当指令(4-5)
→ 这个循环可以自驱动多步(6-7)。

### Station 1 · Tokenization

- **What:** 用户任务文本在 tiktoken `cl100k_base`(GPT-4 系列的 BPE)下被切成 token。
- **Visual:** 文本逐字符滑入 → "咔嚓"切成胶囊 → 每个胶囊带 token ID;
  hover 看 byte offset 和原始字符串。
- **CJK 边界处理:** BPE 是 byte-level,中文字符可能跨多个 byte token。胶囊上
  标注"占 N 个字节",hover 时高亮原文中对应的 byte range,即便它不是完整字符
  也照实展示(这本身就是教学点:"模型看到的不是字符,是 UTF-8 字节的 BPE 重组")。
- **实现注意:** `byteRange` 是 UTF-8 字节索引;JS 字符串是 UTF-16 code units。
  高亮映射需用 `TextEncoder.encode(prompt)` 得到字节数组,然后用累积长度反查
  字符串切片位置。封装在 `utils/byteToCharRange.ts`。
- **Interact:** 切换 example 重放;hover 任意 token 看高亮原文位置。
- **钩子:** "AI 不读字。它读的是这串数字。"

### Station 2 · Forward → Logprobs → 概率分布

- **What:** 前缀 prompt 喂入"一次前向",模型对下一个 token 给出一个 vocab 上的分布。
- **Visual:** 前缀 token 滑入抽象的"Transformer 黑盒"(白板上画的齿轮,故意不细究)→
  右边浮出 top-20 概率柱状图(横向条,按概率降序)。
- **数据真实性说明:** OpenAI 的 `logprobs:true, top_logprobs:20` 返回 top-20 的
  **logprobs**(不是完整 logits)。我们 `exp()` 后归一化得到 top-20 概率。完整 vocab
  分布我们看不到。UI 在小字标注"展示 top-20 概率,完整词表分布对外不可见"。
- **Interact:** 时间步滑块切换该 example 的不同 step 的分布(从预录里挑了 8-12 个有
  教学意义的步);hover 单根柱看具体 token 文本。
- **钩子:** "每一步,模型给出整个词表的可能性投票。我们能看到的是票数最高的 20 个。"

### Station 3 · Sampling(最 hands-on 的一站)

- **What:** 从 Station 2 的分布里挑下一个 token,并继续往后走若干步。
- **Visual:** 4 条彩色采样路径动画,从同一个 baseStep 分岔出去。
  4 条路径用 **OpenAI Chat Completions 实际支持的参数组合**(OpenAI 不支持 `top_k`,
  所以不用):
  - `greedy` (`temperature=0`)
  - `low-temp` (`temperature=0.5`)
  - `top-p` (`top_p=0.9, temperature=1.0`)
  - `high-temp` (`temperature=1.5`)
- **关键:这 4 条路径是真实模型跑 4 次的结果**,不是离线模拟。每条路径在录制时
  都是用对应的采样参数实跑 OpenAI(共享前缀 prompt,只改 sampling 参数),
  录下完整的 ~20 token 后续序列。详见 §9 `sampling.ts`。
- **Interact:** temperature 滑块 (0→2) 实时改变 baseStep 的分布柔化(纯前端在
  录制到的 top-20 logprobs 上重新 softmax,只影响 baseStep 这一步的视觉,不影响
  4 条已录路径);top-k / top-p 切换强调对应路径;"重新采样"按钮触发另一次
  实跑(可选,需 live key,默认禁用)。
- **温度变换的局限:** 由于我们只有 top-20,temperature 升高时本应"复活"的低概率
  长尾 token 看不见。UI 小字标注"温度只影响可见 top-20 内部的相对比例;真实的
  长尾分布我们看不到"。这本身也是个诚实的教学点。
- **钩子:** "看,'确定性' 是个滑块。"

### Station 4 · 结构化输出 / Function Call 决策(最关键的一站)

- **What:** 模型在被告知"你可以调这些工具"的前提下,生成的 token 序列被一个
  JSON schema 引导,凝固成一个 function call。
- **Visual:** 左侧模型的自然语言推理逐行流出;右侧同步把 JSON schema 字段高亮、
  填充;最后左侧的推理"凝固"成右侧一张 function call 卡片。
- **数据来源:** "推理 (Thought)"不是 OpenAI tool use 自带的字段。录制时通过
  ReAct 风 system prompt 强制模型在调用工具前先输出 `Thought: <一句话>`
  (见 §9 prompt 模板)。Station 4 展示的是 parse 出的 thought 文本 + 紧随
  其后的 tool_call。
- **Interact:** 点开"为什么是这个工具"看模型选工具时的 top-3 候选(预录)。
- **钩子:** "从'我想做 X'到'调用 `list_directory({path:"~/Downloads"})`' ——
  只是个特殊的 token 序列。"
- **这是全 demo 揭示"为什么 token 能控制电脑"的核心一站:答案就是约定 + 外部解析。**

### Station 5 · Tool Execution(沙箱)

- **What:** function call 卡片飞离模型区,进入外部 runtime 框,被实际执行,
  返回 observation。
- **Visual:** call 卡片飞入"沙箱框"(白板双线框)→ loading dots → 吐出
  observation JSON;旁边小字标注"这一步与 LLM 无关,是普通代码在执行"。
  Cached observation 用固定 600ms 假延时(让动画有节奏感);live API 用真实
  网络延时。
- **Interact:** 点 observation 展开看完整内容。
- **钩子:** "模型不会动你的硬盘。它生成字符串,**你的代码**动你的硬盘。"
- **运行时标注:**
  - 🌐 `live API` (cached) — 远端调用过,observation 来自 repo 里的缓存
  - 📦 `sandbox` — 浏览器内内存 FS,真执行
  - 💾 `local side-effect` — 真副作用,但作用域在浏览器本地(剪贴板 / localStorage /
    通知中心),不联网。详见 §8 "final-action 工具的真实副作用"

### Station 6 · Agent Loop

- **What:** Thought → Action → Observation 闭环,把 Station 4+5 串成多轮。
- **Visual:** 圆形回路示意图,三角节点轮流点亮;下方时间线展开每轮内容;
  到达终止条件时回路灯灭。
- **Interact:** 步进按钮(一步步推进);自动播放;点任意轮回看详情。
- **终止条件(三选其一,以先发生者为准):**
  1. 模型返回 text-only 响应(无 tool_calls 字段),`terminationReason = "text-final"`
  2. 模型调用 example 的 final-action 工具(每个 example 在 manifest 里显式声明
     哪些工具是 final-action,如 `send_notification` / `save_tweet_draft` /
     `save_recommendation`),`terminationReason = "final-action-called"`
  3. 达到 `MAX_ITERATIONS = 10` 兜底,`terminationReason = "max-iter"`
  录制时若命中 #3 视为录制失败,需调整 prompt 重录。
- **钩子:** "一个 while 循环。条件是模型自己说停。"

### Station 7 · Reactive vs Deliberative(两种 agent 拓扑)

- **What:** 同一个 example,用两种 agent 拓扑跑两遍,并列展示对比。
  - **Reactive(承接 Station 6):** ReAct 风格,模型走一步看一步,每轮重新决定
    下一个 tool call。
  - **Deliberative:** 先用一个特殊 system prompt 让模型**先输出完整 plan**(一份
    编号步骤列表),**然后**按 plan 逐步执行,中途不允许重新规划。
- **Visual:** 左右分栏。左侧 Station 6 的回路时间线(已建立)。右侧白板上先画出
  完整 plan(编号列表 + 箭头),然后每个 step 依次"打勾",观察过程中 plan 不变。
  iterations 列表很长时垂直滚动(单侧分栏内滚动,不影响页面滚动)。
- **Interact:** 步进控件默认**左右联动(lockstep)**,便于一对一对比;提供
  "解耦"切换让两侧独立步进。暂停 / resume 影响双侧。切换不同 example 看两种拓扑
  对相同任务的差异表现。
- **钩子:** "同一个任务,两种 agent。一个是'走着看',一个是'想清楚再走'。
  真实的 Claude / Codex 是两者混合。"
- **教学点:** Deliberative 拓扑提前承诺了路径,如果中途某步失败/被环境改变,
  reactive 能调整,deliberative 会撞墙。这是 agent 设计里真实存在的权衡 ——
  我们不用造一个深度任务树来强行展示"规划",规划本身的存在与权衡才是要讲的东西。

### Epilogue · 故事的收束

Station 7 之后页面到底。展示一段 2-3 句的总结(中英双语):
> "你刚才走过的 7 个台阶,每一步都是一个**约定**(或一个**设计选择**)。它们叠在
> 一起,把一个只会输出概率分布的神经网络,变成一个可以控制你电脑的 agent。
> 没有魔法,只有约定。"

收束段下方放 4 个链接:本项目源码 / `recording-notes.md`(看录制流程透明度)/
README roadmap / 致谢(列出引用的论文 / 参考站点,例如 3B1B、ReAct 论文、
OpenAI 文档)。

不放评论区、不放邮件订阅、不放分享按钮 —— 收束应该收束,不再要用户的下一个动作。

## 5. 4 个 Example

**Tool 的定义(严格):** 工具是**真代码执行的 I/O 或副作用**,模型本身无法完成。
模型用 reasoning 做的事(过滤、判断、总结、评分、挑选)**不是工具**,在 demo 里
它们留在 Station 4 的 reasoning 流里,不会出现在 Station 5 的执行框中。

| ID | 任务 | 工具(真代码) | final-action | 模型 reasoning 里做的 | Station 5 模式 |
|---|---|---|---|---|---|
| `downloads-bigfiles` | 列出 `~/Downloads` 里大于 1GB 的文件 | `list_directory`, `get_file_size` | 无(text-final 终止) | 按大小过滤、组织答案 | 📦 sandbox |
| `shanghai-weather` | 查上海明天天气 + 提醒带伞 | `get_weather`, `send_notification` | `send_notification` | 判断是否要提醒、撰写文案 | 🌐 cached + 💾 真 Notification API |
| `wikipedia-tweet` | 读 Wikipedia "Transformer (machine learning model)" 条目,写一条 ≤280 字符的 tweet 介绍它 | `fetch_wikipedia_article`, `save_tweet_draft({text})` | `save_tweet_draft` | 提炼要点、压缩到 280 字 | 🌐 cached(Wikipedia API)+ 💾 真剪贴板写入 |
| `hn-weekend-pick` | 拉 HN top 30,挑一个最适合周末读的 | `fetch_hn_top`, `fetch_hn_story(id)`, `save_recommendation({id, title, reason})` | `save_recommendation` | 评估周末适合度、挑选、写理由 | 🌐 cached(HN API)+ 💾 真 localStorage 写入 |

**final-action 工具有真副作用**(详见 §8;受浏览器 API 的用户手势约束做了适配):
- `send_notification` → 浏览器 `Notification.permission` 三分支处理(granted 真发 /
  denied 直接 toast / default 走 toast + 内嵌"启用通知"链接以满足手势要求)
- `save_tweet_draft` → 渲染推文卡片 + "📋 复制"按钮,**用户点击**才真调
  `navigator.clipboard.writeText`(规避 scroll-driven 回放无法满足用户手势的限制)
- `save_recommendation` → 真 `localStorage.setItem(...)`(无手势限制),下次访问
  在 onboarding 处看到上次的推荐

这样 Station 5 钩子"**你的代码**动你的硬盘 / 浏览器"在每个 example 都有可证实的兑现 ——
不是纯展示用的"假交付物",但也诚实承认浏览器安全模型对自动回放的限制。

## 6. 数据完整性规则

**这是本 demo 不容协商的规则。** 写在 `docs/recording-notes.md` 公开:

1. **模型输出 = 100% 真实。** reasoning / logprobs / tool call / 采样路径,
   全部来自实跑 OpenAI API,不修改一个字符。需要短就**重跑**直到拿到合适输出,
   或调整 system prompt(prompt 也存进 `recording-notes.md`)。
2. **Station 3 的 4 条采样路径 = 真跑 4 次。** 不离线模拟。每条路径在录制时
   独立调用 OpenAI,前缀 prompt 相同,只改 sampling 参数(`top_p` / `top_k` /
   `temperature`),录完整后续 token 序列。
3. **Tool 执行 = 真代码,真沙箱。** 不存在手编 observation。
4. **截断允许,改写禁止。** 文本太长用 `slice(0, n)` 截 + 省略号,
   不删中间几句话。具体规则:
   - reasoning / thought 文本:每个 ≤ 500 字符,超出尾部截
   - tool observation 文本字段(如 Wikipedia 文章正文):≤ 2000 字符,
     截后附 `"... [truncated, original N chars]"` 标记
   - **录制时模型看到的是完整 observation**(从工具实际返回),只是落盘进 JSON
     时截短。模型的下游推理基于完整内容,显示给用户的是截短版 —— 这一点 UI
     在 Station 5 标注"展示已截短,原长 N 字符"
5. **双语:** 同一 prompt 跑两次(zh / en),分别存,承认两种语言下**推理路径**
   **以及 tool 调用序列本身都可能不同**(模型在不同语言下可能 fetch 不同次数、
   选择不同 tool 顺序)。UI 不假设 zh / en 同构,Station 6 / 7 的 iterations
   长度和 plan 结构可以异质。**这本身是教学点:语言条件化影响 agent 行为。**
   每个 example 的总录制量约为:logits ×1 + sampling ×4 + function-calls ×1 +
   agent-loops ×2(reactive + deliberative) = ~8 次模型调用,×2 语言 = ~16 次。
   4 examples 约 64 次模型调用,gpt-4.1 总成本估算 $3-8。
6. **唯一一处"重算"允许:** Station 3 的 temperature 滑块在前端基于真实抓到的
   top-20 logprobs **重新 softmax**(只影响 baseStep 一步的视觉柔化,不影响已录的
   4 条完整路径),这是把模型的真实分布在 vocab 子空间里做温度变换 ——
   数学上正确,UI 标注清楚"温度只作用在 top-20 内部"。
7. **录制时模型 temperature = 1.0**(`sampling.ts` 除外,它故意改 temperature),
   以保证 logits.json 里的 logprobs 是干净的 `log P_θ(x)`。

## 7. 数据模型

### 7.1 目录布局

```
src/data/
├── examples/
│   ├── example-manifest.ts
│   ├── downloads-bigfiles/
│   │   ├── tokenize.zh.json
│   │   ├── tokenize.en.json
│   │   ├── logits.zh.json
│   │   ├── logits.en.json
│   │   ├── sampling.zh.json
│   │   ├── sampling.en.json
│   │   ├── function-calls.zh.json
│   │   ├── function-calls.en.json
│   │   ├── topology.zh.json
│   │   └── topology.en.json
│   ├── shanghai-weather/
│   ├── wikipedia-tweet/
│   └── hn-weekend-pick/
├── sandboxes/
│   └── downloads-bigfiles/
│       └── fs.json              # 虚拟 FS 初始状态,真实文件元数据(含大小)
└── i18n/{zh,en}.ts
```

**文件按语言拆的原因:** 两种语言的录制可能产生不同 iteration 数、不同 tool 序列
(见 §6 规则 #5)。如果用 `{zh, en}` 嵌套对象,无法表达"zh 5 轮、en 7 轮"。
所以每个数据文件内的 `thought` / `observation` / `terminationNote` / `reasoning`
都是**单语言纯字符串**,不再嵌套 `{zh, en}` 对象。
只有 manifest(`example-manifest.ts` 里的 `name` / `taskPrompt` /
`ToolSpec.description`)保留 `{zh, en}` 形式,因为那是录制配置 + UI 静态文案。

**运行时加载:** 当前选中的 example × 当前语言 = 一组 5 个 JSON 文件。语言切换时
重新 import 对应 `*.<lang>.json`。

### 7.2 核心数据 schema (`src/types/schemas.ts`,Zod-first)

**单一来源原则:用 Zod 写 schema,TS 类型用 `z.infer` 推出,Zod 同时承担运行时
校验。下面展示等价的 TS 类型签名以便阅读;实际仓库里的代码是对应的 Zod 定义。**

**类型分两层:**
- **manifest 层**(`example-manifest.ts`):保留 `{zh, en}` 双语对象,因为这是
  录制配置和 UI 静态文案
- **recording 层**(每个 example 目录下的 `*.zh.json` / `*.en.json`):**所有
  文本字段是单语言纯字符串**,因为两种语言的录制 shape 可能不同

```ts
// ========== manifest 层(双语) ==========
type ToolSpec = {
  name: string;                  // 例如 "list_directory"
  description: { zh: string; en: string };
  parameters: JSONSchema;        // OpenAI function calling 的 schema 格式
};

type Example = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: ToolSpec[];
};

// ========== recording 层(单语,每文件只装一种语言)==========

// 所有 recording JSON 文件统一带 _meta 头部,记录录制来源
type RecordingMeta = {
  model: string;                 // e.g. "gpt-4.1"
  recordedAt: string;            // ISO 8601
  scriptVersion: string;         // e.g. "logits.ts@a8e8a32"
  seed?: number;                 // sampling.ts 不带 seed,其他都带
  lang: 'zh' | 'en';
};

type TokenizeData = {
  _meta: RecordingMeta;
  prompt: string;                // 单语言:加载 tokenize.zh.json 拿 zh 版,反之亦然
  tokens: Array<{ id: number; text: string; byteRange: [number, number] }>;
};

type LogitsData = {
  _meta: RecordingMeta;
  steps: Array<{
    stepIndex: number;
    contextPreview: string;
    topK: Array<{ token: string; tokenId: number; logprob: number }>;
  }>;
};

type SamplingData = {
  _meta: RecordingMeta;
  baseStep: number;              // 从 logits.json 的 steps 里挑熵最高的那个 step 作为分岔点
  baseStepLogprobs: Array<{ token: string; tokenId: number; logprob: number }>;
  // 4 条 path 来自 4 次独立的 OpenAI 调用,共享前缀 prompt(到 baseStep 为止),
  // 只换 sampling 参数,各自录完整后续序列
  paths: Array<{
    method: 'greedy' | 'low-temp' | 'top-p' | 'high-temp';
    params: Record<string, number>;
    tokens: string[];            // 真实录制的后续 token 序列,长度 ~15-25
  }>;
};

type FunctionCallData = {
  _meta: RecordingMeta;
  reasoning: string;             // 单语言
  toolCandidates: Array<{ name: string; logprob: number }>;
  call: { name: string; arguments: Record<string, unknown> };
};

type AgentLoopData = {
  // 注意:这是 nested 类型,不直接对应一个 JSON 文件;_meta 在外层 TopologyData
  iterations: Array<{
    thought: string;             // 从 ReAct prompt 强制输出的 "Thought:" 行 parse 出
    action: { name: string; arguments: Record<string, unknown> };
    observation: unknown;        // 可能被截短到 2000 字符,见 §6 规则 #4
  }>;
  terminationReason: 'text-final' | 'final-action-called' | 'max-iter';
  terminationNote: string;       // 单语言
};

type TopologyData = {
  _meta: RecordingMeta;
  // 即 topology.zh.json / topology.en.json 的根 schema
  reactive: AgentLoopData;       // Station 5/6 都从这里取数据
  deliberative: {
    plan: Array<{
      id: string;
      stepLabel: string;         // 单语言
      expectedToolCall?: { name: string; arguments: Record<string, unknown> };
    }>;
    execution: Array<{
      planStepId: string | null; // null = 模型未按 plan 执行的 unplanned 步骤
      actualCall: { name: string; arguments: Record<string, unknown> };
      observation: unknown;
      deviated: boolean;
    }>;
    deviationSummary: string;    // 单语言
  };
};
```

## 8. 沙箱 & 工具

工具是真代码,放在 `src/tools/`,每个工具一个文件。**Tool 的 exec 函数通过依赖
注入接收平台能力**,以便同一份工具在浏览器(运行时)和 Node(录制脚本)两个
环境都能跑:

```ts
type Tool<Args, Result> = {
  name: string;
  schema: JSONSchema;
  isFinalAction?: boolean;       // 是否允许作为 agent loop 的终止动作
  exec(args: Args, ctx: ToolContext): Promise<Result>;
};

type ToolContext = {
  fs?: InMemoryFs;                                  // 内存 FS,仅 downloads 例子用
  notify: (n: { title: string; body: string }) => Promise<{
    delivered: boolean;
    channel: 'system' | 'toast' | 'mock';
  }>;
  clipboard: { writeText: (s: string) => Promise<void> };
  storage: { setItem: (k: string, v: string) => void; getItem: (k: string) => string | null };
  fetch: typeof fetch;                              // 录制时可注入带 cache 的版本
};
```

**ToolContext 的两套实现:**
- 浏览器版(`src/runtime/browser-context.ts`):`notify` 用 `Notification` API,
  `clipboard` 用 `navigator.clipboard`,`storage` 用 `localStorage`,`fetch` 用全局 fetch
- Node 版(`scripts/record/node-context.ts`):`notify` / `clipboard` / `storage` 都是
  mock(打 log + 把数据塞进 in-memory map),`fetch` 用 Node 18+ 的内置 fetch

| 工具 | final-action? | 执行方式 |
|---|---|---|
| `list_directory(path)` | 否 | `ctx.fs.list(path)`,fs 来自 `data/sandboxes/downloads-bigfiles/fs.json` 装入的 Map |
| `get_file_size(path)` | 否 | `ctx.fs.stat(path).size` |
| `get_weather(city, date)` | 否 | `ctx.fetch('https://api.open-meteo.com/v1/forecast?...')` |
| `send_notification({title, body})` | **是** | `ctx.notify({title, body})`,返回 `{delivered, channel}`。浏览器实现按 `Notification.permission` 三分:`granted` 真发系统通知;`denied` 直接 toast;`default` 走 toast + 角落渲染"启用系统通知"链接,链接 onClick 调 `requestPermission`(满足用户手势)|
| `fetch_wikipedia_article(title)` | 否 | `ctx.fetch('https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=' + encodeURIComponent(title) + '&format=json&origin=*')`,直接返回纯文本 lead section,无需 HTML 解析 |
| `save_tweet_draft({text})` | **是** | 校验 `text.length <= 280`;**UI 渲染推文卡片 + 一个"📋 复制"按钮**(浏览器要求 `clipboard.writeText` 在用户手势内调用,所以不在 agent loop 回放里自动写,而是等用户点按钮)。返回 `{cardRendered: true, text, length}`。点了复制按钮后再调 `ctx.clipboard.writeText` |
| `fetch_hn_top()` | 否 | 内部并行 `ctx.fetch('https://hacker-news.firebaseio.com/v0/topstories.json')` 拿 ID 列表,**取前 10 个 ID 并行 fetch 每个 item** 得到 `[{id, title, score, url?, type}, ...]`。一次返回带标题的 top 10,模型据此挑选要深入了解的少数几个 |
| `fetch_hn_story(id)` | 否 | `ctx.fetch('https://hacker-news.firebaseio.com/v0/item/{id}.json')`,返回 `{id, type, title, by, time, score, url?, text?, descendants?}`,其中 `text` 是 Ask HN / 评论的正文,`url` 是 link 类型的外链,二者通常二选一 |
| `save_recommendation({story_id, title, reason})` | **是** | `ctx.storage.setItem('last-rec', JSON.stringify({...}))`;UI 渲染推荐卡片;返回 `{saved: true, key: 'last-rec'}` |

**沙箱 + 工具的不变量:** 录制时和运行时跑同一份沙箱 fixture + 同一份工具实现,
所以"录制时的 observation"和"运行时实跑的 observation"必须一致。

- 📦 sandbox(内存 FS) + 💾 纯本地副作用(`save_*` / `send_notification`):
  状态完全确定,运行时实跑必然等于录制时 observation。
- 🌐 live API(weather / Wikipedia / HN): 远端会变。**v1 默认用 `topology.json`
  里录制时捕获的 observation,不真调 live**(observation 是 agent-loops.ts 实跑
  时的真实结果,落盘进 topology.json),以保证与模型预录 reasoning 一致;
  Station 5 提供一个"🔄 从 live 刷新"按钮,点击后真调一次 API。**刷新行为只更新
  Station 5 当前显示的 observation 卡片;Station 6/7 不受影响,因为它们的下游推理
  是基于录制时快照的**。刷新后 UI 显示一个浅黄横条:"⚠️ 你看到的是当前 live 数据。
  下面的 agent 推理仍来自录制时的快照(可能不符)。"诚实标注矛盾,比强行同步两边
  更教学友好。Wikipedia API 对客户端 CORS 友好(`origin=*`),且无 rate limit 焦虑。

**录制时使用 Node-context:** `send_notification` / `save_*` 实际不弹通知 /
不写真剪贴板,只产生 mock observation。这些 observation 仍是"真"的(由真代码
产生),只是其副作用形态在 Node 下是 mock。运行时浏览器跑同一份工具,会真触发
副作用。这一点在 `recording-notes.md` 公开说明。

## 9. 预录流程

`scripts/record/` 下的 Node + TS 脚本,**全部基于 OpenAI(或兼容代理)**,
**每个脚本对每个 example 都跑 zh / en 两次**:

| 脚本 | 干啥 | 调用次数 / example |
|---|---|---|
| `tokenize.ts` | 用 tiktoken (cl100k_base) 切 task prompt | 本地,0 API |
| `logits.ts` | **纯文本回答模式**(不带 tools),OpenAI Chat Completions `logprobs:true, top_logprobs:20, temperature: 1.0`。从完整答复里挑 8-12 个 step。挑选启发式(按命中顺序,直到凑齐 8-12):(1) 熵高于阈值(> 1.5 nats);(2) top-1 与 top-2 logprob 差距 < 1.0(model 在两个 token 间犹豫);(3) top-1 是空白 / 标点 / 格式 token(教学点"格式 token 吃掉很多概率");(4) 兜底用均匀采样补齐 | 1 |
| `sampling.ts` | 从 `logits.json` 的 steps 里**选熵最高**的那个作为 baseStep。**跑 4 次** OpenAI,共享前缀 prompt 到 baseStep,各自换 sampling 参数:greedy (`temperature:0`) / low-temp (`temperature:0.5`) / top-p (`top_p:0.9, temperature:1`) / high-temp (`temperature:1.5`);**故意不设 seed**(要看不同路径)。录后续 ~20 token | 4 |
| `function-calls.ts` | **带 tools 模式**,system prompt 要求 `Thought: <一句话>\n然后调工具`,跑一次拿 reasoning + tool call。再跑两次额外抓 top-3 候选工具 | 1-3 |
| `agent-loops.ts` | 跑两次完整 agent loop:`--mode=reactive` 用 ReAct 风 prompt;`--mode=deliberative` 用"先输出 plan,然后按 plan 执行"风 prompt。`MAX_ITERATIONS=10`。两次都用 `src/tools/*` + Node-context 真实执行工具 | 2 |
| (无独立 cache-live.ts) | live 工具的 observation 在 `agent-loops.ts` 实跑时已落盘到 `topology.json`,无需独立缓存脚本 | — |

**总录制量估算:** 每 example ~8 次模型调用,× 2 语言 = ~16 次,× 4 example = ~64 次
gpt-4.1 调用,总成本约 $3-8。

**`manifests/<example-id>.yaml` schema:**

```yaml
id: downloads-bigfiles               # example id,与目录名一致
name:
  zh: "找大文件"
  en: "Find big downloads"
taskPrompt:
  zh: "列出 ~/Downloads 里大于 1GB 的文件"
  en: "List files larger than 1GB in ~/Downloads"
tools:                               # 该 example 允许的 tool 名(实际定义在 src/tools/)
  - list_directory
  - get_file_size
finalActionTools: []                 # text-final 终止;无 final action 工具
systemPromptExtras:                  # 拼接到通用 system prompt 骨架后
  zh: ""
  en: ""
sandboxFixture: downloads-bigfiles   # 引用 src/data/sandboxes/<id>/fs.json,可选
```

**System prompt 模板**(通用骨架,manifest 的 `systemPromptExtras` 拼到末尾):

```
You are an autonomous agent. Available tools: <tool list>.

LANGUAGE: Respond ONLY in <zh-CN | en>. All "Thought:" lines, intermediate text,
and final answer must be in that language. Tool arguments (paths, IDs) are
language-neutral and stay as-is.

CRITICAL FORMAT RULES:
1. Before EVERY tool call, output exactly one line starting with "Thought: " 
   that explains in ≤1 sentence why you are calling this tool.
2. Then call the tool via the function-calling protocol.
3. When the task is complete, respond with text only (no tool call). Your final
   text should be a clear answer to the user.
4. If a final-action tool exists for this task (<finalActionToolName>), prefer
   ending by calling it.

<deliberative-only:>
First, output a numbered plan (1. 2. 3. ...) of the tool calls you intend to make.
Then execute the plan in order without revising it. If a step fails, continue to
the next step and note the failure in your final response.
</deliberative-only>

<example-specific extras: e.g. for hn-weekend-pick:>
Before recommending, fetch full details of AT LEAST 5 top stories so you can
score by content, not just title.
</example-specific>
```

**录制脚本的错误处理:**
- 工具调用失败(网络 5xx / Wikipedia 503 / 等)→ 重试 3 次,指数退避(1s/3s/9s)
- 仍失败 → 脚本 exit code 非零,人工介入决定重试或调整 prompt
- **CI 不跑录制脚本**。录制是一次性 artifact,commit 进 git,重录是有意为之的更新

**约定:**

- 录制脚本读 `process.env.OPENAI_API_KEY` 和 `process.env.OPENAI_BASE_URL`
  (后者允许指向自托管的 LiteLLM 代理)。
- `.env.example` 提供模板,`.env` 进 `.gitignore`。
- **运行时不需要任何 API key**:所有预录 JSON 在 repo 里。
- 运行 `npm run record -- --example=<example-id>` 触发该例子的全部脚本。
- 模型默认 `gpt-4.1`,具体在 `scripts/record/config.ts` 里定义。
- **`seed` 参数**:除 `sampling.ts` 外的所有脚本都设 `seed`(在 `config.ts` 里
  定义,如 `seed: 42`),保证模型不变情况下可复现重录。sampling.ts 不设 seed
  以保留路径间的真实差异。
- **每个录制 JSON 包含 `_meta` 字段**记录来源:`{model, recordedAt, scriptVersion,
  seed?: number, lang: 'zh'|'en'}`,便于后续追踪和 debug。Zod schema 把 `_meta`
  作为必填头部。
- 录制脚本输出的 JSON 在落盘前用 Zod schema 校验一遍(类型与 §7 对齐),
  防止结构漂移。
- **Node 版本:** ≥ 18(为内置 fetch)。脚本用 `tsx` 直接跑 TS,不需要预编译。

## 10. UI / 样式 / i18n

- 白板主题: 米白底 `#FAF7F0` + 墨黑文字 `#1A1A1A` + 强调蓝/橙。手写体(Patrick
  Hand / Caveat)只在 **en 模式**的标题/钩子用;**zh 模式**标题用系统 CJK 字体
  (`PingFang SC` 等)。正文统一无衬线(Inter for en、系统字体 for zh)。所有
  文字-背景对比度 ≥ WCAG AA(4.5:1)。
- 动画原则: 只用 transform / opacity,不触发 layout;每个 station 内部动画
  绑定 0-1 的 scroll progress(站内进度,不是全局)。
- i18n: `src/data/i18n/{zh,en}.ts` 导出嵌套 key-value;组件用 `useLanguage()`
  hook 读。静态 UI 文本(按钮、说明)切语言时直接换;in-flight 动画文本按
  §2 的规则重置当前 station timeline。
- **目标浏览器:** 最近 2 个主版本的 Chrome / Safari / Firefox / Edge。
  不支持 IE、不为 Safari < 16 做兼容。
- **可访问性:** keyboard navigation(tab 切换控件 / space 触发);所有交互
  控件有 aria-label;手写字体在 prefers-reduced-motion 下不旋转/不抖。**没有更
  深入的 a11y 工作**(动画为主的可视化天然对屏幕阅读器不友好,认领这个 trade-off)。

## 11. 错误处理

| 场景 | 处理 |
|---|---|
| 例子 JSON 加载失败 / Zod 校验失败 | 该 station 占位"录制数据未就绪或不合规",其他站正常;开发模式下控制台 dump Zod 错误明细 |
| Live API 调用(用户点🔄刷新时)失败 | 显示 toast "实时调用失败,继续展示缓存结果",不破坏当前 station 状态 |
| Notification 权限被拒 | 降级为页内 toast,文案说明"系统通知被拒,改用页内提示" |
| 剪贴板写入失败(`save_tweet_draft`,权限或环境限制) | UI 显示"复制失败,请手动复制下方文本",同时展示文本框可手动选中 |
| 内存 FS 加载 fixture 失败 | downloads 例子的 station 5/6/7 占位"沙箱数据加载失败" |

**Zod 校验:** 所有 `data/examples/*/*.{zh,en}.json` 在 React 组件首次读取时通过
`src/types/schemas.ts` 的 Zod schema(§7 的 TS 类型由 Zod 推出,Zod 是单一来源)
校验。校验失败直接走"录制数据未就绪"占位 —— **绝不允许半残的数据混进 UI 渲染**。

**不做:** 全局错误边界、Sentry、重试策略、错误上报。

## 12. 测试

- vitest 单测覆盖纯函数: `utils/sampling.ts`(top-k / top-p / temperature 重算)、
  `src/tools/*` 的本地实现(对着 mock ToolContext 跑)、Zod schemas(typecheck 之外
  跑几组合法/非法样例)。
- 组件不写测试。
- 录制脚本不写测试,但**输出的 JSON 必须通过 Zod 校验**(脚本内自检,失败立即报错
  退出)。
- 不做 E2E / Playwright。

## 13. YAGNI(v1 明确不做)

- Live 模式(用户填 API key 真调模型)
- 账号 / 保存进度 / 分享带状态的 URL
- SSR / SEO
- 移动端深度适配(做到不破版即可)
- 5 个以上 example
- 自定义主题 / 黑白模式
- 自定义 tokenizer / 自定义模型
- 集成 IDE 代码高亮 / monaco
- 中英以外的语言

## 14. Roadmap(README 注明,不在 v1 工作量内)

- **v1.1 Live 模式**:用户填 baseURL + apiKey + provider(Anthropic / OpenAI /
  Ollama / OpenRouter),Station 2/4/6 切到真调。key 只存 localStorage,
  无后端。
- **v1.2 用户自定义 example**:填 prompt + 选工具,触发一次 live 录制,
  落地新 example。
- **v1.3 可分享的路径快照**:把滚动位置 + 例子 ID + 采样参数编码到 URL。

## 15. 性能预算

- 首屏 < 300KB gzip(基线估算:React+ReactDOM ~45KB / Framer Motion ~50KB /
  Tailwind purged ~10KB / Zustand+Zod ~10KB / Inter Variable subset ~80KB /
  Patrick Hand+Caveat woff2 各 ~10KB / 默认 example 的 5 个 JSON ~50KB)
- 切例子或切语言时新数据 < 100KB gzip
- KaTeX(JS+CSS ~80KB)和 Wikipedia 的 plain text 提取依赖,**全部懒载**,不进首屏
- 滚动 60 fps(动画只用 transform / opacity)

## 16. 完整目录结构

```
from-tokens-to-tools/
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── .gitignore
├── public/
│   └── fonts/                  # Caveat / Patrick Hand
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/theme.css        # 白板主题
│   ├── components/
│   │   ├── whiteboard/         # InkArrow / ChalkText / TokenChip / ProbBar
│   │   ├── stations/           # Tokenize / Logits / Sampling / FunctionCall / Execution / AgentLoop / Topology / Epilogue
│   │   ├── layout/             # Header / ProgressBar / ExampleSelector / LanguageToggle / Epilogue
│   │   └── shared/
│   ├── hooks/                  # useExample / useLanguage / useStationData / useScrollProgress
│   ├── tools/                  # list_directory / get_file_size / get_weather / send_notification / fetch_wikipedia_article / save_tweet_draft / fetch_hn_top / fetch_hn_story / save_recommendation
│   ├── runtime/                # browser-context.ts(ToolContext 浏览器版)
│   ├── state/                  # Zustand stores
│   ├── data/
│   │   ├── examples/<example-id>/<station>.{zh,en}.json
│   │   ├── sandboxes/<example-id>/fs.json
│   │   └── i18n/{zh,en}.ts
│   ├── types/
│   └── utils/sampling.ts
├── scripts/record/             # config.ts / node-context.ts / tokenize.ts / logits.ts / sampling.ts / function-calls.ts / agent-loops.ts / manifests/<example-id>.yaml
└── docs/
    ├── recording-notes.md      # 录制流程 + 系统 prompts + 数据完整性规则
    └── superpowers/specs/      # 本文件所在目录
```
