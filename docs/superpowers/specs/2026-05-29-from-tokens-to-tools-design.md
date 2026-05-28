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
- 7 个 station 的每一站都揭示**一个新的"约定"**(切词约定 → softmax 约定 →
  采样约定 → schema 约定 → 执行约定 → 循环约定 → 规划约定),把"概率机器"和
  "控制电脑"之间的鸿沟拆成 7 个台阶;
- demo 在静态部署下零 API key 即可完整运行。

## 2. 总体形态

- **单页 SPA**,垂直滚动,7 个 station 章节纵向排列。
- **顶部固定栏:** 滚动进度条 / 例子切换(4 个胶囊按钮)/ 语言切换(zh ↔ en)。
- 每站结构: 站名 → 引子文案 → 主可视化区(可交互)→ 解释卡片 → 滚动触发下一站。
- 站间过渡:Framer Motion `useScroll` + `useTransform`,不走路由切换。
- 例子切换:重置滚动到顶,swap 数据 context。

## 3. 技术栈

- Vite + React + TypeScript
- Tailwind(白板主题:米白 `#FAF7F0` / 墨黑 `#1A1A1A` / 强调蓝 `#2C5282` / 强调橙 `#DD6B20`)
- Framer Motion(scroll-linked animations)
- KaTeX(零星公式)
- Patrick Hand / Caveat 字体(手写体,做"白板感"标题)
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

- **What:** 用户任务文本在 BPE 分词器下被切成 token。
- **Visual:** 文本逐字符滑入 → "咔嚓"切成胶囊 → 每个胶囊带 token ID;
  hover 看 byte offset 和原始字符串。
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

- **What:** 从 Station 2 的分布里挑下一个 token。
- **Visual:** 同一份 top-20 分布上,叠加 4 条彩色采样路径动画
  (greedy / top-k=5 / top-p=0.9 / temperature=1.5)。
- **Interact:** temperature 滑块 (0→2) 实时改变分布柔化(纯前端在 logprobs 上
  重新 softmax);top-k / top-p 切换;"重新采样"按钮看随机路径。
- **温度变换的局限:** 由于我们只有 top-20,temperature 升高时本应"复活"的低概率
  长尾 token 看不见。UI 小字标注"温度只影响可见 top-20 内部的相对比例;真实的
  长尾分布我们看不到"。这本身也是个诚实的教学点。
- **钩子:** "看,'确定性' 是个滑块。"

### Station 4 · 结构化输出 / Function Call 决策(最关键的一站)

- **What:** 模型在被告知"你可以调这些工具"的前提下,生成的 token 序列被一个
  JSON schema 引导,凝固成一个 function call。
- **Visual:** 左侧模型的自然语言推理逐行流出;右侧同步把 JSON schema 字段高亮、
  填充;最后左侧的推理"凝固"成右侧一张 function call 卡片。
- **Interact:** 点开"为什么是这个工具"看模型选工具时的 top-3 候选(预录)。
- **钩子:** "从'我想做 X'到'调用 `list_directory({path:"~/Downloads"})`' ——
  只是个特殊的 token 序列。"
- **这是全 demo 揭示"为什么 token 能控制电脑"的核心一站:答案就是约定 + 外部解析。**

### Station 5 · Tool Execution(沙箱)

- **What:** function call 卡片飞离模型区,进入外部 runtime 框,被实际执行,
  返回 observation。
- **Visual:** call 卡片飞入"沙箱框"(白板双线框)→ loading dots → 吐出 observation JSON;
  旁边小字标注"这一步与 LLM 无关,是普通代码在执行"。
- **Interact:** 点 observation 展开看完整内容。
- **钩子:** "模型不会动你的硬盘。它生成字符串,**你的代码**动你的硬盘。"
- **运行时标注:** 🌐 `live API`(真网请求)或 📦 `sandbox`(浏览器内虚拟 FS),
  **两者都是真执行,demo 不存在"伪造 observation"**。

### Station 6 · Agent Loop

- **What:** Thought → Action → Observation 闭环,把 Station 4+5 串成多轮。
- **Visual:** 圆形回路示意图,三角节点轮流点亮;下方时间线展开每轮内容;
  到达"任务完成"判定时回路灯灭。
- **Interact:** 步进按钮(一步步推进);自动播放;点任意轮回看详情。
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

