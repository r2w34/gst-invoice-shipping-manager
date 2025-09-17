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
  ArrayField,
  SingleFieldList,
  FunctionField,
} from 'react-admin';
import { Card, CardContent, Typography, Box, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

/**
 * Invoice List Filters
 */
const InvoiceFilter = (props: any) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    <SelectInput
      source="status"
      choices={[
        { id: 'DRAFT', name: 'Draft' },
        { id: 'SENT', name: 'Sent' },
        { id: 'PAID', name: 'Paid' },
        { id: 'OVERDUE', name: 'Overdue' },
        { id: 'CANCELLED', name: 'Cancelled' },
      ]}
    />
    <ReferenceInput source="customerId" reference="customers">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <DateInput source="invoiceDate_gte" label="Invoice Date From" />
    <DateInput source="invoiceDate_lte" label="Invoice Date To" />
  </Filter>
);

/**
 * Invoice List Component
 */
export const InvoiceList = (props: any) => (
  <List
    {...props}
    filters={<InvoiceFilter />}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show">
      <TextField source="invoiceNumber" />
      <ReferenceField source="customerId" reference="customers">
        <TextField source="name" />
      </ReferenceField>
      <DateField source="invoiceDate" />
      <NumberField source="totalAmount" options={{ style: 'currency', currency: 'INR' }} />
      <NumberField source="taxAmount" options={{ style: 'currency', currency: 'INR' }} />
      <ChipField
        source="status"
        sx={{
          '& .MuiChip-root': {
            backgroundColor: (record: any) => {
              switch (record.status) {
                case 'PAID': return '#4caf50';
                case 'SENT': return '#2196f3';
                case 'OVERDUE': return '#f44336';
                case 'DRAFT': return '#9e9e9e';
                case 'CANCELLED': return '#ff5722';
                default: return '#9e9e9e';
              }
            },
            color: 'white',
          },
        }}
      />
      <DateField source="createdAt" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

/**
 * Invoice Create Component
 */
export const InvoiceCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="name" fullWidth />
      </ReferenceInput>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Invoice Details
      </Typography>
      <TextInput source="invoiceNumber" validate={[required()]} />
      <DateInput source="invoiceDate" validate={[required()]} />
      <DateInput source="dueDate" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Amounts
      </Typography>
      <NumberInput source="subtotal" validate={[required()]} />
      <NumberInput source="taxAmount" />
      <NumberInput source="totalAmount" validate={[required()]} />
      <NumberInput source="discountAmount" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        GST Information
      </Typography>
      <TextInput source="placeOfSupply" />
      <NumberInput source="cgstRate" label="CGST Rate %" />
      <NumberInput source="sgstRate" label="SGST Rate %" />
      <NumberInput source="igstRate" label="IGST Rate %" />
      <NumberInput source="cgstAmount" label="CGST Amount" />
      <NumberInput source="sgstAmount" label="SGST Amount" />
      <NumberInput source="igstAmount" label="IGST Amount" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Additional Information
      </Typography>
      <TextInput source="notes" multiline rows={3} fullWidth />
      <SelectInput
        source="status"
        choices={[
          { id: 'DRAFT', name: 'Draft' },
          { id: 'SENT', name: 'Sent' },
          { id: 'PAID', name: 'Paid' },
          { id: 'OVERDUE', name: 'Overdue' },
          { id: 'CANCELLED', name: 'Cancelled' },
        ]}
        defaultValue="DRAFT"
      />
    </SimpleForm>
  </Create>
);

/**
 * Invoice Edit Component
 */
export const InvoiceEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="name" fullWidth />
      </ReferenceInput>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Invoice Details
      </Typography>
      <TextInput source="invoiceNumber" validate={[required()]} />
      <DateInput source="invoiceDate" validate={[required()]} />
      <DateInput source="dueDate" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Amounts
      </Typography>
      <NumberInput source="subtotal" validate={[required()]} />
      <NumberInput source="taxAmount" />
      <NumberInput source="totalAmount" validate={[required()]} />
      <NumberInput source="discountAmount" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        GST Information
      </Typography>
      <TextInput source="placeOfSupply" />
      <NumberInput source="cgstRate" label="CGST Rate %" />
      <NumberInput source="sgstRate" label="SGST Rate %" />
      <NumberInput source="igstRate" label="IGST Rate %" />
      <NumberInput source="cgstAmount" label="CGST Amount" />
      <NumberInput source="sgstAmount" label="SGST Amount" />
      <NumberInput source="igstAmount" label="IGST Amount" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Additional Information
      </Typography>
      <TextInput source="notes" multiline rows={3} fullWidth />
      <SelectInput
        source="status"
        choices={[
          { id: 'DRAFT', name: 'Draft' },
          { id: 'SENT', name: 'Sent' },
          { id: 'PAID', name: 'Paid' },
          { id: 'OVERDUE', name: 'Overdue' },
          { id: 'CANCELLED', name: 'Cancelled' },
        ]}
      />
    </SimpleForm>
  </Edit>
);

/**
 * Invoice Items Display Component
 */
const InvoiceItemsField = ({ record }: any) => {
  if (!record?.items || !Array.isArray(record.items)) {
    return <Typography>No items</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Description</TableCell>
          <TableCell align="right">HSN/SAC</TableCell>
          <TableCell align="right">Qty</TableCell>
          <TableCell align="right">Rate</TableCell>
          <TableCell align="right">Amount</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {record.items.map((item: any, index: number) => (
          <TableRow key={index}>
            <TableCell>{item.description}</TableCell>
            <TableCell align="right">{item.hsnCode}</TableCell>
            <TableCell align="right">{item.quantity}</TableCell>
            <TableCell align="right">₹{item.rate}</TableCell>
            <TableCell align="right">₹{item.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Invoice Show Component
 */
export const InvoiceShow = (props: any) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label="Invoice Details">
        <SimpleShowLayout>
          <TextField source="invoiceNumber" />
          <ReferenceField source="customerId" reference="customers">
            <TextField source="name" />
          </ReferenceField>
          <DateField source="invoiceDate" />
          <DateField source="dueDate" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Amounts
          </Typography>
          <NumberField source="subtotal" options={{ style: 'currency', currency: 'INR' }} />
          <NumberField source="taxAmount" options={{ style: 'currency', currency: 'INR' }} />
          <NumberField source="totalAmount" options={{ style: 'currency', currency: 'INR' }} />
          <NumberField source="discountAmount" options={{ style: 'currency', currency: 'INR' }} />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Status & Dates
          </Typography>
          <ChipField source="status" />
          <DateField source="createdAt" />
          <DateField source="updatedAt" />
          
          <TextField source="notes" />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="GST Details">
        <SimpleShowLayout>
          <TextField source="placeOfSupply" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Tax Rates
          </Typography>
          <NumberField source="cgstRate" label="CGST Rate %" />
          <NumberField source="sgstRate" label="SGST Rate %" />
          <NumberField source="igstRate" label="IGST Rate %" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Tax Amounts
          </Typography>
          <NumberField source="cgstAmount" label="CGST Amount" options={{ style: 'currency', currency: 'INR' }} />
          <NumberField source="sgstAmount" label="SGST Amount" options={{ style: 'currency', currency: 'INR' }} />
          <NumberField source="igstAmount" label="IGST Amount" options={{ style: 'currency', currency: 'INR' }} />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="Invoice Items">
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Invoice Items
            </Typography>
            <FunctionField render={InvoiceItemsField} />
          </CardContent>
        </Card>
      </Tab>
    </TabbedShowLayout>
  </Show>
);