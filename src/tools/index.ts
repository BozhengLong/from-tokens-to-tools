// src/tools/index.ts
import { listDirectoryTool } from './list_directory';
import { getFileSizeTool } from './get_file_size';
import { getWeatherTool } from './get_weather';
import { sendNotificationTool } from './send_notification';
import { fetchWikipediaArticleTool } from './fetch_wikipedia_article';
import { saveTweetDraftTool } from './save_tweet_draft';
import { fetchHnTopTool } from './fetch_hn_top';
import { fetchHnStoryTool } from './fetch_hn_story';
import { saveRecommendationTool } from './save_recommendation';
import type { Tool } from './types';

export const ALL_TOOLS: Record<string, Tool> = {
  list_directory: listDirectoryTool,
  get_file_size: getFileSizeTool,
  get_weather: getWeatherTool,
  send_notification: sendNotificationTool,
  fetch_wikipedia_article: fetchWikipediaArticleTool,
  save_tweet_draft: saveTweetDraftTool,
  fetch_hn_top: fetchHnTopTool,
  fetch_hn_story: fetchHnStoryTool,
  save_recommendation: saveRecommendationTool,
};

export type { Tool, ToolContext, NotifyResult } from './types';
