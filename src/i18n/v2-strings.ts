import type { Lang } from '@/state/v2-store';

type Dict = Record<string, string>;

const zh: Dict = {
  appTitle: 'from tokens to tools',
  subtitle: '看一个真实的 AI agent 修好一段代码 —— 然后钻进任意一步,发现它只是在猜下一个字。',
  start: '开始 ↓',
  next: '下一步 →',
  back: '← 上一步',
  lookInside: '🔍 钻进去看里面',
  backToMap: '↑ 回到地图',
  beat: '步骤',
  depth: '深度',
  lookInsideHint: '👇 看懂了?钻进去看它到底在干什么',
  livePitch: '想亲手拨一下?在你自己的设备上跑这个模型 —— 改几个字、调温度,看分布实时重新洗牌。',
  liveCta: '▸ 在我的设备上跑',
  liveCostNote: '首次约 178MB,之后浏览器缓存',
  liveDownloading: '正在下载权重',
  liveCompiling: '编译 WebGPU,马上就好…',
  liveNoWebGPU: '你的浏览器暂不支持现场运行(需要 WebGPU)。下面这些就是录制下来的真实概率。',
  liveRunLocal: '想现场亲手玩?把这个仓库跑在本地即可(下面是录制的真实数据)。',
  liveReady: '✅ 实时模型已就绪 —— 这是在你自己的电脑上跑',
  liveFailed: '实时模型加载失败,已切回录制数据',
  recordedBadge: '📼 录制的真实数据',
  liveBadge: '🔬 实时 · 你的设备',
  temperature: '温度',
  tempHint: '高温 = 更平、更随机;低温 = 更尖、更确定。温度不改变分数,只改变怎么从分数里挑。',
  resample: '重新采样',
  yourPrompt: '上下文(可改,然后重新采样)',
  nextTokenTitle: '模型对"下一个 token"的真实打分',
  epilogueTitle: '没有魔法,只有约定。',
  epilogueBody: '逐字预测 + 一套"长这样就算命令"的约定 + 运行时执行 + 循环到模型说停 —— 叠起来,就是一个能改你代码的 agent。',
  linkSource: '源码',
  linkRecording: '数据怎么来的',
  langToggle: 'EN',
  dataUnavailable: '数据未就绪',
};

const en: Dict = {
  appTitle: 'from tokens to tools',
  subtitle: 'Watch a real AI agent fix a bug — then zoom into any step and find it was only ever guessing the next token.',
  start: 'Start ↓',
  next: 'Next →',
  back: '← Back',
  lookInside: '🔍 Look inside',
  backToMap: '↑ Back to the map',
  beat: 'step',
  depth: 'depth',
  lookInsideHint: '👇 Got it? Zoom in to see what it is really doing',
  livePitch: 'Want to turn the dials yourself? Run this model on your own device — change a few words, adjust the temperature, and watch the distribution reshuffle live.',
  liveCta: '▸ Run it on my device',
  liveCostNote: '~178MB the first time, cached after',
  liveDownloading: 'Downloading weights',
  liveCompiling: 'Compiling WebGPU, almost there…',
  liveNoWebGPU: "Your browser can't run it live (needs WebGPU). The bars below are the recorded real probabilities.",
  liveRunLocal: 'Want to play live yourself? Run this repo locally (below is the recorded real data).',
  liveReady: '✅ Live model ready — running on your own machine',
  liveFailed: 'Live model failed to load; using recorded data',
  recordedBadge: '📼 recorded real data',
  liveBadge: '🔬 live · your device',
  temperature: 'temperature',
  tempHint: "High = flatter & more random; low = spikier & more certain. Temperature doesn't change the scores — only how you pick from them.",
  resample: 'Resample',
  yourPrompt: 'context (edit it, then resample)',
  nextTokenTitle: "the model's real scores for the next token",
  epilogueTitle: 'No magic, just conventions.',
  epilogueBody: 'Token-by-token prediction + a "this shape counts as a command" convention + a runtime that executes + a loop until the model says stop — stacked together, that is an agent that edits your code.',
  linkSource: 'Source',
  linkRecording: 'How the data was made',
  langToggle: '中文',
  dataUnavailable: 'data unavailable',
};

export const V2_STRINGS: Record<Lang, Dict> = { zh, en };
export type V2Key = keyof typeof zh;

export function useV2Strings(lang: Lang) {
  return (key: V2Key): string => V2_STRINGS[lang][key];
}
