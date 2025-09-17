import React from 'react';
import {
  List,
  Datagrid,
  TextField,
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
  NumberInput,
  required,
  Filter,
  SearchInput,
  SelectInput,
  ReferenceInput,
  ReferenceField,
  Tab,
  TabbedShowLayout,
  ChipField,
  BooleanField,
  BooleanInput,
  FunctionField,
} from 'react-admin';
import { Typography, Table, TableBody, TableCell, TableHead, TableRow, Card, CardContent } from '@mui/material';

/**
 * Order List Filters
 */
const OrderFilter = (props: any) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    <SelectInput
      source="status"
      choices={[
        { id: 'PENDING', name: 'Pending' },
        { id: 'PROCESSING', name: 'Processing' },
        { id: 'SHIPPED', name: 'Shipped' },
        { id: 'DELIVERED', name: 'Delivered' },
        { id: 'CANCELLED', name: 'Cancelled' },
        { id: 'REFUNDED', name: 'Refunded' },
      ]}
    />
    <ReferenceInput source="customerId" reference="customers">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <DateInput source="orderDate_gte" label="Order Date From" />
    <DateInput source="orderDate_lte" label="Order Date To" />
  </Filter>
);

/**
 * Order List Component
 */
export const OrderList = (props: any) => (
  <List
    {...props}
    filters={<OrderFilter />}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show">
      <TextField source="shopifyOrderId" label="Order ID" />
      <ReferenceField source="customerId" reference="customers">
        <TextField source="name" />
      </ReferenceField>
      <DateField source="orderDate" />
      <NumberField source="totalAmount" options={{ style: 'currency', currency: 'INR' }} />
      <NumberField source="itemCount" label="Items" />
      <ChipField
        source="status"
        sx={{
          '& .MuiChip-root': {
            backgroundColor: (record: any) => {
              switch (record.status) {
                case 'DELIVERED': return '#4caf50';
                case 'SHIPPED': return '#2196f3';
                case 'PROCESSING': return '#ff9800';
                case 'PENDING': return '#9e9e9e';
                case 'CANCELLED': return '#f44336';
                case 'REFUNDED': return '#ff5722';
                default: return '#9e9e9e';
              }
            },
            color: 'white',
          },
        }}
      />
      <BooleanField source="invoiceGenerated" label="Invoice" />
      <DateField source="createdAt" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

/**
 * Order Create Component
 */
export const OrderCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="name" fullWidth />
      </ReferenceInput>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Order Details
      </Typography>
      <TextInput source="shopifyOrderId" label="Shopify Order ID" validate={[required()]} />
      <DateInput source="orderDate" validate={[required()]} />
      <NumberInput source="totalAmount" validate={[required()]} />
      <NumberInput source="itemCount" validate={[required()]} />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Shipping Information
      </Typography>
      <TextInput source="shippingAddress" multiline rows={3} fullWidth />
      <TextInput source="shippingMethod" />
      <NumberInput source="shippingCost" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Status & Flags
      </Typography>
      <SelectInput
        source="status"
        choices={[
          { id: 'PENDING', name: 'Pending' },
          { id: 'PROCESSING', name: 'Processing' },
          { id: 'SHIPPED', name: 'Shipped' },
          { id: 'DELIVERED', name: 'Delivered' },
          { id: 'CANCELLED', name: 'Cancelled' },
          { id: 'REFUNDED', name: 'Refunded' },
        ]}
        defaultValue="PENDING"
      />
      <BooleanInput source="invoiceGenerated" label="Invoice Generated" />
      <BooleanInput source="labelGenerated" label="Label Generated" />
      
      <TextInput source="notes" multiline rows={3} fullWidth />
    </SimpleForm>
  </Create>
);

/**
 * Order Edit Component
 */
export const OrderEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="name" fullWidth />
      </ReferenceInput>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Order Details
      </Typography>
      <TextInput source="shopifyOrderId" label="Shopify Order ID" validate={[required()]} />
      <DateInput source="orderDate" validate={[required()]} />
      <NumberInput source="totalAmount" validate={[required()]} />
      <NumberInput source="itemCount" validate={[required()]} />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Shipping Information
      </Typography>
      <TextInput source="shippingAddress" multiline rows={3} fullWidth />
      <TextInput source="shippingMethod" />
      <NumberInput source="shippingCost" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Status & Flags
      </Typography>
      <SelectInput
        source="status"
        choices={[
          { id: 'PENDING', name: 'Pending' },
          { id: 'PROCESSING', name: 'Processing' },
          { id: 'SHIPPED', name: 'Shipped' },
          { id: 'DELIVERED', name: 'Delivered' },
          { id: 'CANCELLED', name: 'Cancelled' },
          { id: 'REFUNDED', name: 'Refunded' },
        ]}
      />
      <BooleanInput source="invoiceGenerated" label="Invoice Generated" />
      <BooleanInput source="labelGenerated" label="Label Generated" />
      
      <TextInput source="notes" multiline rows={3} fullWidth />
    </SimpleForm>
  </Edit>
);

/**
 * Order Items Display Component
 */
const OrderItemsField = ({ record }: any) => {
  if (!record?.items || !Array.isArray(record.items)) {
    return <Typography>No items</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Product</TableCell>
          <TableCell>SKU</TableCell>
          <TableCell align="right">Quantity</TableCell>
          <TableCell align="right">Price</TableCell>
          <TableCell align="right">Total</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {record.items.map((item: any, index: number) => (
          <TableRow key={index}>
            <TableCell>{item.title}</TableCell>
            <TableCell>{item.sku}</TableCell>
            <TableCell align="right">{item.quantity}</TableCell>
            <TableCell align="right">₹{item.price}</TableCell>
            <TableCell align="right">₹{item.quantity * item.price}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Order Show Component
 */
export const OrderShow = (props: any) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label="Order Details">
        <SimpleShowLayout>
          <TextField source="shopifyOrderId" label="Shopify Order ID" />
          <ReferenceField source="customerId" reference="customers">
            <TextField source="name" />
          </ReferenceField>
          <DateField source="orderDate" />
          <NumberField source="totalAmount" options={{ style: 'currency', currency: 'INR' }} />
          <NumberField source="itemCount" label="Items" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Shipping Information
          </Typography>
          <TextField source="shippingAddress" />
          <TextField source="shippingMethod" />
          <NumberField source="shippingCost" options={{ style: 'currency', currency: 'INR' }} />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Status & Flags
          </Typography>
          <ChipField source="status" />
          <BooleanField source="invoiceGenerated" label="Invoice Generated" />
          <BooleanField source="labelGenerated" label="Label Generated" />
          
          <DateField source="createdAt" />
          <DateField source="updatedAt" />
          
          <TextField source="notes" />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="Order Items">
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>
            <FunctionField render={OrderItemsField} />
          </CardContent>
        </Card>
      </Tab>
      
      <Tab label="Related Records">
        <SimpleShowLayout>
          <Typography variant="h6" gutterBottom>
            Generated Documents
          </Typography>
          {/* Add reference fields for related invoices and labels */}
          <BooleanField source="invoiceGenerated" label="Invoice Generated" />
          <BooleanField source="labelGenerated" label="Label Generated" />
        </SimpleShowLayout>
      </Tab>
    </TabbedShowLayout>
  </Show>
);