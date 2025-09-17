import React from 'react';
import { Card, Text, BlockStack, InlineStack, Grid } from '@shopify/polaris';
import { AnimatedIcon3D } from './Icon3D';

interface IconShowcaseProps {
  title?: string;
  showLabels?: boolean;
}

const SHOWCASE_ICONS = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'analytics', label: 'Analytics' },
  { name: 'invoice', label: 'Invoice' },
  { name: 'receipt', label: 'Receipt' },
  { name: 'calculator', label: 'Calculator' },
  { name: 'money', label: 'Money' },
  { name: 'tax', label: 'Tax' },
  { name: 'shipping', label: 'Shipping' },
  { name: 'package', label: 'Package' },
  { name: 'truck', label: 'Truck' },
  { name: 'barcode', label: 'Barcode' },
  { name: 'label', label: 'Label' },
  { name: 'customer', label: 'Customer' },
  { name: 'customers', label: 'Customers' },
  { name: 'profile', label: 'Profile' },
  { name: 'contact', label: 'Contact' },
  { name: 'settings', label: 'Settings' },
  { name: 'tools', label: 'Tools' },
  { name: 'create', label: 'Create' },
  { name: 'edit', label: 'Edit' },
  { name: 'delete', label: 'Delete' },
  { name: 'download', label: 'Download' },
  { name: 'upload', label: 'Upload' },
  { name: 'success', label: 'Success' },
  { name: 'warning', label: 'Warning' },
  { name: 'error', label: 'Error' },
  { name: 'notification', label: 'Notification' },
  { name: 'business', label: 'Business' },
  { name: 'shop', label: 'Shop' },
  { name: 'order', label: 'Order' },
  { name: 'qrcode', label: 'QR Code' },
  { name: 'digital', label: 'Digital' },
  { name: 'cloud', label: 'Cloud' },
  { name: 'subscription', label: 'Subscription' },
  { name: 'premium', label: 'Premium' },
  { name: 'trial', label: 'Trial' },
];

export const IconShowcase: React.FC<IconShowcaseProps> = ({ 
  title = "3D Icons Collection", 
  showLabels = true 
}) => {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">{title}</Text>
        <Text variant="bodySm" tone="subdued">
          Beautiful 3D icons from Iconscout integrated into the GST Invoice & Shipping Manager
        </Text>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: '16px',
          padding: '16px 0'
        }}>
          {SHOWCASE_ICONS.map((icon) => (
            <div
              key={icon.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <AnimatedIcon3D 
                name={icon.name} 
                size="large" 
                hover={true}
                className="mb-2"
              />
              {showLabels && (
                <Text variant="bodySm" alignment="center">
                  {icon.label}
                </Text>
              )}
            </div>
          ))}
        </div>
      </BlockStack>
    </Card>
  );
};

// Quick action cards with 3D icons
export const QuickActionCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}> = ({ icon, title, description, action, variant = 'secondary' }) => {
  return (
    <Card>
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
        }}
        onClick={action}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <BlockStack gap="300" align="center">
          <AnimatedIcon3D 
            name={icon} 
            size="xlarge" 
            hover={true}
            pulse={variant === 'primary'}
          />
          <BlockStack gap="100" align="center">
            <Text variant="headingMd" as="h3">{title}</Text>
            <Text variant="bodySm" tone="subdued" alignment="center">
              {description}
            </Text>
          </BlockStack>
        </BlockStack>
      </div>
    </Card>
  );
};

// Feature highlight component
export const FeatureHighlight: React.FC<{
  icon: string;
  title: string;
  features: string[];
}> = ({ icon, title, features }) => {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h3">{title}</Text>
          <AnimatedIcon3D name={icon} size="large" hover={true} />
        </InlineStack>
        
        <BlockStack gap="200">
          {features.map((feature, index) => (
            <InlineStack key={index} gap="200" blockAlign="center">
              <AnimatedIcon3D name="success" size="small" />
              <Text variant="bodySm">{feature}</Text>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
};

export default IconShowcase;