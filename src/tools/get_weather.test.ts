// src/tools/get_weather.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getWeatherTool } from './get_weather';
import type { ToolContext } from './types';

const fakeFetch = (body: unknown, ok = true): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as typeof fetch;

const mockCtx = (fetchImpl: typeof fetch): ToolContext => ({
  notify: async () => ({ delivered: false, channel: 'mock' }),
  clipboard: { writeText: async () => {} },
  storage: { setItem: () => {}, getItem: () => null },
  fetch: fetchImpl,
});

describe('get_weather', () => {
  it('calls open-meteo and returns simplified shape', async () => {
    const fetchSpy = vi.fn(fakeFetch({
      daily: {
        time: ['2026-05-30'],
        temperature_2m_max: [22.5],
        temperature_2m_min: [16.0],
        precipitation_probability_max: [80],
        weathercode: [61],
      },
    }));
    const out = await getWeatherTool.exec(
      { city: 'Shanghai', date: '2026-05-30' },
      mockCtx(fetchSpy as unknown as typeof fetch)
    );
    expect((out as any).date).toBe('2026-05-30');
    expect((out as any).precipitation_probability).toBe(80);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