| ID | 任务 | 工具(只有真代码) | 模型 reasoning 里做的 | Station 5 模式 |
|---|---|---|---|---|
| `downloads-bigfiles` | 列出 `~/Downloads` 里大于 1GB 的文件 | `list_directory`, `get_file_size` | 按大小过滤、组织答案 | 📦 sandbox(内存 FS,只存元数据) |
| `shanghai-weather` | 查上海明天天气 + 提醒带伞 | `get_weather`, `send_notification` | 判断是否要提醒、撰写提醒文案 | 🌐 live(open-meteo)+ 📦(Notification API) |
| `readme-pr` | 读某 repo 的 README,起草 PR 描述 | `fetch_readme`, `save_pr_draft({title, body})` | 总结 README、撰写 PR 标题与正文 | 🌐 live(GitHub public API,只读) |
| `hn-weekend-pick` | 拉 HN top 30,挑一个最适合周末读的 | `fetch_hn_top`, `fetch_hn_story(id)`, `save_recommendation({id, title, reason})` | 评估周末适合度、挑选、写推荐理由 | 🌐 live(HN public API) |

`save_pr_draft` 和 `save_recommendation` 是"final action"工具 —— 模型把最终产出
作为参数交付给 runtime,UI 上呈现为"交付物卡片"。这让每个 example 都有可见的结尾。

## 6. 数据完整性规则

**这是本 demo 不容协商的规则。** 写在 `docs/recording-notes.md` 公开:

1. **模型输出 = 100% 真实。** reasoning / logprobs / tool call / 采样起点,
   全部来自实跑 OpenAI API,不修改一个字符。需要短就**重跑**直到拿到合适输出,
   或调整 system prompt(prompt 也存进 `recording-notes.md`)。
2. **Tool 执行 = 真代码,真沙箱。** 不存在手编 observation。
3. **截断允许,改写禁止。** 文本太长用 `slice(0, n)` 截 + 省略号,
   不删中间几句话。
4. **双语:** 同一 prompt 跑两次(zh / en),分别存,承认两种语言下推理路径
   可能略有不同。
5. **唯一一处"重算"允许:** Station 3 的 temperature 滑块在前端基于真实抓到的
   top-20 logprobs **重新 softmax**,这不是造假,这是把模型的真实分布在 vocab 子
   空间里做温度变换 —— 数学上正确,UI 标注清楚"温度只作用在 top-20 内部"。

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
│   │   ├── agent-loop.json       # Station 6 用:reactive 模式的完整 loop 录制
│   │   └── topology.json         # Station 7 用:reactive + deliberative 两份对比数据
│   ├── shanghai-weather/
│   ├── readme-pr/
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
  paths: Array<{
    method: 'greedy' | 'topK' | 'topP' | 'temperature';
    params: Record<string, number>;
    tokens: string[];
  }>;
};

type FunctionCallData = {
  reasoning: { zh: string; en: string };
  toolCandidates: Array<{ name: string; logprob: number }>;
  call: { name: string; arguments: Record<string, unknown> };
};

