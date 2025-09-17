import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { ReactAdminApp } from '../components/ReactAdminApp';

/**
 * React Admin Route
 * Modern admin interface for comprehensive business management
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return json({
    shop: session.shop,
    shopId: session.shop,
  });
};

export default function AdminPage() {
  const { shop, shopId } = useLoaderData<typeof loader>();

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ReactAdminApp />
    </div>
  );
}