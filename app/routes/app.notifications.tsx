import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { NotificationCenter } from '../components/NotificationCenter';
import db from '../db.server';

/**
 * Notification Center Route
 * Comprehensive email and WhatsApp notification management
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Fetch data for notification center
  const [customers, invoices, orders, labels] = await Promise.all([
    db.customer.findMany({
      where: { shopId: session.shop },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.invoice.findMany({
      where: { shopId: session.shop },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.order.findMany({
      where: { shopId: session.shop },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.shippingLabel.findMany({
      where: { shopId: session.shop },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  return json({
    customers,
    invoices,
    orders,
    labels,
  });
};

export default function NotificationsPage() {
  const { customers, invoices, orders, labels } = useLoaderData<typeof loader>();

  return (
    <NotificationCenter
      customers={customers}
      invoices={invoices}
      orders={orders}
      labels={labels}
    />
  );
}