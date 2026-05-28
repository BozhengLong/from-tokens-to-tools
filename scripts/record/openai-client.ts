// scripts/record/openai-client.ts
import OpenAI from 'openai';

export const createOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set in env (check .env file)');
  }
  return new OpenAI({ apiKey, baseURL });
};
