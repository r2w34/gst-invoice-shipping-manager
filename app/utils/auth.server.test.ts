import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We import the function from compiled TS; vitest handles TS via ts-node/tsconfig
import { authenticateOrBypass } from './auth.server';

// Mock the shopify.server module to avoid real Shopify calls during tests
vi.mock('../shopify.server', () => ({
  authenticate: {
    admin: vi.fn(async () => ({
      admin: { graphql: vi.fn(), rest: vi.fn() },
      session: { shop: 'real-shop.myshopify.com', accessToken: 'real-token' },
    })),
  },
}));

describe('authenticateOrBypass', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.BYPASS_AUTH;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('bypasses auth in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const res = await authenticateOrBypass(new Request('http://test'));
    expect(res.session.shop).toBe('test-shop.myshopify.com');
    expect(res.session.accessToken).toBe('test-token');
  });

  it('bypasses auth when BYPASS_AUTH=true', async () => {
    process.env.BYPASS_AUTH = 'true';
    const res = await authenticateOrBypass(new Request('http://test'));
    expect(res.session.shop).toBe('test-shop.myshopify.com');
    expect(res.session.accessToken).toBe('test-token');
  });

  it('uses real authenticate.admin when not bypassed', async () => {
    const res = await authenticateOrBypass(new Request('http://test'));
    expect(res.session.shop).toBe('real-shop.myshopify.com');
    expect(res.session.accessToken).toBe('real-token');
  });
});
