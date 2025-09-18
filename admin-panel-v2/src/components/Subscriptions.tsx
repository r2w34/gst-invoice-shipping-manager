import {
  List,
  Datagrid,
  TextField,
  DateField,
  ChipField,
  NumberField,
  EditButton,
  ShowButton,
  Edit,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextInput,
  SelectInput,
  DateInput,
  NumberInput,
  required,
  Filter,
  ReferenceField,
  ReferenceInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const SubscriptionFilter = (props: any) => (
  <Filter {...props}>
    <SelectInput
      source="plan"
      choices={[
        { id: 'basic', name: 'Basic' },
        { id: 'standard', name: 'Standard' },
        { id: 'premium', name: 'Premium' },
      ]}
    />
    <SelectInput
      source="status"
      choices={[
        { id: 'active', name: 'Active' },
        { id: 'trial', name: 'Trial' },
        { id: 'expired', name: 'Expired' },
        { id: 'cancelled', name: 'Cancelled' },
      ]}
    />
    <SelectInput
      source="interval"
      choices={[
        { id: 'monthly', name: 'Monthly' },
        { id: 'yearly', name: 'Yearly' },
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
      label={record.status}
      color={getColor(record.status)}
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
      label={record.plan}
      color={getColor(record.plan)}
      size="small"
      variant="outlined"
    />
  );
};

const AmountField = ({ record }: any) => (
  <span>
    {record.currency} {record.amount.toLocaleString()}
  </span>
);

export const SubscriptionList = (props: any) => (
  <List {...props} filters={<SubscriptionFilter />} perPage={25}>
    <Datagrid rowClick="show">
      <ReferenceField source="customerId" reference="customers" label="Customer">
        <TextField source="storeName" />
      </ReferenceField>
      <PlanChip source="plan" label="Plan" />
      <StatusChip source="status" label="Status" />
      <AmountField source="amount" label="Amount" />
      <TextField source="interval" label="Interval" />
      <DateField source="currentPeriodStart" label="Period Start" />
      <DateField source="currentPeriodEnd" label="Period End" />
      <DateField source="createdAt" label="Created" />
      <ShowButton />
      <EditButton />
    </Datagrid>
  </List>
);

export const SubscriptionShow = (props: any) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <ReferenceField source="customerId" reference="customers" label="Customer">
        <TextField source="storeName" />
      </ReferenceField>
      <ChipField source="plan" />
      <ChipField source="status" />
      <NumberField source="amount" />
      <TextField source="currency" />
      <TextField source="interval" />
      <DateField source="currentPeriodStart" showTime />
      <DateField source="currentPeriodEnd" showTime />
      <DateField source="trialEnd" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

export const SubscriptionEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <ReferenceInput source="customerId" reference="customers" validate={[required()]}>
        <SelectInput optionText="storeName" />
      </ReferenceInput>
      <SelectInput
        source="plan"
        choices={[
          { id: 'basic', name: 'Basic' },
          { id: 'standard', name: 'Standard' },
          { id: 'premium', name: 'Premium' },
        ]}
        validate={[required()]}
      />
      <SelectInput
        source="status"
        choices={[
          { id: 'active', name: 'Active' },
          { id: 'trial', name: 'Trial' },
          { id: 'expired', name: 'Expired' },
          { id: 'cancelled', name: 'Cancelled' },
        ]}
        validate={[required()]}
      />
      <NumberInput source="amount" validate={[required()]} />
      <TextInput source="currency" validate={[required()]} defaultValue="INR" />
      <SelectInput
        source="interval"
        choices={[
          { id: 'monthly', name: 'Monthly' },
          { id: 'yearly', name: 'Yearly' },
        ]}
        validate={[required()]}
      />
      <DateInput source="currentPeriodStart" validate={[required()]} />
      <DateInput source="currentPeriodEnd" validate={[required()]} />
      <DateInput source="trialEnd" />
    </SimpleForm>
  </Edit>
);