type AgentLoopData = {
  iterations: Array<{
    thought: { zh: string; en: string };
    action: { name: string; arguments: Record<string, unknown> };
    observation: unknown;
  }>;
  terminationReason: { zh: string; en: string };
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

工具是真代码,放在 `src/tools/`,每个工具一个文件,签名一致:

```ts
type Tool<Args, Result> = {
  name: string;
  schema: JSONSchema;
  exec(args: Args, ctx: ToolContext): Promise<Result>;
};

type ToolContext = {
  fs?: InMemoryFs;               // 内存 FS,仅 downloads 例子用
  store: ToolOutputStore;        // 收集 save_* 工具的最终交付物
};
```

| 工具 | 执行方式 |
|---|---|
| `list_directory(path)` | 读 `data/sandboxes/downloads-bigfiles/fs.json`(20-30 条 fixture)装入 `Map<path, {size, mtime}>`,返回路径下的条目 |
| `get_file_size(path)` | 同上,返回 size |
| `get_weather(city, date)` | `fetch('https://api.open-meteo.com/v1/forecast?...')`,带 cache fallback |
| `send_notification({title, body})` | 调用 `new Notification(...)`,无权限时降级为页内 toast,返回 `{delivered: true \| false, channel}` |
| `fetch_readme(owner, repo)` | `fetch('https://api.github.com/repos/.../readme')`,base64 解码 |
| `save_pr_draft({title, body})` | 写入 `ToolOutputStore`,UI 渲染为"PR 草稿卡片"。无外部副作用 |
| `fetch_hn_top()` | `fetch('https://hacker-news.firebaseio.com/v0/topstories.json')`,取前 30 |
| `fetch_hn_story(id)` | `fetch('https://hacker-news.firebaseio.com/v0/item/{id}.json')` |
| `save_recommendation({story_id, title, reason})` | 写入 `ToolOutputStore`,UI 渲染为"推荐卡片"。无外部副作用 |

**沙箱 + 工具的不变量:** 录制时和运行时跑同一份沙箱 fixture + 同一份工具实现,
所以"录制时的 observation"和"运行时实跑的 observation"必须一致。

- 📦 sandbox(内存 FS) + 纯本地工具(`save_*`): 状态完全确定,运行时实跑必然
  等于录制时 observation。
- 🌐 live API(weather / HN / GitHub): 远端会变。**v1 默认用 `execution.json`
  缓存里的 observation,不真调 live**,以保证与模型预录 reasoning 一致;
  Station 5 提供一个"🔄 从 live 刷新"按钮,点击后真调一次 API,UI 显著标注
  "刷新结果与预录推理可能不符 —— 这正是预录 demo 的局限,v1.1 Live 模式会解决"。

## 9. 预录流程

`scripts/record/` 下的 Node + TS 脚本,**全部基于 OpenAI(或兼容代理)**:

| 脚本 | 干啥 | 调谁 |
|---|---|---|
| `tokenize.ts` | 用 tiktoken 切 prompt | 本地 |
| `logits.ts` | OpenAI Chat Completions `logprobs:true, top_logprobs:20`,抓答复中 8-12 个有教学意义的 step | OpenAI |
| `sampling.ts` | 基于已抓 logprobs 离线模拟 4 种采样策略 | 纯计算 |
| `function-calls.ts` | OpenAI function calling 拿真实 reasoning + tool call,展开 top-3 候选工具 | OpenAI |
| `agent-loops.ts` | 跑两次完整 agent loop:`--mode=reactive` 用 ReAct 风 prompt;`--mode=deliberative` 用"先输出 plan 再执行"风 prompt。两次都用 `src/tools/*` 真实执行工具 | OpenAI + 本地工具 |
| `cache-live.ts` | 对每个 🌐 live 工具调一次,把 observation 缓存到 `execution.json`,作为运行时默认数据源 | 各 public API |

**约定:**

- 录制脚本读 `process.env.OPENAI_API_KEY` 和 `process.env.OPENAI_BASE_URL`
  (后者允许指向自托管的 LiteLLM 代理)。
- `.env.example` 提供模板,`.env` 进 `.gitignore`。
- **运行时不需要任何 API key**:所有预录 JSON 在 repo 里。
- 运行 `npm run record -- --example=<example-id>` 触发该例子的全部脚本。
- 模型默认 `gpt-4.1`(或代理后端能解析的同级别模型),具体在
  `scripts/record/config.ts` 里定义。

## 10. UI / 样式 / i18n

- 白板主题: 米白底 `#FAF7F0` + 墨黑文字 `#1A1A1A` + 强调蓝/橙;手写体仅用于
  标题和钩子文案,正文用无衬线(Inter)。
- 动画原则: 只用 transform / opacity,不触发 layout;每个 station 内部动画
  绑定 0-1 的 scroll progress(站内进度,不是全局)。
- i18n: `src/data/i18n/{zh,en}.ts` 导出嵌套 key-value;组件用 `useLanguage()`
  hook 读;切语言时不刷新页面,所有文案 reactively 更新。

## 11. 错误处理

| 场景 | 处理 |
|---|---|
| 例子 JSON 加载失败 | 该 station 占位"录制数据未就绪",其他站正常 |
| Live API 调用(用户点🔄刷新时)失败 | 显示 toast "实时调用失败,继续展示缓存结果",不破坏当前 station 状态 |
| Notification 权限被拒 | 降级为页内 toast,文案说明 |
| 内存 FS 加载 fixture 失败 | downloads 例子的 station 5/6/7 占位"沙箱数据加载失败" |

**不做:** 全局错误边界、Sentry、重试策略。

## 12. 测试

- vitest 单测覆盖纯函数: `utils/sampling.ts`(top-k / top-p / temperature 重算)、
  `src/tools/*` 的本地实现。
- 组件不写测试。
- 录制脚本不写测试。
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
│   ├── tools/                  # list_directory / get_file_size / get_weather / send_notification / fetch_readme / save_pr_draft / fetch_hn_top / fetch_hn_story / save_recommendation
│   ├── data/
│   │   ├── examples/<example-id>/<station>.json
│   │   ├── sandboxes/<example-id>/fs.json
│   │   └── i18n/{zh,en}.ts
│   ├── types/
│   └── utils/sampling.ts
├── scripts/record/             # config.ts / tokenize.ts / logits.ts / sampling.ts / function-calls.ts / agent-loops.ts / cache-live.ts
└── docs/
    ├── recording-notes.md      # 录制流程 + 系统 prompts + 数据完整性规则
    └── superpowers/specs/      # 本文件所在目录
```
