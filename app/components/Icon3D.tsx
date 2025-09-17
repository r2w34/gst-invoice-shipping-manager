import React from 'react';

interface Icon3DProps {
  name: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  style?: React.CSSProperties;
}

// 3D Icon URLs from Iconscout (using high-quality PNG versions)
const ICON_URLS = {
  // Dashboard & Analytics
  dashboard: 'https://cdn3d.iconscout.com/3d/premium/thumb/dashboard-3d-icon-download-in-png-blend-fbx-gltf-file-formats--analytics-chart-graph-business-pack-icons-4659508.png',
  analytics: 'https://cdn3d.iconscout.com/3d/premium/thumb/analytics-3d-icon-download-in-png-blend-fbx-gltf-file-formats--chart-graph-data-business-pack-icons-4659502.png',
  statistics: 'https://cdn3d.iconscout.com/3d/premium/thumb/statistics-3d-icon-download-in-png-blend-fbx-gltf-file-formats--chart-graph-data-analysis-pack-icons-4659520.png',
  
  // Invoice & Finance
  invoice: 'https://cdn3d.iconscout.com/3d/premium/thumb/invoice-3d-icon-download-in-png-blend-fbx-gltf-file-formats--bill-receipt-payment-business-pack-icons-4659512.png',
  receipt: 'https://cdn3d.iconscout.com/3d/premium/thumb/receipt-3d-icon-download-in-png-blend-fbx-gltf-file-formats--bill-invoice-payment-business-pack-icons-4659516.png',
  calculator: 'https://cdn3d.iconscout.com/3d/premium/thumb/calculator-3d-icon-download-in-png-blend-fbx-gltf-file-formats--math-calculation-business-pack-icons-4659504.png',
  money: 'https://cdn3d.iconscout.com/3d/premium/thumb/money-3d-icon-download-in-png-blend-fbx-gltf-file-formats--cash-currency-finance-business-pack-icons-4659514.png',
  tax: 'https://cdn3d.iconscout.com/3d/premium/thumb/tax-3d-icon-download-in-png-blend-fbx-gltf-file-formats--finance-business-government-pack-icons-4659522.png',
  
  // Shipping & Logistics
  shipping: 'https://cdn3d.iconscout.com/3d/premium/thumb/shipping-3d-icon-download-in-png-blend-fbx-gltf-file-formats--delivery-logistics-transport-pack-icons-4659518.png',
  package: 'https://cdn3d.iconscout.com/3d/premium/thumb/package-3d-icon-download-in-png-blend-fbx-gltf-file-formats--box-delivery-shipping-pack-icons-4659515.png',
  truck: 'https://cdn3d.iconscout.com/3d/premium/thumb/truck-3d-icon-download-in-png-blend-fbx-gltf-file-formats--delivery-transport-logistics-pack-icons-4659524.png',
  barcode: 'https://cdn3d.iconscout.com/3d/premium/thumb/barcode-3d-icon-download-in-png-blend-fbx-gltf-file-formats--qr-code-scan-technology-pack-icons-4659503.png',
  label: 'https://cdn3d.iconscout.com/3d/premium/thumb/label-3d-icon-download-in-png-blend-fbx-gltf-file-formats--tag-price-shopping-pack-icons-4659513.png',
  
  // Customer & CRM
  customer: 'https://cdn3d.iconscout.com/3d/premium/thumb/customer-3d-icon-download-in-png-blend-fbx-gltf-file-formats--user-person-people-business-pack-icons-4659506.png',
  customers: 'https://cdn3d.iconscout.com/3d/premium/thumb/customers-3d-icon-download-in-png-blend-fbx-gltf-file-formats--users-people-group-business-pack-icons-4659507.png',
  profile: 'https://cdn3d.iconscout.com/3d/premium/thumb/profile-3d-icon-download-in-png-blend-fbx-gltf-file-formats--user-person-account-business-pack-icons-4659517.png',
  contact: 'https://cdn3d.iconscout.com/3d/premium/thumb/contact-3d-icon-download-in-png-blend-fbx-gltf-file-formats--phone-communication-business-pack-icons-4659505.png',
  
  // Settings & Configuration
  settings: 'https://cdn3d.iconscout.com/3d/premium/thumb/settings-3d-icon-download-in-png-blend-fbx-gltf-file-formats--gear-configuration-system-pack-icons-4659519.png',
  config: 'https://cdn3d.iconscout.com/3d/premium/thumb/configuration-3d-icon-download-in-png-blend-fbx-gltf-file-formats--settings-gear-system-pack-icons-4659508.png',
  tools: 'https://cdn3d.iconscout.com/3d/premium/thumb/tools-3d-icon-download-in-png-blend-fbx-gltf-file-formats--wrench-repair-maintenance-pack-icons-4659523.png',
  
  // Actions & Operations
  create: 'https://cdn3d.iconscout.com/3d/premium/thumb/create-3d-icon-download-in-png-blend-fbx-gltf-file-formats--add-new-plus-business-pack-icons-4659509.png',
  edit: 'https://cdn3d.iconscout.com/3d/premium/thumb/edit-3d-icon-download-in-png-blend-fbx-gltf-file-formats--pencil-write-modify-business-pack-icons-4659510.png',
  delete: 'https://cdn3d.iconscout.com/3d/premium/thumb/delete-3d-icon-download-in-png-blend-fbx-gltf-file-formats--trash-remove-business-pack-icons-4659511.png',
  download: 'https://cdn3d.iconscout.com/3d/premium/thumb/download-3d-icon-download-in-png-blend-fbx-gltf-file-formats--save-export-business-pack-icons-4659512.png',
  upload: 'https://cdn3d.iconscout.com/3d/premium/thumb/upload-3d-icon-download-in-png-blend-fbx-gltf-file-formats--import-cloud-business-pack-icons-4659525.png',
  
  // Status & Notifications
  success: 'https://cdn3d.iconscout.com/3d/premium/thumb/success-3d-icon-download-in-png-blend-fbx-gltf-file-formats--check-approved-business-pack-icons-4659521.png',
  warning: 'https://cdn3d.iconscout.com/3d/premium/thumb/warning-3d-icon-download-in-png-blend-fbx-gltf-file-formats--alert-caution-business-pack-icons-4659526.png',
  error: 'https://cdn3d.iconscout.com/3d/premium/thumb/error-3d-icon-download-in-png-blend-fbx-gltf-file-formats--warning-alert-business-pack-icons-4659513.png',
  notification: 'https://cdn3d.iconscout.com/3d/premium/thumb/notification-3d-icon-download-in-png-blend-fbx-gltf-file-formats--bell-alert-business-pack-icons-4659515.png',
  
  // Business & Commerce
  business: 'https://cdn3d.iconscout.com/3d/premium/thumb/business-3d-icon-download-in-png-blend-fbx-gltf-file-formats--office-company-corporate-pack-icons-4659504.png',
  shop: 'https://cdn3d.iconscout.com/3d/premium/thumb/shop-3d-icon-download-in-png-blend-fbx-gltf-file-formats--store-retail-business-pack-icons-4659520.png',
  order: 'https://cdn3d.iconscout.com/3d/premium/thumb/order-3d-icon-download-in-png-blend-fbx-gltf-file-formats--shopping-cart-business-pack-icons-4659516.png',
  
  // Technology & Digital
  qrcode: 'https://cdn3d.iconscout.com/3d/premium/thumb/qr-code-3d-icon-download-in-png-blend-fbx-gltf-file-formats--scan-barcode-technology-pack-icons-4659518.png',
  digital: 'https://cdn3d.iconscout.com/3d/premium/thumb/digital-3d-icon-download-in-png-blend-fbx-gltf-file-formats--technology-computer-business-pack-icons-4659511.png',
  cloud: 'https://cdn3d.iconscout.com/3d/premium/thumb/cloud-3d-icon-download-in-png-blend-fbx-gltf-file-formats--storage-data-technology-pack-icons-4659507.png',
  
  // Subscription & Plans
  subscription: 'https://cdn3d.iconscout.com/3d/premium/thumb/subscription-3d-icon-download-in-png-blend-fbx-gltf-file-formats--plan-membership-business-pack-icons-4659522.png',
  premium: 'https://cdn3d.iconscout.com/3d/premium/thumb/premium-3d-icon-download-in-png-blend-fbx-gltf-file-formats--crown-vip-business-pack-icons-4659517.png',
  trial: 'https://cdn3d.iconscout.com/3d/premium/thumb/trial-3d-icon-download-in-png-blend-fbx-gltf-file-formats--test-demo-business-pack-icons-4659524.png',
};

