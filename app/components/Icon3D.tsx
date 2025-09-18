import React from 'react';

interface Icon3DProps {
  name: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  style?: React.CSSProperties;
}

// Simple fallback icons using Shopify Polaris icons or Unicode symbols
const FALLBACK_ICONS = {
  // Dashboard & Analytics
  dashboard: '📊',
  analytics: '📈',
  statistics: '📊',
  
  // Invoice & Finance
  invoice: '🧾',
  receipt: '🧾',
  calculator: '🧮',
  money: '💰',
  tax: '💸',
  
  // Shipping & Logistics
  shipping: '📦',
  package: '📦',
  truck: '🚚',
  barcode: '🏷️',
  label: '🏷️',
  
  // Customer & CRM
  customer: '👤',
  customers: '👥',
  profile: '👤',
  contact: '📞',
  
  // Settings & Configuration
  settings: '⚙️',
  config: '⚙️',
  tools: '🔧',
  
  // Actions & Operations
  create: '➕',
  add: '➕',
  edit: '✏️',
  delete: '🗑️',
  download: '⬇️',
  upload: '⬆️',
  view: '👁️',
  search: '🔍',
  bulk: '📋',
  
  // Status & Notifications
  success: '✅',
  warning: '⚠️',
  error: '❌',
  notification: '🔔',
  
  // Business & Commerce
  business: '🏢',
  shop: '🏪',
  order: '🛒',
  
  // Technology & Digital
  qrcode: '📱',
  digital: '💻',
  cloud: '☁️',
  
  // Time & Calendar
  calendar: '📅',
  clock: '🕐',
  
  // Subscription & Plans
  subscription: '📋',
  premium: '👑',
  trial: '🆓',
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
  const fallbackIcon = FALLBACK_ICONS[name as keyof typeof FALLBACK_ICONS];
  const sizeClass = SIZE_CLASSES[size];

  if (!fallbackIcon) {
    console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(FALLBACK_ICONS));
    return (
      <span 
        className={`${sizeClass} inline-flex items-center justify-center bg-gray-200 rounded text-gray-500 ${className}`}
        style={style}
        title={`${name} icon`}
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex items-center justify-center ${className}`}
      style={{
        fontSize: size === 'small' ? '16px' : size === 'medium' ? '20px' : size === 'large' ? '28px' : '32px',
        ...style,
      }}
      title={`${name} icon`}
    >
      {fallbackIcon}
    </span>
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