// src/tools/get_weather.ts
import type { Tool } from './types';

type Args = { city: string; date: string };
type Result =
  | { date: string; t_max: number; t_min: number; precipitation_probability: number; weathercode: number }
  | { error: 'fetch-failed' };

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Shanghai: { lat: 31.23, lon: 121.47 },
  '上海': { lat: 31.23, lon: 121.47 },
};

export const getWeatherTool: Tool<Args, Result> = {
  name: 'get_weather',
  schema: {
    type: 'object',
    properties: {
      city: { type: 'string' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['city', 'date'],
  },
  async exec(args, ctx) {
    const coords = CITY_COORDS[args.city];
    if (!coords) return { error: 'fetch-failed' };
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&start_date=${args.date}&end_date=${args.date}`;
    try {
      const res = await ctx.fetch(url);
      if (!res.ok) return { error: 'fetch-failed' };
      const body = await res.json();
      return {
        date: body.daily.time[0],
        t_max: body.daily.temperature_2m_max[0],
        t_min: body.daily.temperature_2m_min[0],
        precipitation_probability: body.daily.precipitation_probability_max[0],
        weathercode: body.daily.weathercode[0],
      };
    } catch {
      return { error: 'fetch-failed' };
    }
  },
};
