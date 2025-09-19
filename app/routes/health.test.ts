import { describe, it, expect, beforeAll } from 'vitest';

let loader: any;
beforeAll(async () => {
  const mod = await import('./health');
  loader = mod.loader;
});

function makeRequest(url = 'http://localhost/health') {
  return new Request(url);
}

describe('health route loader', () => {
  it('returns 200 and json with expected keys', async () => {
    const response = await loader({ request: makeRequest(), params: {}, context: {} as any });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('service');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('uptime');
  });
});
