import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  People as PeopleIcon,
  Subscriptions as SubscriptionsIcon,
} from '@mui/icons-material';

import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import {
  CustomerList,
  CustomerShow,
  CustomerEdit,
  CustomerCreate,
} from './components/Customers';
import {
  SubscriptionList,
  SubscriptionShow,
  SubscriptionEdit,
} from './components/Subscriptions';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

const MyLayout = (props: any) => <div {...props} />;

export const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={Dashboard}
      layout={MyLayout}
      title="GST Invoice Admin Panel v2"
    >
      <Resource
        name="customers"
        list={CustomerList}
        show={CustomerShow}
        edit={CustomerEdit}
        create={CustomerCreate}
        icon={PeopleIcon}
        options={{ label: 'Customers' }}
      />
      <Resource
        name="subscriptions"
        list={SubscriptionList}
        show={SubscriptionShow}
        edit={SubscriptionEdit}
        icon={SubscriptionsIcon}
        options={{ label: 'Subscriptions' }}
      />
      <CustomRoutes>
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </CustomRoutes>
    </Admin>
  </ThemeProvider>
);