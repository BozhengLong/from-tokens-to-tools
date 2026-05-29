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
  loadLiveModel: '加载实时模型(~178MB,在你电脑上跑)',
  loadingModel: '正在加载模型…',
  liveReady: '✅ 实时模型已就绪 —— 这是在你自己的电脑上跑',
  liveFailed: '实时模型加载失败,已切回录制数据',
  recordedBadge: '📼 录制的真实数据',
  liveBadge: '🔬 实时 · 你的设备',
  temperature: '温度',
  resample: '重新采样',
  yourPrompt: '上下文(可改)',
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
  loadLiveModel: 'Load the live model (~178MB, runs on your machine)',
  loadingModel: 'Loading the model…',
  liveReady: '✅ Live model ready — running on your own machine',
  liveFailed: 'Live model failed to load; using recorded data',
  recordedBadge: '📼 recorded real data',
  liveBadge: '🔬 live · your device',
  temperature: 'temperature',
  resample: 'Resample',
  yourPrompt: 'context (editable)',
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
