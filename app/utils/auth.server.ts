import { authenticate } from "../shopify.server";

export async function authenticateOrBypass(request: Request) {
  // Development mode bypass for testing
  if (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') {
    return {
      admin: {
        graphql: () => ({ data: {} }),
        rest: () => ({ data: {} }),
      },
      session: {
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
      },
    };
  }
  
  return await authenticate.admin(request);
}