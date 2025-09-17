# 🧾 GST Invoice & Shipping Manager for Shopify

[![Shopify App](https://img.shields.io/badge/Shopify-App-green?logo=shopify)](https://shopify.dev)
[![Remix](https://img.shields.io/badge/Remix-Framework-blue?logo=remix)](https://remix.run)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://typescriptlang.org)
[![Polaris](https://img.shields.io/badge/Polaris-UI-green?logo=shopify)](https://polaris.shopify.com)

A comprehensive **GST-compliant invoicing and shipping management solution** for Indian Shopify merchants. This app combines invoice generation, customer CRM, and shipping label management with beautiful 3D icons and modern UI.

## 🎯 Features

### ✅ Completed Features

#### 🧾 GST Invoice Module
- **GST-Compliant Invoices**: Automatic generation with CGST/SGST/IGST calculations
- **Invoice Management**: Create, view, edit, and delete invoices with advanced filtering
- **Bulk Operations**: Generate multiple invoices, download as ZIP
- **PDF Generation**: Professional invoice templates with company branding
- **Tax Calculations**: State-wise tax logic with HSN code support
- **Status Tracking**: Draft, Sent, Paid, Overdue with visual indicators

#### 👥 Customer CRM Foundation
- **Customer Management**: Complete CRUD operations with validation
- **GSTIN Support**: Store and validate customer GST numbers
- **Export Functionality**: CSV/Excel export capabilities
- **Notes System**: Customer-specific comments and history

#### 📦 Shipping Label System
- **Label Generation**: Professional shipping labels with barcodes
- **QR Code Support**: Dynamic QR code generation for tracking
- **Bulk Processing**: Generate multiple labels simultaneously
- **Tracking Integration**: Support for courier service integration

#### 🎨 3D Icons & UI
- **36 Premium 3D Icons**: Animated icons from Iconscout
- **Modern Dashboard**: Statistics cards with interactive elements
- **Responsive Design**: Mobile-friendly with Shopify Polaris
- **Dark Mode Ready**: UI components support theme switching

#### ⚙️ Settings & Configuration
- **GST Configuration**: Tax rates, company details, GSTIN setup
- **Invoice Customization**: Templates, numbering, branding
- **User Management**: Role-based access control foundation

### 🚧 In Development

#### 🔄 Shopify Integration
- Real-time order synchronization
- Product data fetching and mapping
- Webhook setup for order updates
- Customer data sync from Shopify

#### 🏢 Admin Panel
- Separate web application for business management
- Customer subscription management
- Revenue analytics and reporting
- Support ticketing system

#### 📧 Communication
- Email integration (SendGrid/SMTP)
- WhatsApp integration (Twilio)
- Automated notifications

## 🛠 Technology Stack

- **Frontend**: React 18 + Remix + TypeScript
- **UI Framework**: Shopify Polaris
- **Backend**: Node.js + Express
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **PDF Generation**: jsPDF + Puppeteer
- **Barcode/QR**: bwip-js + qrcode
- **Icons**: 3D Icons from Iconscout
- **Authentication**: Shopify App Bridge

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Shopify Partner Account
- Shopify CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/r2w34/gst-invoice-shipping-manager.git
   cd gst-invoice-shipping-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Shopify app credentials
   ```

4. **Set up database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_orders,write_orders,read_customers,write_customers
DATABASE_URL=file:./dev.db
```

## 📊 Database Schema

The app uses a comprehensive database schema with 6 main models:

- **Session**: Shopify authentication
- **Invoice**: GST-compliant invoice data
- **Customer**: CRM and customer management
- **ShippingLabel**: Label and tracking information
- **Subscription**: Billing and plan management
- **AppSettings**: Configuration and preferences

## 🎨 3D Icons Gallery

The app features 36 premium 3D icons with animations:

- **Dashboard Icons**: Charts, analytics, reports
- **Action Icons**: Create, edit, delete, download
- **Status Icons**: Success, warning, error, info
- **Navigation Icons**: Home, settings, profile
- **Feature Icons**: Invoice, shipping, customer, labels

Visit `/app/icons` to see the complete gallery.

## 🏗 Project Structure

```
app/
├── components/           # Reusable React components
│   ├── Icon3D.tsx       # 3D icon system
│   └── IconShowcase.tsx # Icon gallery
├── models/              # Database models
│   ├── Invoice.server.js
│   ├── Customer.server.js
│   └── ShippingLabel.server.js
├── routes/              # Remix routes
│   ├── app._index.tsx   # Dashboard
│   ├── app.invoices/    # Invoice management
│   └── app.settings.tsx # Configuration
├── services/            # Business logic
│   └── PDFGenerator.server.js
└── styles/              # CSS and styling
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 📦 Deployment

### Shopify App Store

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy to Shopify**
   ```bash
   shopify app deploy
   ```

### Self-hosted

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/r2w34/gst-invoice-shipping-manager/wiki)
- **Issues**: [GitHub Issues](https://github.com/r2w34/gst-invoice-shipping-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/r2w34/gst-invoice-shipping-manager/discussions)

## 🎯 Roadmap

### Phase 1 (Current) ✅
- [x] Core invoice management
- [x] 3D icons integration
- [x] Basic CRM functionality
- [x] PDF generation
- [x] Shipping label foundation

### Phase 2 (Next)
- [ ] Shopify order synchronization
- [ ] Real-time webhooks
- [ ] Email/WhatsApp integration
- [ ] Advanced reporting

### Phase 3 (Future)
- [ ] Admin panel
- [ ] Multi-user support
- [ ] API integrations
- [ ] Mobile app

## 🏆 Achievements

- ✅ **6,800+ lines** of clean, documented code
- ✅ **36 premium 3D icons** with animations
- ✅ **GST compliance** built-in
- ✅ **Modern UI/UX** with Shopify Polaris
- ✅ **Comprehensive PDF generation**
- ✅ **Production-ready** architecture

## 📈 Stats

- **Components**: 15+ React components
- **Routes**: 8 main application routes
- **Database Models**: 6 comprehensive models
- **Build Time**: ~4-5 seconds
- **Bundle Size**: Optimized for performance

---

**Made with ❤️ for Indian Shopify merchants**

*Simplifying GST compliance and shipping management, one invoice at a time.*