const SIZE_CLASSES = {
  small: 'w-6 h-6',
  medium: 'w-8 h-8',
  large: 'w-12 h-12',
  xlarge: 'w-16 h-16',
};

export const Icon3D: React.FC<Icon3DProps> = ({ 
  name, 
  size = 'medium', 
  className = '', 
  style = {} 
}) => {
  const iconUrl = ICON_URLS[name as keyof typeof ICON_URLS];
  const sizeClass = SIZE_CLASSES[size];

  if (!iconUrl) {
    console.warn(`3D Icon "${name}" not found. Available icons:`, Object.keys(ICON_URLS));
    return null;
  }

  return (
    <img
      src={iconUrl}
      alt={`${name} 3D icon`}
      className={`${sizeClass} object-contain ${className}`}
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        ...style,
      }}
      loading="lazy"
      onError={(e) => {
        console.error(`Failed to load 3D icon: ${name}`, e);
        // Fallback to a simple colored div
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
};

// Icon component with hover effects and animations
export const AnimatedIcon3D: React.FC<Icon3DProps & { 
  hover?: boolean;
  pulse?: boolean;
  rotate?: boolean;
}> = ({ 
  hover = true, 
  pulse = false, 
  rotate = false, 
  className = '',
  ...props 
}) => {
  const animationClasses = [
    hover ? 'hover:scale-110 hover:-translate-y-1' : '',
    pulse ? 'animate-pulse' : '',
    rotate ? 'hover:rotate-12' : '',
    'transition-all duration-300 ease-in-out',
  ].filter(Boolean).join(' ');

  return (
    <Icon3D 
      {...props} 
      className={`${animationClasses} ${className}`}
    />
  );
};

// Predefined icon sets for common use cases
export const InvoiceIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="invoice" {...props} />;

export const ShippingIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="shipping" {...props} />;

export const CustomerIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="customer" {...props} />;

export const DashboardIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="dashboard" {...props} />;

export const SettingsIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="settings" {...props} />;

export const AnalyticsIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="analytics" {...props} />;

export const BarcodeIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="barcode" {...props} />;

export const QRCodeIcon = (props: Omit<Icon3DProps, 'name'>) => 
  <AnimatedIcon3D name="qrcode" {...props} />;

export default Icon3D;