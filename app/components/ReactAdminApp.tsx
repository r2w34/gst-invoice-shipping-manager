import React from 'react';
import {
  Admin,
  Resource,
  ListGuesser,
  EditGuesser,
  ShowGuesser,
  CreateGuesser,
} from 'react-admin';
import { dataProvider } from '../services/ReactAdminDataProvider.client';
import { authProvider } from '../services/ReactAdminAuthProvider.client';
import { Dashboard } from './admin/Dashboard';
import { CustomerList, CustomerEdit, CustomerShow, CustomerCreate } from './admin/Customers';
import { InvoiceList, InvoiceEdit, InvoiceShow, InvoiceCreate } from './admin/Invoices';
import { OrderList, OrderEdit, OrderShow, OrderCreate } from './admin/Orders';
import { LabelList, LabelEdit, LabelShow, LabelCreate } from './admin/Labels';
import { TemplateList, TemplateEdit, TemplateShow, TemplateCreate } from './admin/Templates';
import { AnalyticsPage } from './admin/Analytics';
import { SettingsPage } from './admin/Settings';

// Material-UI Icons
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * React Admin Application
 * Modern admin interface for GST Invoice & Shipping Manager
 */
export const ReactAdminApp: React.FC = () => {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={Dashboard}
      title="GST Invoice & Shipping Manager"
      darkTheme={{
        palette: {
          mode: 'dark',
          primary: {
            main: '#00A96E', // Shopify green
          },
          secondary: {
            main: '#5C6AC4', // Shopify purple
          },
        },
      }}
    >
      {/* Customer Management */}
      <Resource
        name="customers"
        list={CustomerList}
        edit={CustomerEdit}
        show={CustomerShow}
        create={CustomerCreate}
        icon={PeopleIcon}
        options={{ label: 'Customers' }}
      />

      {/* Invoice Management */}
      <Resource
        name="invoices"
        list={InvoiceList}
        edit={InvoiceEdit}
        show={InvoiceShow}
        create={InvoiceCreate}
        icon={ReceiptIcon}
        options={{ label: 'Invoices' }}
      />

      {/* Order Management */}
      <Resource
        name="orders"
        list={OrderList}
        edit={OrderEdit}
        show={OrderShow}
        create={OrderCreate}
        icon={ShoppingCartIcon}
        options={{ label: 'Orders' }}
      />

      {/* Shipping Labels */}
      <Resource
        name="labels"
        list={LabelList}
        edit={LabelEdit}
        show={LabelShow}
        create={LabelCreate}
        icon={LocalShippingIcon}
        options={{ label: 'Shipping Labels' }}
      />

      {/* Invoice Templates */}
      <Resource
        name="templates"
        list={TemplateList}
        edit={TemplateEdit}
        show={TemplateShow}
        create={TemplateCreate}
        icon={DescriptionIcon}
        options={{ label: 'Templates' }}
      />

      {/* Analytics (Custom Page) */}
      <Resource
        name="analytics"
        list={AnalyticsPage}
        icon={AnalyticsIcon}
        options={{ label: 'Analytics' }}
      />

      {/* Settings (Custom Page) */}
      <Resource
        name="settings"
        list={SettingsPage}
        icon={SettingsIcon}
        options={{ label: 'Settings' }}
      />
    </Admin>
  );
};

export default ReactAdminApp;