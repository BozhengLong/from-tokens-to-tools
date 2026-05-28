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
- 沙箱: `@zenfs/core` 浏览器内虚拟文件系统(用于 Downloads 例子)
- 静态构建,部署到 Netlify / Vercel / GitHub Pages 任意

## 4. 7 个 Station

主线: 模型只是个概率机器(1-3) → 概率机器吐出的字符串被外部 runtime 当指令(4-5)
→ 这个循环可以自驱动多步(6-7)。

### Station 1 · Tokenization

- **What:** 用户任务文本在 BPE 分词器下被切成 token。
- **Visual:** 文本逐字符滑入 → "咔嚓"切成胶囊 → 每个胶囊带 token ID;
  hover 看 byte offset 和原始字符串。
- **Interact:** 切换 example 重放;hover 任意 token 看高亮原文位置。
- **钩子:** "AI 不读字。它读的是这串数字。"

### Station 2 · Forward → Logits → 概率分布

- **What:** 前缀 prompt 喂入"一次前向",产出 vocab 上的 logits。
- **Visual:** 前缀 token 滑入抽象的"Transformer 黑盒"(白板上画的齿轮,故意不细究)→
  右边出来 logits 数组 → softmax → top-20 概率柱状图(横向条,按 logprob 排序)。
- **Interact:** 时间步滑块切换不同 step 的分布(预录);hover 单根柱看具体 token。
- **钩子:** "每一步,模型给出整个词表的可能性投票。"

### Station 3 · Sampling(最 hands-on 的一站)

- **What:** 从 Station 2 的分布里挑下一个 token。
- **Visual:** 同一份 top-20 分布上,叠加 4 条彩色采样路径动画
  (greedy / top-k=5 / top-p=0.9 / temperature=1.5)。
- **Interact:** temperature 滑块 (0→2) 实时改变分布柔化(纯前端 softmax 重算);
  top-k / top-p 切换;"重新采样"按钮看随机路径。
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

### Station 7 · 多步规划 / 任务拆解

- **What:** 大任务被拆成子任务树,逐个执行。
- **Visual:** 白板上画一棵任务树:根节点是用户原始任务,展开为 N 个子任务,
  每个子任务节点关联到自己的 agent loop;随着执行,完成的节点打勾。
- **Interact:** 折叠/展开任意子任务节点。
- **钩子:** "Agent Loop 套 Agent Loop。一层规划,一层执行。"

## 5. 4 个 Example

| ID | 任务 | 工具链 | Station 5 模式 |
|---|---|---|---|
| `downloads-bigfiles` | 列出 `~/Downloads` 里大于 1GB 的文件 | `list_directory` → `get_file_size` → `filter` | 📦 sandbox(虚拟 FS) |
| `shanghai-weather` | 查上海明天天气 + 提醒带伞 | `get_weather` → `should_remind` → `send_notification` | 🌐 live(open-meteo.com)+ 📦(浏览器 Notification API)|
| `readme-pr` | 读某 repo 的 README,总结,起草 PR 描述 | `fetch_readme` → `summarize`(模型本身) → `draft_pr_description` | 🌐 live(GitHub public API,只读) |
| `hn-weekend-pick` | 拉 HN 今天前 5 条,挑一个最适合周末读的 | `fetch_hn_top` → `score_for_weekend` → `recommend` | 🌐 live(HN public API)|

## 6. 数据完整性规则

**这是本 demo 不容协商的规则。** 写在 `docs/recording-notes.md` 公开:

1. **模型输出 = 100% 真实。** reasoning / logits / tool call / 采样路径,
   全部来自实跑 API,不修改一个字符。需要短就**重跑**直到拿到合适输出,
   或调整 system prompt(prompt 也存进 `recording-notes.md`)。
2. **Tool 执行 = 真代码,真沙箱。** 不存在手编 observation。
3. **截断允许,改写禁止。** 文本太长用 `slice(0, n)` 截 + 省略号,
   不删中间几句话。
