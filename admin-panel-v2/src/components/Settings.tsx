import React from 'react';
import {
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  required,
  useGetOne,
  useUpdate,
  useNotify,
} from 'react-admin';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
  Alert,
} from '@mui/material';

export const Settings: React.FC = () => {
  const notify = useNotify();
  const [update] = useUpdate();

  const { data: settings, isLoading } = useGetOne('settings', { id: '1' });

  const handleSave = async (data: any) => {
    try {
      await update('settings', { id: '1', data });
      notify('Settings updated successfully', { type: 'success' });
    } catch (error) {
      notify('Error updating settings', { type: 'error' });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="General Settings" />
            <CardContent>
              <SimpleForm
                record={settings}
                onSubmit={handleSave}
                toolbar={<div />}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextInput
                      source="companyName"
                      label="Company Name"
                      validate={[required()]}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextInput
                      source="supportEmail"
                      label="Support Email"
                      type="email"
                      validate={[required()]}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <NumberInput
                      source="maxTrialDays"
                      label="Trial Period (Days)"
                      validate={[required()]}
                      min={1}
                      max={30}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextInput
                      source="defaultPlan"
                      label="Default Plan"
                      validate={[required()]}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </SimpleForm>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="System Controls" />
            <CardContent>
              <SimpleForm
                record={settings}
                onSubmit={handleSave}
                toolbar={<div />}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <BooleanInput
                      source="maintenanceMode"
                      label="Maintenance Mode"
                      helperText="Enable to put the system in maintenance mode"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BooleanInput
                      source="allowNewSignups"
                      label="Allow New Signups"
                      helperText="Allow new customers to sign up"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <BooleanInput
                      source="emailNotifications"
                      label="Email Notifications"
                      helperText="Send email notifications to customers"
                    />
                  </Grid>
                </Grid>
              </SimpleForm>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title="Integration Settings" />
            <CardContent>
              <SimpleForm
                record={settings}
                onSubmit={handleSave}
                toolbar={<div />}
              >
                <TextInput
                  source="webhookUrl"
                  label="Webhook URL"
                  fullWidth
                  helperText="URL for webhook notifications"
                />
              </SimpleForm>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Note:</strong> Changes to system settings will take effect immediately.
              Please ensure you understand the impact before making changes.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};