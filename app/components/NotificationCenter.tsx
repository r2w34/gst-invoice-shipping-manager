import React, { useState, useCallback } from 'react';
import {
  Card,
  Page,
  Layout,
  Button,
  TextField,
  Select,
  Checkbox,
  Banner,
  Modal,
  TextContainer,

  InlineStack,
  BlockStack,
  Text,
  Badge,
  DataTable,
  Tabs,
  Form,
  FormLayout,
} from '@shopify/polaris';
import { useFetcher } from '@remix-run/react';

interface NotificationCenterProps {
  customers?: any[];
  invoices?: any[];
  orders?: any[];
  labels?: any[];
}

/**
 * Notification Center Component
 * Comprehensive email and WhatsApp notification management
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  customers = [],
  invoices = [],
  orders = [],
  labels = [],
}) => {
  const fetcher = useFetcher();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Form states
  const [notificationForm, setNotificationForm] = useState({
    sendEmail: true,
    sendWhatsApp: true,
    subject: '',
    emailContent: '',
    whatsappMessage: '',
  });

  const [testForm, setTestForm] = useState({
    testEmail: '',
    testPhone: '',
  });

  const tabs = [
    { id: 'individual', content: 'Individual Notifications' },
    { id: 'bulk', content: 'Bulk Notifications' },
    { id: 'automated', content: 'Automated Workflows' },
    { id: 'settings', content: 'Settings & Testing' },
  ];

  const handleSendInvoiceNotification = useCallback((invoiceId: string) => {
    const formData = new FormData();
    formData.append('action', 'send_invoice_notification');
    formData.append('invoiceId', invoiceId);
    formData.append('sendEmail', notificationForm.sendEmail.toString());
    formData.append('sendWhatsApp', notificationForm.sendWhatsApp.toString());
    
    fetcher.submit(formData, { method: 'post', action: '/api/notifications' });
  }, [notificationForm, fetcher]);

  const handleSendShippingNotification = useCallback((labelId: string) => {
    const formData = new FormData();
    formData.append('action', 'send_shipping_notification');
    formData.append('labelId', labelId);
    formData.append('sendEmail', notificationForm.sendEmail.toString());
    formData.append('sendWhatsApp', notificationForm.sendWhatsApp.toString());
    
    fetcher.submit(formData, { method: 'post', action: '/api/notifications' });
  }, [notificationForm, fetcher]);

  const handleSendBulkPromotion = useCallback(() => {
    const formData = new FormData();
    formData.append('action', 'send_bulk_promotion');
    formData.append('customerIds', JSON.stringify(selectedItems));
    formData.append('subject', notificationForm.subject);
    formData.append('emailContent', notificationForm.emailContent);
    formData.append('whatsappMessage', notificationForm.whatsappMessage);
    formData.append('sendEmail', notificationForm.sendEmail.toString());
    formData.append('sendWhatsApp', notificationForm.sendWhatsApp.toString());
    
    fetcher.submit(formData, { method: 'post', action: '/api/notifications' });
    setShowBulkModal(false);
  }, [selectedItems, notificationForm, fetcher]);

  const handleTestServices = useCallback(() => {
    const formData = new FormData();
    formData.append('action', 'test_services');
    formData.append('testEmail', testForm.testEmail);
    formData.append('testPhone', testForm.testPhone);
    
    fetcher.submit(formData, { method: 'post', action: '/api/notifications' });
    setShowTestModal(false);
  }, [testForm, fetcher]);

  const handleProcessAutomatedWorkflows = useCallback(() => {
    const formData = new FormData();
    formData.append('action', 'process_automated_workflows');
    
    fetcher.submit(formData, { method: 'post', action: '/api/notifications' });
  }, [fetcher]);

  const renderIndividualNotifications = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Send Individual Notifications</Text>
            
            <InlineStack gap="400">
              <Checkbox
                label="Send Email"
                checked={notificationForm.sendEmail}
                onChange={(checked) => setNotificationForm(prev => ({ ...prev, sendEmail: checked }))}
              />
              <Checkbox
                label="Send WhatsApp"
                checked={notificationForm.sendWhatsApp}
                onChange={(checked) => setNotificationForm(prev => ({ ...prev, sendWhatsApp: checked }))}
              />
            </InlineStack>

            <Tabs tabs={[
              { id: 'invoices', content: 'Invoices' },
              { id: 'orders', content: 'Orders' },
              { id: 'labels', content: 'Shipping Labels' },
            ]} selected={0}>
              <Card>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['Invoice #', 'Customer', 'Amount', 'Status', 'Actions']}
                  rows={invoices.map(invoice => [
                    invoice.invoiceNumber,
                    invoice.customer?.name || 'Unknown',
                    `₹${invoice.totalAmount}`,
                    <Badge status={invoice.status === 'PAID' ? 'success' : 'attention'}>
                      {invoice.status}
                    </Badge>,
                    <Button
                      size="slim"
                      onClick={() => handleSendInvoiceNotification(invoice.id)}
                      loading={fetcher.state === 'submitting'}
                    >
                      Send Notification
                    </Button>,
                  ])}
                />
              </Card>
            </Tabs>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderBulkNotifications = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Bulk Notification Management</Text>
            
            <InlineStack gap="400">
              <Button
                primary
                onClick={() => setShowBulkModal(true)}
                disabled={selectedItems.length === 0}
              >
                Send Bulk Promotion ({selectedItems.length} customers)
              </Button>
              <Button
                onClick={handleProcessAutomatedWorkflows}
                loading={fetcher.state === 'submitting'}
              >
                Process Payment Reminders
              </Button>
            </InlineStack>

            <Card>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['Select', 'Customer', 'Email', 'Phone', 'Status']}
                rows={customers.map(customer => [
                  <Checkbox
                    checked={selectedItems.includes(customer.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedItems(prev => [...prev, customer.id]);
                      } else {
                        setSelectedItems(prev => prev.filter(id => id !== customer.id));
                      }
                    }}
                  />,
                  customer.name,
                  customer.email || 'No email',
                  customer.phone || 'No phone',
                  <Badge status={customer.status === 'ACTIVE' ? 'success' : 'critical'}>
                    {customer.status}
                  </Badge>,
                ])}
              />
            </Card>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderAutomatedWorkflows = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Automated Workflow Management</Text>
            
            <Banner status="info">
              <p>Automated workflows run in the background to send timely notifications based on business events.</p>
            </Banner>

            <InlineStack gap="400">
              <Button
                primary
                onClick={handleProcessAutomatedWorkflows}
                loading={fetcher.state === 'submitting'}
              >
                Run Payment Reminders
              </Button>
              <Button>
                Configure Automation Rules
              </Button>
            </InlineStack>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Active Workflows</Text>
                
                <div>
                  <Text variant="bodyMd" fontWeight="semibold">Payment Reminders</Text>
                  <Text variant="bodyMd" color="subdued">
                    Automatically send payment reminders for overdue invoices
                  </Text>
                  <Badge status="success">Active</Badge>
                </div>

                <div>
                  <Text variant="bodyMd" fontWeight="semibold">Order Confirmations</Text>
                  <Text variant="bodyMd" color="subdued">
                    Send confirmation messages when orders are placed
                  </Text>
                  <Badge status="success">Active</Badge>
                </div>

                <div>
                  <Text variant="bodyMd" fontWeight="semibold">Shipping Notifications</Text>
                  <Text variant="bodyMd" color="subdued">
                    Notify customers when orders are shipped
                  </Text>
                  <Badge status="success">Active</Badge>
                </div>

                <div>
                  <Text variant="bodyMd" fontWeight="semibold">Delivery Confirmations</Text>
                  <Text variant="bodyMd" color="subdued">
                    Send delivery confirmation messages
                  </Text>
                  <Badge status="success">Active</Badge>
                </div>
              </BlockStack>
            </Card>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderSettings = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Notification Settings & Testing</Text>
            
            <Button
              primary
              onClick={() => setShowTestModal(true)}
            >
              Test Email & WhatsApp Services
            </Button>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Service Status</Text>
                
                <InlineStack gap="400">
                  <div>
                    <Text variant="bodyMd" fontWeight="semibold">Email Service</Text>
                    <Badge status="success">Connected</Badge>
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="semibold">WhatsApp Service</Text>
                    <Badge status="attention">Not Configured</Badge>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Notification Statistics</Text>
                <Text variant="bodyMd" color="subdued">
                  View detailed statistics in the Analytics section
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  return (
    <Page
      title="Notification Center"
      subtitle="Manage email and WhatsApp notifications for your business"
    >
      {fetcher.data?.error && (
        <Banner status="critical" onDismiss={() => {}}>
          <p>{fetcher.data.error}</p>
        </Banner>
      )}

      {fetcher.data?.success && (
        <Banner status="success" onDismiss={() => {}}>
          <p>Notification sent successfully!</p>
        </Banner>
      )}

      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
        {selectedTab === 0 && renderIndividualNotifications()}
        {selectedTab === 1 && renderBulkNotifications()}
        {selectedTab === 2 && renderAutomatedWorkflows()}
        {selectedTab === 3 && renderSettings()}
      </Tabs>

      {/* Bulk Promotion Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Send Bulk Promotion"
        primaryAction={{
          content: 'Send to All Selected',
          onAction: handleSendBulkPromotion,
          loading: fetcher.state === 'submitting',
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowBulkModal(false),
          },
        ]}
      >
        <Modal.Section>
          <Form onSubmit={handleSendBulkPromotion}>
            <FormLayout>
              <TextField
                label="Email Subject"
                value={notificationForm.subject}
                onChange={(value) => setNotificationForm(prev => ({ ...prev, subject: value }))}
                autoComplete="off"
              />
              
              <TextField
                label="Email Content (HTML)"
                value={notificationForm.emailContent}
                onChange={(value) => setNotificationForm(prev => ({ ...prev, emailContent: value }))}
                multiline={4}
                autoComplete="off"
              />
              
              <TextField
                label="WhatsApp Message"
                value={notificationForm.whatsappMessage}
                onChange={(value) => setNotificationForm(prev => ({ ...prev, whatsappMessage: value }))}
                multiline={3}
                autoComplete="off"
              />

              <InlineStack gap="400">
                <Checkbox
                  label="Send Email"
                  checked={notificationForm.sendEmail}
                  onChange={(checked) => setNotificationForm(prev => ({ ...prev, sendEmail: checked }))}
                />
                <Checkbox
                  label="Send WhatsApp"
                  checked={notificationForm.sendWhatsApp}
                  onChange={(checked) => setNotificationForm(prev => ({ ...prev, sendWhatsApp: checked }))}
                />
              </InlineStack>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* Test Services Modal */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Test Notification Services"
        primaryAction={{
          content: 'Send Test Messages',
          onAction: handleTestServices,
          loading: fetcher.state === 'submitting',
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowTestModal(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Test Email Address"
              value={testForm.testEmail}
              onChange={(value) => setTestForm(prev => ({ ...prev, testEmail: value }))}
              type="email"
              autoComplete="email"
            />
            
            <TextField
              label="Test Phone Number (with country code)"
              value={testForm.testPhone}
              onChange={(value) => setTestForm(prev => ({ ...prev, testPhone: value }))}
              placeholder="+91 9876543210"
              autoComplete="tel"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
};