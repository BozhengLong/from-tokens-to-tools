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

## 3. 技术栈

- Vite + React + TypeScript
- Tailwind(白板主题:米白 `#FAF7F0` / 墨黑 `#1A1A1A` / 强调蓝 `#2C5282` / 强调橙 `#DD6B20`)
- Framer Motion(scroll-linked animations)
- **Zustand**(全局 state:current example / current language / 各 station 的动画
  timeline 进度 / `ToolOutputStore`)。轻、对 Framer Motion 友好、不用 Context 嵌套
- **Zod**(运行时 JSON schema 校验,见 §11)
- KaTeX(只用于 Station 3 的 softmax 公式;通过 dynamic import 懒加载,不进首屏 bundle)
- Patrick Hand / Caveat 字体(手写体,自托管 woff2,通过 CSS `font-display: swap`
  懒加载,首屏先用系统衬线)
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
- **Visual:** 4 条彩色采样路径动画(greedy / top-k=5 / top-p=0.9 / temperature=1.5),
  从同一个 baseStep 分岔出去。
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
- **Interact:** 并行步进两侧;到任意时点暂停看对比;切换不同 example 看两种拓扑
  对相同任务的差异表现。
- **钩子:** "同一个任务,两种 agent。一个是'走着看',一个是'想清楚再走'。
  真实的 Claude / Codex 是两者混合。"
- **教学点:** Deliberative 拓扑提前承诺了路径,如果中途某步失败/被环境改变,
  reactive 能调整,deliberative 会撞墙。这是 agent 设计里真实存在的权衡 ——
  我们不用造一个深度任务树来强行展示"规划",规划本身的存在与权衡才是要讲的东西。

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

**final-action 工具有真副作用**(详见 §8):
- `send_notification` → 真 `new Notification(...)`,无权限时降级 toast
- `save_tweet_draft` → 真 `navigator.clipboard.writeText(...)`,把 tweet 文本写到剪贴板
- `save_recommendation` → 真 `localStorage.setItem(...)`,下次访问能在 onboarding 处看到上次的推荐

这样 Station 5 钩子"**你的代码**动你的硬盘 / 浏览器"在每个 example 都有可证实的兑现 ——
不是纯展示用的"假交付物"。

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
   不删中间几句话。
5. **双语:** 同一 prompt 跑两次(zh / en),分别存,承认两种语言下推理路径
   可能略有不同。每个 example 的总录制量约为:logits ×1 + sampling ×4 + 
   function-calls ×1 + agent-loops ×2(reactive + deliberative) = ~8 次模型调用,
   ×2 语言 = ~16 次。4 examples 约 64 次模型调用,gpt-4.1 总成本估算 $3-8。
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
│   │   ├── tokenize.json
│   │   ├── logits.json
│   │   ├── sampling.json
│   │   ├── function-calls.json
│   │   ├── execution.json        # live 工具的缓存 observation(运行时默认源)
│   │   └── topology.json         # Station 6 读 .reactive,Station 7 读完整(避免重复存)
│   ├── shanghai-weather/
│   ├── wikipedia-tweet/
│   └── hn-weekend-pick/
├── sandboxes/
│   └── downloads-bigfiles/
│       └── fs.json              # 虚拟 FS 初始状态,真实文件元数据(含大小)
└── i18n/{zh,en}.ts
```

### 7.2 核心 TypeScript 类型(`src/types/recording.ts` 节选)

```ts
type ToolSpec = {
  name: string;                  // 例如 "list_directory"
  description: { zh: string; en: string };
  parameters: JSONSchema;        // OpenAI function calling 的 schema 格式
};

type Example = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: ToolSpec[];             // 该 example 允许使用的工具集
};

type TokenizeData = {
  prompt: string;
  tokens: Array<{ id: number; text: string; byteRange: [number, number] }>;
};

type LogitsData = {
  steps: Array<{
    stepIndex: number;
    contextPreview: string;
    topK: Array<{ token: string; tokenId: number; logprob: number }>;
  }>;
};

