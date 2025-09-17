import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  NumberField,
  EditButton,
  ShowButton,
  DeleteButton,
  Create,
  Edit,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextInput,
  DateInput,
  required,
  email,
  Filter,
  SearchInput,
  SelectInput,
  ReferenceField,
  ReferenceManyField,
  Tab,
  TabbedShowLayout,
  ChipField,
  BooleanField,
  BooleanInput,
} from 'react-admin';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

/**
 * Customer List Filters
 */
const CustomerFilter = (props: any) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    <SelectInput
      source="status"
      choices={[
        { id: 'ACTIVE', name: 'Active' },
        { id: 'INACTIVE', name: 'Inactive' },
      ]}
    />
    <BooleanInput source="hasGSTIN" label="Has GSTIN" />
  </Filter>
);

/**
 * Customer List Component
 */
export const CustomerList = (props: any) => (
  <List
    {...props}
    filters={<CustomerFilter />}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show">
      <TextField source="name" />
      <EmailField source="email" />
      <TextField source="phone" />
      <TextField source="gstin" label="GSTIN" />
      <TextField source="state" />
      <ChipField
        source="status"
        sx={{
          '& .MuiChip-root': {
            backgroundColor: (record: any) =>
              record.status === 'ACTIVE' ? '#4caf50' : '#f44336',
            color: 'white',
          },
        }}
      />
      <NumberField source="_count.invoices" label="Invoices" />
      <DateField source="createdAt" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

/**
 * Customer Create Component
 */
export const CustomerCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <TextInput source="email" validate={[required(), email()]} fullWidth />
      <TextInput source="phone" fullWidth />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Address Information
      </Typography>
      <TextInput source="address" multiline rows={3} fullWidth />
      <TextInput source="city" />
      <TextInput source="state" />
      <TextInput source="pincode" />
      <TextInput source="country" defaultValue="India" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        GST Information
      </Typography>
      <TextInput source="gstin" label="GSTIN" />
      <BooleanInput source="isGSTRegistered" label="GST Registered" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Additional Information
      </Typography>
      <TextInput source="notes" multiline rows={3} fullWidth />
      <SelectInput
        source="status"
        choices={[
          { id: 'ACTIVE', name: 'Active' },
          { id: 'INACTIVE', name: 'Inactive' },
        ]}
        defaultValue="ACTIVE"
      />
    </SimpleForm>
  </Create>
);

/**
 * Customer Edit Component
 */
export const CustomerEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <TextInput source="email" validate={[required(), email()]} fullWidth />
      <TextInput source="phone" fullWidth />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Address Information
      </Typography>
      <TextInput source="address" multiline rows={3} fullWidth />
      <TextInput source="city" />
      <TextInput source="state" />
      <TextInput source="pincode" />
      <TextInput source="country" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        GST Information
      </Typography>
      <TextInput source="gstin" label="GSTIN" />
      <BooleanInput source="isGSTRegistered" label="GST Registered" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Additional Information
      </Typography>
      <TextInput source="notes" multiline rows={3} fullWidth />
      <SelectInput
        source="status"
        choices={[
          { id: 'ACTIVE', name: 'Active' },
          { id: 'INACTIVE', name: 'Inactive' },
        ]}
      />
    </SimpleForm>
  </Edit>
);

/**
 * Customer Show Component
 */
export const CustomerShow = (props: any) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label="Details">
        <SimpleShowLayout>
          <TextField source="name" />
          <EmailField source="email" />
          <TextField source="phone" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Address Information
          </Typography>
          <TextField source="address" />
          <TextField source="city" />
          <TextField source="state" />
          <TextField source="pincode" />
          <TextField source="country" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            GST Information
          </Typography>
          <TextField source="gstin" label="GSTIN" />
          <BooleanField source="isGSTRegistered" label="GST Registered" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Status & Dates
          </Typography>
          <ChipField source="status" />
          <DateField source="createdAt" />
          <DateField source="updatedAt" />
          
          <TextField source="notes" />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="Invoices">
        <ReferenceManyField
          reference="invoices"
          target="customerId"
          label="Customer Invoices"
        >
          <Datagrid>
            <TextField source="invoiceNumber" />
            <DateField source="invoiceDate" />
            <NumberField source="totalAmount" />
            <ChipField source="status" />
            <DateField source="createdAt" />
            <EditButton />
            <ShowButton />
          </Datagrid>
        </ReferenceManyField>
      </Tab>
      
      <Tab label="Orders">
        <ReferenceManyField
          reference="orders"
          target="customerId"
          label="Customer Orders"
        >
          <Datagrid>
            <TextField source="shopifyOrderId" />
            <DateField source="orderDate" />
            <NumberField source="totalAmount" />
            <ChipField source="status" />
            <DateField source="createdAt" />
            <ShowButton />
          </Datagrid>
        </ReferenceManyField>
      </Tab>
      
      <Tab label="Shipping Labels">
        <ReferenceManyField
          reference="labels"
          target="customerId"
          label="Customer Labels"
        >
          <Datagrid>
            <TextField source="trackingId" />
            <TextField source="courierService" />
            <ChipField source="status" />
            <DateField source="createdAt" />
            <ShowButton />
          </Datagrid>
        </ReferenceManyField>
      </Tab>
    </TabbedShowLayout>
  </Show>
);