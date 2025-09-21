import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Badge,
  Text,
  InlineStack,
  BlockStack,
  EmptyState,
  TextField,
  Select,
  Filters,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  // Get filter parameters
  const statusFilter = url.searchParams.get("status");
  const courierFilter = url.searchParams.get("courier");
  const searchQuery = url.searchParams.get("search");

  let shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        domain: session.shop,
        name: session.shop.replace('.myshopify.com', ''),
      }
    });
  }

  // Build where clause for filtering
  const whereClause = { shopId: shop.id };
  
  if (statusFilter) {
    whereClause.status = statusFilter;
  }
  
  if (courierFilter) {
    whereClause.courierName = courierFilter;
  }
  
  if (searchQuery) {
    whereClause.OR = [
      { trackingId: { contains: searchQuery, mode: 'insensitive' } },
      { recipientName: { contains: searchQuery, mode: 'insensitive' } },
      { labelNumber: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }

  // Get tracking data
  const trackingLabels = await prisma.shippingLabel.findMany({
    where: whereClause,
    include: {
      customer: true,
      order: true,
      trackingEvents: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Calculate tracking statistics
  const stats = {
    total: await prisma.shippingLabel.count({
      where: { shopId: shop.id, trackingId: { not: null } }
    }),
    created: await prisma.shippingLabel.count({
      where: { shopId: shop.id, status: 'created', trackingId: { not: null } }
    }),
    shipped: await prisma.shippingLabel.count({
      where: { shopId: shop.id, status: 'shipped', trackingId: { not: null } }
    }),
    inTransit: await prisma.shippingLabel.count({
      where: { shopId: shop.id, status: 'in_transit', trackingId: { not: null } }
    }),
    delivered: await prisma.shippingLabel.count({
      where: { shopId: shop.id, status: 'delivered', trackingId: { not: null } }
    }),
    exception: await prisma.shippingLabel.count({
      where: { shopId: shop.id, status: 'exception', trackingId: { not: null } }
    })
  };

  // Get unique couriers for filter
  const couriers = await prisma.shippingLabel.findMany({
    where: { shopId: shop.id, courierName: { not: null } },
    select: { courierName: true },
    distinct: ['courierName']
  });

  return json({
    trackingLabels,
    stats,
    couriers: couriers.map(c => c.courierName),
    shop,
    filters: {
      status: statusFilter,
      courier: courierFilter,
      search: searchQuery
    }
  });
};

export default function TrackingIndex() {
  const { trackingLabels, stats, couriers, shop, filters } = useLoaderData();
  
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [statusFilter, setStatusFilter] = useState(filters.status || "");
  const [courierFilter, setCourierFilter] = useState(filters.courier || "");

  const getStatusBadge = (status, lastEvent) => {
    const statusConfig = {
      created: { status: 'info', children: 'Created' },
      printed: { status: 'attention', children: 'Printed' },
      shipped: { status: 'warning', children: 'Shipped' },
      in_transit: { status: 'attention', children: 'In Transit' },
      out_for_delivery: { status: 'warning', children: 'Out for Delivery' },
      delivered: { status: 'success', children: 'Delivered' },
      exception: { status: 'critical', children: 'Exception' },
      returned: { status: 'critical', children: 'Returned' }
    };
    
    const config = statusConfig[status] || { status: 'info', children: status };
    return <Badge {...config} />;
  };

  const getLastTrackingEvent = (events) => {
    if (!events || events.length === 0) return null;
    return events[0];
  };

  const getDaysInTransit = (createdAt, status) => {
    if (status === 'delivered') return null;
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleFiltersChange = useCallback((newFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.courier) params.set('courier', newFilters.courier);
    if (newFilters.search) params.set('search', newFilters.search);
    
    const queryString = params.toString();
    window.location.href = `/app/tracking${queryString ? '?' + queryString : ''}`;
  }, []);

  const handleSearchSubmit = useCallback(() => {
    handleFiltersChange({
      status: statusFilter,
      courier: courierFilter,
      search: searchValue
    });
  }, [statusFilter, courierFilter, searchValue, handleFiltersChange]);

  const clearFilters = useCallback(() => {
    setSearchValue("");
    setStatusFilter("");
    setCourierFilter("");
    window.location.href = '/app/tracking';
  }, []);

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Created', value: 'created' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Exception', value: 'exception' },
    { label: 'Returned', value: 'returned' }
  ];

  const courierOptions = [
    { label: 'All Couriers', value: '' },
    ...couriers.map(courier => ({ label: courier, value: courier }))
  ];

  const rows = trackingLabels.map((label) => {
    const lastEvent = getLastTrackingEvent(label.trackingEvents);
    const daysInTransit = getDaysInTransit(label.createdAt, label.status);
    
    return [
      <Link to={`/app/tracking/${label.id}`} style={{ textDecoration: 'none' }}>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {label.trackingId}
        </Text>
      </Link>,
      label.labelNumber,
      label.recipientName,
      `${label.shippingCity}, ${label.shippingState}`,
      label.courierName || '-',
      getStatusBadge(label.status, lastEvent),
      lastEvent ? new Date(lastEvent.createdAt).toLocaleDateString('en-IN') : '-',
      daysInTransit ? `${daysInTransit} days` : '-',
      <InlineStack gap="200">
        <Button size="micro" url={`/app/tracking/${label.id}`}>
          Track
        </Button>
        <Button size="micro" url={`/app/tracking/${label.id}/update`}>
          Update
        </Button>
      </InlineStack>
    ];
  });

  return (
    <Page
      title="Parcel Tracking"
      primaryAction={{
        content: 'Add Tracking',
        url: '/app/tracking/new'
      }}
      secondaryActions={[
        {
          content: 'Bulk Update',
          url: '/app/bulk/tracking'
        },
        {
          content: 'Export Tracking Data',
          url: '/app/bulk/export?type=tracking&format=csv'
        }
      ]}
    >
      <Layout>
        {/* Statistics Cards */}
        <Layout.Section>
          <InlineStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Total Shipments</Text>
                <Text variant="heading2xl" as="p">{stats.total}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Shipped</Text>
                <Text variant="heading2xl" as="p" tone="warning">{stats.shipped}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">In Transit</Text>
                <Text variant="heading2xl" as="p" tone="attention">{stats.inTransit}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Delivered</Text>
                <Text variant="heading2xl" as="p" tone="success">{stats.delivered}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">Exceptions</Text>
                <Text variant="heading2xl" as="p" tone="critical">{stats.exception}</Text>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        {/* Filters */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Search & Filter</Text>
              
              <InlineStack gap="300" align="end">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Search"
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Search by tracking ID, recipient name, or label number..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  />
                </div>
                <Select
                  label="Status"
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
                <Select
                  label="Courier"
                  options={courierOptions}
                  value={courierFilter}
                  onChange={setCourierFilter}
                />
                <Button onClick={handleSearchSubmit}>Search</Button>
                <Button onClick={clearFilters}>Clear</Button>
              </InlineStack>
              
              <Text variant="bodyMd" as="p" tone="subdued">
                Showing {trackingLabels.length} shipments
                {(filters.status || filters.courier || filters.search) && ' (filtered)'}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Tracking Table */}
        <Layout.Section>
          <Card>
            {trackingLabels.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text'
                ]}
                headings={[
                  'Tracking ID',
                  'Label Number',
                  'Recipient',
                  'Destination',
                  'Courier',
                  'Status',
                  'Last Update',
                  'Days in Transit',
                  'Actions'
                ]}
                rows={rows}
                pagination={{
                  hasNext: false,
                  hasPrevious: false,
                  onNext: () => {},
                  onPrevious: () => {}
                }}
              />
            ) : (
              <EmptyState
                heading={filters.search || filters.status || filters.courier ? "No tracking data found" : "No shipments to track"}
                action={{
                  content: filters.search || filters.status || filters.courier ? 'Clear filters' : 'Create Shipping Label',
                  onAction: filters.search || filters.status || filters.courier ? clearFilters : undefined,
                  url: filters.search || filters.status || filters.courier ? undefined : '/app/labels/new'
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  {filters.search || filters.status || filters.courier 
                    ? "Try adjusting your search or filter criteria."
                    : "Create shipping labels with tracking IDs to start tracking parcels."
                  }
                </p>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Quick Actions</Text>
              
              <InlineStack gap="300">
                <Button url="/app/labels/new">
                  Create New Label
                </Button>
                <Button url="/app/bulk/tracking">
                  Bulk Tracking Update
                </Button>
                <Button url="/app/tracking/webhook-setup">
                  Setup Webhooks
                </Button>
                <Button url="/app/tracking/analytics">
                  View Analytics
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}