type SamplingData = {
  baseStep: number;
  baseStepLogprobs: Array<{ token: string; tokenId: number; logprob: number }>;
  // 4 条 path 来自 4 次独立的 OpenAI 调用,共享前缀 prompt(到 baseStep 为止),
  // 只换 sampling 参数,各自录完整后续序列
  paths: Array<{
    method: 'greedy' | 'topK' | 'topP' | 'temperature';
    params: Record<string, number>;
    tokens: string[];  // 真实录制的后续 token 序列,长度 ~15-25
  }>;
};

type FunctionCallData = {
  reasoning: { zh: string; en: string };
  toolCandidates: Array<{ name: string; logprob: number }>;
  call: { name: string; arguments: Record<string, unknown> };
};

type AgentLoopData = {
  iterations: Array<{
    thought: { zh: string; en: string };       // 从 ReAct prompt 强制输出的 "Thought:" 行 parse 出
    action: { name: string; arguments: Record<string, unknown> };
    observation: unknown;
  }>;
  terminationReason: 'text-final' | 'final-action-called' | 'max-iter';
  terminationNote: { zh: string; en: string };  // 给用户看的一句话解释
};

type TopologyComparisonData = {
  // Station 7 用:同一 example,两种 agent 拓扑各跑一遍
  reactive: AgentLoopData;       // 复用 Station 6 的格式
  deliberative: {
    plan: Array<{
      id: string;
      stepLabel: { zh: string; en: string };
      expectedToolCall?: { name: string; arguments: Record<string, unknown> };
    }>;
    execution: Array<{
      planStepId: string;
      actualCall: { name: string; arguments: Record<string, unknown> };
      observation: unknown;
    }>;
    notes: { zh: string; en: string };  // "plan 与 execution 是否完全吻合"的说明
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
| `send_notification({title, body})` | **是** | `ctx.notify({title, body})`,返回 `{delivered, channel}` |
| `fetch_wikipedia_article(title)` | 否 | `ctx.fetch('https://en.wikipedia.org/w/api.php?action=parse&page=...&prop=text&format=json&origin=*')`,从返回 HTML 抽 plain text |
| `save_tweet_draft({text})` | **是** | 校验 `text.length <= 280`;`ctx.clipboard.writeText(text)`;UI 渲染推文卡片;返回 `{copiedToClipboard: true, length}` |
| `fetch_hn_top()` | 否 | `ctx.fetch('https://hacker-news.firebaseio.com/v0/topstories.json')`,取前 30 |
| `fetch_hn_story(id)` | 否 | `ctx.fetch('https://hacker-news.firebaseio.com/v0/item/{id}.json')` |
| `save_recommendation({story_id, title, reason})` | **是** | `ctx.storage.setItem('last-rec', JSON.stringify({...}))`;UI 渲染推荐卡片;返回 `{saved: true, key: 'last-rec'}` |

**沙箱 + 工具的不变量:** 录制时和运行时跑同一份沙箱 fixture + 同一份工具实现,
所以"录制时的 observation"和"运行时实跑的 observation"必须一致。

- 📦 sandbox(内存 FS) + 💾 纯本地副作用(`save_*` / `send_notification`):
  状态完全确定,运行时实跑必然等于录制时 observation。
- 🌐 live API(weather / Wikipedia / HN): 远端会变。**v1 默认用 `execution.json`
  缓存里的 observation,不真调 live**,以保证与模型预录 reasoning 一致;
  Station 5 提供一个"🔄 从 live 刷新"按钮,点击后真调一次 API,UI 显著标注
  "刷新结果与预录推理可能不符 —— 这正是预录 demo 的局限,v1.1 Live 模式会解决"。
  Wikipedia API 对客户端 CORS 友好(`origin=*`),且无 rate limit 焦虑。

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
| `logits.ts` | **纯文本回答模式**(不带 tools),OpenAI Chat Completions `logprobs:true, top_logprobs:20, temperature: 1.0`。抓答复中 8-12 个有教学意义的 step | 1 |
| `sampling.ts` | 从 logits 录制中选一个 baseStep。**跑 4 次** OpenAI,共享前缀 prompt 到 baseStep,各自换 sampling 参数(greedy / top_k=5 / top_p=0.9 / temperature=1.5),录后续 ~20 token | 4 |
| `function-calls.ts` | **带 tools 模式**,system prompt 要求 `Thought: <一句话>\n然后调工具`,跑一次拿 reasoning + tool call。再跑两次额外抓 top-3 候选工具 | 1-3 |
| `agent-loops.ts` | 跑两次完整 agent loop:`--mode=reactive` 用 ReAct 风 prompt;`--mode=deliberative` 用"先输出 plan,然后按 plan 执行"风 prompt。`MAX_ITERATIONS=10`。两次都用 `src/tools/*` + Node-context 真实执行工具 | 2 |
| `cache-live.ts` | 对每个 🌐 live 工具调一次,把 observation 缓存到 `execution.json`,作为运行时默认数据源 | 0(只调 public API) |

**总录制量估算:** 每 example ~8 次模型调用,× 2 语言 = ~16 次,× 4 example = ~64 次
gpt-4.1 调用,总成本约 $3-8。

**System prompt 模板**(每个 example 在 `manifests/<example-id>.yaml` 单独配置后
合并通用骨架):

```
You are an autonomous agent. Available tools: <tool list>.

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
```

**约定:**

- 录制脚本读 `process.env.OPENAI_API_KEY` 和 `process.env.OPENAI_BASE_URL`
  (后者允许指向自托管的 LiteLLM 代理)。
- `.env.example` 提供模板,`.env` 进 `.gitignore`。
- **运行时不需要任何 API key**:所有预录 JSON 在 repo 里。
- 运行 `npm run record -- --example=<example-id>` 触发该例子的全部脚本。
- 模型默认 `gpt-4.1`,具体在 `scripts/record/config.ts` 里定义。
- 录制脚本输出的 JSON 在落盘前用 Zod schema 校验一遍(类型与 §7 对齐),
  防止结构漂移。
- **Node 版本:** ≥ 18(为内置 fetch)。脚本用 `tsx` 直接跑 TS,不需要预编译。

## 10. UI / 样式 / i18n

- 白板主题: 米白底 `#FAF7F0` + 墨黑文字 `#1A1A1A` + 强调蓝/橙;手写体仅用于
  标题和钩子文案,正文用无衬线(Inter)。所有文字-背景对比度 ≥ WCAG AA(4.5:1)。
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

**Zod 校验:** 所有 `data/examples/*/*.json` 在 React 组件首次读取时通过 `src/types/
schemas.ts`(由 §7 的 TS 类型生成对应 Zod schema)校验。校验失败直接走"录制数据
未就绪"占位 —— **绝不允许半残的数据混进 UI 渲染**。

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

- 首屏 < 300KB gzip(React + Framer Motion + Tailwind 大致占 150KB,加壳和第一个
  例子的数据)
- 切例子时新例子的数据 < 100KB gzip
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
│   │   ├── stations/           # Tokenize / Logits / Sampling / FunctionCall / Execution / AgentLoop / TopologyComparison
│   │   ├── layout/             # Header / ProgressBar / ExampleSelector / LanguageToggle
│   │   └── shared/
│   ├── hooks/                  # useExample / useLanguage / useStationData / useScrollProgress
│   ├── tools/                  # list_directory / get_file_size / get_weather / send_notification / fetch_wikipedia_article / save_tweet_draft / fetch_hn_top / fetch_hn_story / save_recommendation
│   ├── runtime/                # browser-context.ts(ToolContext 浏览器版)
│   ├── state/                  # Zustand stores
│   ├── data/
│   │   ├── examples/<example-id>/<station>.json
│   │   ├── sandboxes/<example-id>/fs.json
│   │   └── i18n/{zh,en}.ts
│   ├── types/
│   └── utils/sampling.ts
├── scripts/record/             # config.ts / node-context.ts / tokenize.ts / logits.ts / sampling.ts / function-calls.ts / agent-loops.ts / cache-live.ts / manifests/<example-id>.yaml
└── docs/
    ├── recording-notes.md      # 录制流程 + 系统 prompts + 数据完整性规则
    └── superpowers/specs/      # 本文件所在目录
```