4. **双语:** 同一 prompt 跑两次(zh / en),分别存,承认两种语言下推理路径
   可能略有不同。

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
│   │   ├── execution.json       # 真跑沙箱后的缓存(也作为离线 fallback)
│   │   ├── agent-loop.json
│   │   └── planning.json
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
type Example = {
  id: string;
  name: { zh: string; en: string };
  taskPrompt: { zh: string; en: string };
  tools: ToolSpec[];
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

type PlanningData = {
  rootGoal: { zh: string; en: string };
  tree: PlanNode;
};

type PlanNode = {
  id: string;
  label: { zh: string; en: string };
  status: 'pending' | 'done';
  children?: PlanNode[];
  loopRef?: string;
};
```

## 8. 沙箱 & 工具

工具是真代码,放在 `src/tools/`,每个工具一个文件,签名一致:

```ts
type Tool<Args, Result> = {
  name: string;
  schema: JSONSchema;
  exec(args: Args, sandbox?: Sandbox): Promise<Result>;
};
```

| 工具 | 执行方式 |
|---|---|
| `list_directory` / `get_file_size` | `@zenfs/core` 虚拟 FS,初始状态从 `data/sandboxes/downloads-bigfiles/fs.json` 加载 |
| `get_weather` | `fetch('https://api.open-meteo.com/...')` |
| `send_notification` | `new Notification(...)` 浏览器 API,拒绝授权时降级为页内 toast |
| `fetch_readme` | `fetch('https://api.github.com/repos/.../readme')`,base64 解码 |
| `draft_pr_description` | 本地纯函数,根据 README 摘要 + 模型预录输出生成 PR 描述 markdown |
| `fetch_hn_top` | `fetch('https://hacker-news.firebaseio.com/v0/topstories.json')` 等 |
| `score_for_weekend` / `recommend` | 本地纯函数 |

**沙箱 + 工具的不变量:** 录制时和运行时跑同一份沙箱状态 + 同一份工具实现,
所以"录制时的 observation"和"运行时实跑的 observation"必须一致。

- 📦 sandbox(虚拟 FS)和本地纯函数: 状态完全确定,运行时实跑必然等于录制时
  observation。
- 🌐 live API(weather / HN / GitHub): 远端会变。**v1 默认用 `execution.json`
  缓存里的 observation,不真调 live**,以保证与模型预录 reasoning 一致;
  Station 5 提供一个"🔄 从 live 刷新"按钮,点击后真调一次 API,UI 显著标注
  "刷新结果与预录推理可能不符 —— 这正是预录 demo 的局限,v1.1 Live 模式会解决"。

## 9. 预录流程

`scripts/record/` 下的 Node + TS 脚本:

| 脚本 | 干啥 | 调谁 |
|---|---|---|
| `tokenize.ts` | 用 tiktoken 切 prompt | 本地 |
| `logits.ts` | OpenAI `logprobs:true, top_logprobs:20` 抓多步分布 | OpenAI API |
| `sampling.ts` | 基于已抓 logits 离线模拟 4 种采样策略 | 纯计算 |
| `function-calls.ts` | Anthropic tool use 拿真实 reasoning + call | `ANTHROPIC_API_KEY` |
| `agent-loop.ts` | 跑一次真实 agent loop(3-5 轮),工具用 `src/tools/*` 真实执行 | `ANTHROPIC_API_KEY` |
| `planning.ts` | 手写任务树 YAML → 转 JSON | 本地 |
| `cache-live.ts` | 对每个 🌐 live 工具调一次,把 observation 缓存到 `execution.json`,作为离线 fallback | 各 public API |

**约定:**

- 录制脚本读 `process.env.ANTHROPIC_API_KEY`(用户 `.zshrc` 已有)。
- `.env.example` 提供模板,`.env` 进 `.gitignore`。
- **运行时不需要任何 API key**:所有预录 JSON 在 repo 里。
- 运行 `npm run record:<example-id>` 触发该例子的全部脚本。

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
| 虚拟 FS 初始化失败(老浏览器) | 该例子 station 5/6/7 占位"需要现代浏览器" |

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

- 首屏 < 200KB gzip(壳 + 第一个例子的 tokenize+logits)
- 切例子时新例子的数据 < 100KB
- 滚动 60 fps

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
│   │   ├── stations/           # Tokenize / Logits / Sampling / FunctionCall / Execution / AgentLoop / Planning
│   │   ├── layout/             # Header / ProgressBar / ExampleSelector / LanguageToggle
│   │   └── shared/
│   ├── hooks/                  # useExample / useLanguage / useStationData / useScrollProgress
│   ├── tools/                  # list_directory / get_file_size / get_weather / send_notification / fetch_readme / draft_pr_description / fetch_hn_top / score_for_weekend / recommend
│   ├── data/
│   │   ├── examples/<example-id>/<station>.json
│   │   ├── sandboxes/<example-id>/fs.json
│   │   └── i18n/{zh,en}.ts
│   ├── types/
│   └── utils/sampling.ts
├── scripts/record/             # tokenize.ts / logits.ts / sampling.ts / function-calls.ts / agent-loop.ts / planning.ts / cache-live.ts
└── docs/
    ├── recording-notes.md      # 录制流程 + 系统 prompts + 数据完整性规则
    └── superpowers/specs/      # 本文件所在目录
```
