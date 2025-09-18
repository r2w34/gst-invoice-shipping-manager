import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  ChipField,
  NumberField,
  EditButton,
  ShowButton,
  Create,
  Edit,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextInput,
  SelectInput,
  NumberInput,
  required,
  Filter,
  SearchInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const CustomerFilter = (props: any) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    <SelectInput
      source="subscriptionPlan"
      choices={[
        { id: 'basic', name: 'Basic' },
        { id: 'standard', name: 'Standard' },
        { id: 'premium', name: 'Premium' },
      ]}
    />
    <SelectInput
      source="subscriptionStatus"
      choices={[
        { id: 'active', name: 'Active' },
        { id: 'trial', name: 'Trial' },
        { id: 'expired', name: 'Expired' },
        { id: 'cancelled', name: 'Cancelled' },
      ]}
    />
  </Filter>
);

const StatusChip = ({ record }: any) => {
  const getColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'info';
      case 'expired': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Chip
      label={record.subscriptionStatus}
      color={getColor(record.subscriptionStatus)}
      size="small"
    />
  );
};

const PlanChip = ({ record }: any) => {
  const getColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'default';
      case 'standard': return 'primary';
      case 'premium': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Chip
      label={record.subscriptionPlan}
      color={getColor(record.subscriptionPlan)}
      size="small"
      variant="outlined"
    />
  );
};

export const CustomerList = (props: any) => (
  <List {...props} filters={<CustomerFilter />} perPage={25}>
    <Datagrid rowClick="show">
      <TextField source="storeName" label="Store Name" />
      <TextField source="shopDomain" label="Shop Domain" />
      <EmailField source="ownerEmail" label="Owner Email" />
      <PlanChip source="subscriptionPlan" label="Plan" />
      <StatusChip source="subscriptionStatus" label="Status" />
      <NumberField source="invoicesGenerated" label="Invoices" />
      <NumberField source="labelsGenerated" label="Labels" />
      <DateField source="lastLoginAt" label="Last Login" showTime />
      <DateField source="createdAt" label="Created" />
      <ShowButton />
      <EditButton />
    </Datagrid>
  </List>
);

export const CustomerShow = (props: any) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="storeName" />
      <TextField source="shopDomain" />
      <EmailField source="ownerEmail" />
      <ChipField source="subscriptionPlan" />
      <ChipField source="subscriptionStatus" />
      <ChipField source="paymentStatus" />
      <NumberField source="invoicesGenerated" />
      <NumberField source="labelsGenerated" />
      <DateField source="lastLoginAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

export const CustomerEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="storeName" validate={[required()]} />
      <TextInput source="shopDomain" validate={[required()]} />
      <TextInput source="ownerEmail" type="email" validate={[required()]} />
      <SelectInput
        source="subscriptionPlan"
        choices={[
          { id: 'basic', name: 'Basic' },
          { id: 'standard', name: 'Standard' },
          { id: 'premium', name: 'Premium' },
        ]}
        validate={[required()]}
      />
      <SelectInput
        source="subscriptionStatus"
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'trial', name: 'Trial' },
          { id: 'expired', name: 'Expired' },
          { id: 'cancelled', name: 'Cancelled' },
        ]}
        validate={[required()]}
      />
      <SelectInput
        source="paymentStatus"
        choices={[
          { id: 'paid', name: 'Paid' },
          { id: 'pending', name: 'Pending' },
          { id: 'failed', name: 'Failed' },
        ]}
        validate={[required()]}
      />
      <NumberInput source="invoicesGenerated" />
      <NumberInput source="labelsGenerated" />
    </SimpleForm>
  </Edit>
);

export const CustomerCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="storeName" validate={[required()]} />
      <TextInput source="shopDomain" validate={[required()]} />
      <TextInput source="ownerEmail" type="email" validate={[required()]} />
      <SelectInput
        source="subscriptionPlan"
        choices={[
          { id: 'basic', name: 'Basic' },
          { id: 'standard', name: 'Standard' },
          { id: 'premium', name: 'Premium' },
        ]}
        validate={[required()]}
        defaultValue="basic"
      />
      <SelectInput
        source="subscriptionStatus"
        choices={[
          { id: 'trial', name: 'Trial' },
          { id: 'active', name: 'Active' },
        ]}
        validate={[required()]}
        defaultValue="trial"
      />
    </SimpleForm>
  </Create>
);