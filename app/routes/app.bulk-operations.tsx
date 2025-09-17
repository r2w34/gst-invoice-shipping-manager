import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { BulkOperationsCenter } from '../components/BulkOperationsCenter';
import db from '../db.server';

/**
 * Bulk Operations Center Route
 * Comprehensive bulk processing for invoices, labels, and data management
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Fetch data for bulk operations center
  const [orders, invoices, labels, customers] = await Promise.all([
    db.order.findMany({
      where: { shopId: session.shop },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.invoice.findMany({
      where: { shopId: session.shop },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.shippingLabel.findMany({
      where: { shopId: session.shop },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.customer.findMany({
      where: { shopId: session.shop },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  return json({
    orders,
    invoices,
    labels,
    customers,
  });
};

export default function BulkOperationsPage() {
  const { orders, invoices, labels, customers } = useLoaderData<typeof loader>();

  return (
    <BulkOperationsCenter
      orders={orders}
      invoices={invoices}
      labels={labels}
      customers={customers}
    />
  );
}