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
} from 'react-admin';
import { Typography } from '@mui/material';

/**
 * Label List Filters
 */
const LabelFilter = (props: any) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    <SelectInput
      source="status"
      choices={[
        { id: 'CREATED', name: 'Created' },
        { id: 'PRINTED', name: 'Printed' },
        { id: 'SHIPPED', name: 'Shipped' },
        { id: 'IN_TRANSIT', name: 'In Transit' },
        { id: 'DELIVERED', name: 'Delivered' },
        { id: 'RETURNED', name: 'Returned' },
      ]}
    />
    <SelectInput
      source="courierService"
      choices={[
        { id: 'INDIA_POST', name: 'India Post' },
        { id: 'BLUEDART', name: 'Blue Dart' },
        { id: 'DELHIVERY', name: 'Delhivery' },
        { id: 'DTDC', name: 'DTDC' },
        { id: 'FEDEX', name: 'FedEx' },
        { id: 'DHL', name: 'DHL' },
        { id: 'OTHER', name: 'Other' },
      ]}
    />
    <ReferenceInput source="customerId" reference="customers">
      <SelectInput optionText="name" />
    </ReferenceInput>
  </Filter>
);

/**
 * Label List Component
 */
export const LabelList = (props: any) => (
  <List
    {...props}
    filters={<LabelFilter />}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show">
      <TextField source="trackingId" />
      <ReferenceField source="customerId" reference="customers">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="courierService" />
      <TextField source="serviceType" />
      <NumberField source="weight" />
      <NumberField source="shippingCost" options={{ style: 'currency', currency: 'INR' }} />
      <ChipField
        source="status"
        sx={{
          '& .MuiChip-root': {
            backgroundColor: (record: any) => {
              switch (record.status) {
                case 'DELIVERED': return '#4caf50';
                case 'IN_TRANSIT': return '#2196f3';
                case 'SHIPPED': return '#ff9800';
                case 'PRINTED': return '#9c27b0';
                case 'CREATED': return '#9e9e9e';
                case 'RETURNED': return '#f44336';
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
 * Label Create Component
 */
export const LabelCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="name" fullWidth />
      </ReferenceInput>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Shipping Details
      </Typography>
      <TextInput source="trackingId" validate={[required()]} />
      <SelectInput
        source="courierService"
        choices={[
          { id: 'INDIA_POST', name: 'India Post' },
          { id: 'BLUEDART', name: 'Blue Dart' },
          { id: 'DELHIVERY', name: 'Delhivery' },
          { id: 'DTDC', name: 'DTDC' },
          { id: 'FEDEX', name: 'FedEx' },
          { id: 'DHL', name: 'DHL' },
          { id: 'OTHER', name: 'Other' },
        ]}
        validate={[required()]}
      />
      <SelectInput
        source="serviceType"
        choices={[
          { id: 'STANDARD', name: 'Standard' },
          { id: 'EXPRESS', name: 'Express' },
          { id: 'OVERNIGHT', name: 'Overnight' },
          { id: 'SAME_DAY', name: 'Same Day' },
        ]}
        defaultValue="STANDARD"
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Package Information
      </Typography>
      <NumberInput source="weight" label="Weight (kg)" step={0.1} />
      <NumberInput source="length" label="Length (cm)" />
      <NumberInput source="width" label="Width (cm)" />
      <NumberInput source="height" label="Height (cm)" />
      <NumberInput source="shippingCost" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Addresses
      </Typography>
      <TextInput source="fromAddress" multiline rows={3} fullWidth />
      <TextInput source="toAddress" multiline rows={3} fullWidth />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Status & Options
      </Typography>
      <SelectInput
        source="status"
        choices={[
          { id: 'CREATED', name: 'Created' },
          { id: 'PRINTED', name: 'Printed' },
          { id: 'SHIPPED', name: 'Shipped' },
          { id: 'IN_TRANSIT', name: 'In Transit' },
          { id: 'DELIVERED', name: 'Delivered' },
          { id: 'RETURNED', name: 'Returned' },
        ]}
        defaultValue="CREATED"
      />
      <BooleanInput source="codEnabled" label="Cash on Delivery" />
      <NumberInput source="codAmount" label="COD Amount" />
      <BooleanInput source="insuranceEnabled" label="Insurance" />
      <NumberInput source="insuranceAmount" label="Insurance Amount" />
      
      <TextInput source="notes" multiline rows={3} fullWidth />
    </SimpleForm>
  </Create>
);

/**
 * Label Edit Component
 */
export const LabelEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="name" fullWidth />
      </ReferenceInput>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Shipping Details
      </Typography>
      <TextInput source="trackingId" validate={[required()]} />
      <SelectInput
        source="courierService"
        choices={[
          { id: 'INDIA_POST', name: 'India Post' },
          { id: 'BLUEDART', name: 'Blue Dart' },
          { id: 'DELHIVERY', name: 'Delhivery' },
          { id: 'DTDC', name: 'DTDC' },
          { id: 'FEDEX', name: 'FedEx' },
          { id: 'DHL', name: 'DHL' },
          { id: 'OTHER', name: 'Other' },
        ]}
        validate={[required()]}
      />
      <SelectInput
        source="serviceType"
        choices={[
          { id: 'STANDARD', name: 'Standard' },
          { id: 'EXPRESS', name: 'Express' },
          { id: 'OVERNIGHT', name: 'Overnight' },
          { id: 'SAME_DAY', name: 'Same Day' },
        ]}
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Package Information
      </Typography>
      <NumberInput source="weight" label="Weight (kg)" step={0.1} />
      <NumberInput source="length" label="Length (cm)" />
      <NumberInput source="width" label="Width (cm)" />
      <NumberInput source="height" label="Height (cm)" />
      <NumberInput source="shippingCost" />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Addresses
      </Typography>
      <TextInput source="fromAddress" multiline rows={3} fullWidth />
      <TextInput source="toAddress" multiline rows={3} fullWidth />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Status & Options
      </Typography>
      <SelectInput
        source="status"
        choices={[
          { id: 'CREATED', name: 'Created' },
          { id: 'PRINTED', name: 'Printed' },
          { id: 'SHIPPED', name: 'Shipped' },
          { id: 'IN_TRANSIT', name: 'In Transit' },
          { id: 'DELIVERED', name: 'Delivered' },
          { id: 'RETURNED', name: 'Returned' },
        ]}
      />
      <BooleanInput source="codEnabled" label="Cash on Delivery" />
      <NumberInput source="codAmount" label="COD Amount" />
      <BooleanInput source="insuranceEnabled" label="Insurance" />
      <NumberInput source="insuranceAmount" label="Insurance Amount" />
      
      <TextInput source="notes" multiline rows={3} fullWidth />
    </SimpleForm>
  </Edit>
);

/**
 * Label Show Component
 */
export const LabelShow = (props: any) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label="Label Details">
        <SimpleShowLayout>
          <TextField source="trackingId" />
          <ReferenceField source="customerId" reference="customers">
            <TextField source="name" />
          </ReferenceField>
          <TextField source="courierService" />
          <TextField source="serviceType" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Package Information
          </Typography>
          <NumberField source="weight" label="Weight (kg)" />
          <NumberField source="length" label="Length (cm)" />
          <NumberField source="width" label="Width (cm)" />
          <NumberField source="height" label="Height (cm)" />
          <NumberField source="shippingCost" options={{ style: 'currency', currency: 'INR' }} />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Status & Dates
          </Typography>
          <ChipField source="status" />
          <DateField source="createdAt" />
          <DateField source="updatedAt" />
          
          <TextField source="notes" />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="Addresses">
        <SimpleShowLayout>
          <Typography variant="h6" gutterBottom>
            From Address
          </Typography>
          <TextField source="fromAddress" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            To Address
          </Typography>
          <TextField source="toAddress" />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="Additional Services">
        <SimpleShowLayout>
          <Typography variant="h6" gutterBottom>
            Cash on Delivery
          </Typography>
          <BooleanField source="codEnabled" label="COD Enabled" />
          <NumberField source="codAmount" label="COD Amount" options={{ style: 'currency', currency: 'INR' }} />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Insurance
          </Typography>
          <BooleanField source="insuranceEnabled" label="Insurance Enabled" />
          <NumberField source="insuranceAmount" label="Insurance Amount" options={{ style: 'currency', currency: 'INR' }} />
        </SimpleShowLayout>
      </Tab>
    </TabbedShowLayout>
  </Show>
);