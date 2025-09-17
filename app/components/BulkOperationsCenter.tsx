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
  DropZone,
  Thumbnail,
  ProgressBar,
} from '@shopify/polaris';
import { useFetcher } from '@remix-run/react';

interface BulkOperationsCenterProps {
  orders?: any[];
  invoices?: any[];
  labels?: any[];
  customers?: any[];
}

/**
 * Bulk Operations Center Component
 * Comprehensive bulk processing for invoices, labels, and data management
 */
export const BulkOperationsCenter: React.FC<BulkOperationsCenterProps> = ({
  orders = [],
  invoices = [],
  labels = [],
  customers = [],
}) => {
  const fetcher = useFetcher();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showBulkInvoiceModal, setShowBulkInvoiceModal] = useState(false);
  const [showBulkLabelModal, setShowBulkLabelModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Form states
  const [bulkInvoiceForm, setBulkInvoiceForm] = useState({
    generatePDF: true,
    sendNotifications: true,
    sendEmail: true,
    sendWhatsApp: false,
    dueDate: '',
  });

  const [bulkLabelForm, setBulkLabelForm] = useState({
    generatePDF: true,
    sendNotifications: true,
    sendEmail: true,
    sendWhatsApp: false,
    courierService: 'INDIA_POST',
    serviceType: 'STANDARD',
    weight: '1.0',
    shippingCost: '0',
  });

  const tabs = [
    { id: 'invoices', content: 'Bulk Invoices' },
    { id: 'labels', content: 'Bulk Labels' },
    { id: 'import-export', content: 'Import/Export' },
    { id: 'status-updates', content: 'Status Updates' },
  ];

  const courierOptions = [
    { label: 'India Post', value: 'INDIA_POST' },
    { label: 'Blue Dart', value: 'BLUEDART' },
    { label: 'Delhivery', value: 'DELHIVERY' },
    { label: 'DTDC', value: 'DTDC' },
    { label: 'FedEx', value: 'FEDEX' },
    { label: 'DHL', value: 'DHL' },
  ];

  const serviceTypeOptions = [
    { label: 'Standard', value: 'STANDARD' },
    { label: 'Express', value: 'EXPRESS' },
    { label: 'Overnight', value: 'OVERNIGHT' },
  ];

  const handleBulkGenerateInvoices = useCallback(() => {
    const formData = new FormData();
    formData.append('action', 'bulk_generate_invoices');
    formData.append('orderIds', JSON.stringify(selectedOrders));
    formData.append('generatePDF', bulkInvoiceForm.generatePDF.toString());
    formData.append('sendNotifications', bulkInvoiceForm.sendNotifications.toString());
    formData.append('sendEmail', bulkInvoiceForm.sendEmail.toString());
    formData.append('sendWhatsApp', bulkInvoiceForm.sendWhatsApp.toString());
    if (bulkInvoiceForm.dueDate) {
      formData.append('dueDate', bulkInvoiceForm.dueDate);
    }
    
    fetcher.submit(formData, { method: 'post', action: '/api/bulk-operations' });
    setShowBulkInvoiceModal(false);
  }, [selectedOrders, bulkInvoiceForm, fetcher]);

  const handleBulkGenerateLabels = useCallback(() => {
    const formData = new FormData();
    formData.append('action', 'bulk_generate_labels');
    formData.append('orderIds', JSON.stringify(selectedOrders));
    formData.append('generatePDF', bulkLabelForm.generatePDF.toString());
    formData.append('sendNotifications', bulkLabelForm.sendNotifications.toString());
    formData.append('sendEmail', bulkLabelForm.sendEmail.toString());
    formData.append('sendWhatsApp', bulkLabelForm.sendWhatsApp.toString());
    formData.append('courierService', bulkLabelForm.courierService);
    formData.append('serviceType', bulkLabelForm.serviceType);
    formData.append('weight', bulkLabelForm.weight);
    formData.append('shippingCost', bulkLabelForm.shippingCost);
    
    fetcher.submit(formData, { method: 'post', action: '/api/bulk-operations' });
    setShowBulkLabelModal(false);
  }, [selectedOrders, bulkLabelForm, fetcher]);

  const handleBulkImportCustomers = useCallback(() => {
    if (!uploadedFile) return;
    
    const formData = new FormData();
    formData.append('action', 'bulk_import_customers');
    formData.append('csvFile', uploadedFile);
    formData.append('allowDuplicates', 'false');
    
    fetcher.submit(formData, { method: 'post', action: '/api/bulk-operations' });
    setShowImportModal(false);
    setUploadedFile(null);
  }, [uploadedFile, fetcher]);

  const handleExportData = useCallback((type: string) => {
    const url = new URL('/api/bulk-operations', window.location.origin);
    url.searchParams.set('action', 'export_data');
    url.searchParams.set('type', type);
    url.searchParams.set('filters', JSON.stringify({}));
    url.searchParams.set('options', JSON.stringify({}));
    
    window.open(url.toString(), '_blank');
  }, []);

  const handleDownloadBulkPDFs = useCallback((type: string, itemIds: string[]) => {
    const url = new URL('/api/bulk-operations', window.location.origin);
    url.searchParams.set('action', 'download_bulk_pdfs');
    url.searchParams.set('pdfType', type);
    url.searchParams.set('itemIds', JSON.stringify(itemIds));
    url.searchParams.set('options', JSON.stringify({}));
    
    window.open(url.toString(), '_blank');
  }, []);

  const handleFileUpload = useCallback((files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  }, []);

  const renderBulkInvoices = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Bulk Invoice Generation</Text>
            
            <InlineStack gap="400">
              <Button
                primary
                onClick={() => setShowBulkInvoiceModal(true)}
                disabled={selectedOrders.length === 0}
              >
                Generate Invoices ({selectedOrders.length} orders)
              </Button>
              <Button
                onClick={() => handleDownloadBulkPDFs('invoices', selectedInvoices)}
                disabled={selectedInvoices.length === 0}
              >
                Download PDFs ({selectedInvoices.length} invoices)
              </Button>
            </InlineStack>

            <Card>
              <Text variant="headingMd">Select Orders for Invoice Generation</Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['Select', 'Order ID', 'Customer', 'Date', 'Amount', 'Status']}
                rows={orders.filter(order => !order.invoiceGenerated).map(order => [
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedOrders(prev => [...prev, order.id]);
                      } else {
                        setSelectedOrders(prev => prev.filter(id => id !== order.id));
                      }
                    }}
                  />,
                  order.shopifyOrderId,
                  order.customer?.name || 'Unknown',
                  new Date(order.orderDate).toLocaleDateString(),
                  `₹${order.totalAmount}`,
                  <Badge status={order.status === 'DELIVERED' ? 'success' : 'attention'}>
                    {order.status}
                  </Badge>,
                ])}
              />
            </Card>

            <Card>
              <Text variant="headingMd">Generated Invoices</Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['Select', 'Invoice #', 'Customer', 'Date', 'Amount', 'Status']}
                rows={invoices.map(invoice => [
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedInvoices(prev => [...prev, invoice.id]);
                      } else {
                        setSelectedInvoices(prev => prev.filter(id => id !== invoice.id));
                      }
                    }}
                  />,
                  invoice.invoiceNumber,
                  invoice.customer?.name || 'Unknown',
                  new Date(invoice.invoiceDate).toLocaleDateString(),
                  `₹${invoice.totalAmount}`,
                  <Badge status={invoice.status === 'PAID' ? 'success' : 'attention'}>
                    {invoice.status}
                  </Badge>,
                ])}
              />
            </Card>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderBulkLabels = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Bulk Shipping Label Generation</Text>
            
            <InlineStack gap="400">
              <Button
                primary
                onClick={() => setShowBulkLabelModal(true)}
                disabled={selectedOrders.length === 0}
              >
                Generate Labels ({selectedOrders.length} orders)
              </Button>
              <Button
                onClick={() => handleDownloadBulkPDFs('labels', selectedLabels)}
                disabled={selectedLabels.length === 0}
              >
                Download PDFs ({selectedLabels.length} labels)
              </Button>
            </InlineStack>

            <Card>
              <Text variant="headingMd">Select Orders for Label Generation</Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['Select', 'Order ID', 'Customer', 'Date', 'Amount', 'Status']}
                rows={orders.filter(order => !order.labelGenerated).map(order => [
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedOrders(prev => [...prev, order.id]);
                      } else {
                        setSelectedOrders(prev => prev.filter(id => id !== order.id));
                      }
                    }}
                  />,
                  order.shopifyOrderId,
                  order.customer?.name || 'Unknown',
                  new Date(order.orderDate).toLocaleDateString(),
                  `₹${order.totalAmount}`,
                  <Badge status={order.status === 'DELIVERED' ? 'success' : 'attention'}>
                    {order.status}
                  </Badge>,
                ])}
              />
            </Card>

            <Card>
              <Text variant="headingMd">Generated Labels</Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['Select', 'Tracking ID', 'Customer', 'Courier', 'Service', 'Status']}
                rows={labels.map(label => [
                  <Checkbox
                    checked={selectedLabels.includes(label.id)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedLabels(prev => [...prev, label.id]);
                      } else {
                        setSelectedLabels(prev => prev.filter(id => id !== label.id));
                      }
                    }}
                  />,
                  label.trackingId,
                  label.customer?.name || 'Unknown',
                  label.courierService,
                  label.serviceType,
                  <Badge status={label.status === 'DELIVERED' ? 'success' : 'attention'}>
                    {label.status}
                  </Badge>,
                ])}
              />
            </Card>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderImportExport = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Data Import & Export</Text>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Import Data</Text>
                <Button
                  primary
                  onClick={() => setShowImportModal(true)}
                >
                  Import Customers from CSV
                </Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Export Data</Text>
                <InlineStack gap="400">
                  <Button onClick={() => handleExportData('customers')}>
                    Export Customers
                  </Button>
                  <Button onClick={() => handleExportData('invoices')}>
                    Export Invoices
                  </Button>
                  <Button onClick={() => handleExportData('orders')}>
                    Export Orders
                  </Button>
                  <Button onClick={() => handleExportData('labels')}>
                    Export Labels
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {fetcher.data?.success && (
              <Banner status="success">
                <p>Operation completed successfully!</p>
                {fetcher.data.data.successCount && (
                  <p>Success: {fetcher.data.data.successCount} items processed</p>
                )}
                {fetcher.data.data.failureCount > 0 && (
                  <p>Failures: {fetcher.data.data.failureCount} items failed</p>
                )}
              </Banner>
            )}
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  const renderStatusUpdates = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg">Bulk Status Updates</Text>
            
            <Banner status="info">
              <p>Update the status of multiple items at once. Select items and choose a new status.</p>
            </Banner>

            <InlineStack gap="400">
              <Button>Update Invoice Status</Button>
              <Button>Update Order Status</Button>
              <Button>Update Label Status</Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </Layout.Section>
    </Layout>
  );

  return (
    <Page
      title="Bulk Operations Center"
      subtitle="Manage bulk processing for invoices, labels, and data operations"
    >
      {fetcher.data?.error && (
        <Banner status="critical" onDismiss={() => {}}>
          <p>{fetcher.data.error}</p>
        </Banner>
      )}

      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
        {selectedTab === 0 && renderBulkInvoices()}
        {selectedTab === 1 && renderBulkLabels()}
        {selectedTab === 2 && renderImportExport()}
        {selectedTab === 3 && renderStatusUpdates()}
      </Tabs>

      {/* Bulk Invoice Modal */}
      <Modal
        open={showBulkInvoiceModal}
        onClose={() => setShowBulkInvoiceModal(false)}
        title="Bulk Invoice Generation"
        primaryAction={{
          content: 'Generate Invoices',
          onAction: handleBulkGenerateInvoices,
          loading: fetcher.state === 'submitting',
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowBulkInvoiceModal(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Due Date (optional)"
              type="date"
              value={bulkInvoiceForm.dueDate}
              onChange={(value) => setBulkInvoiceForm(prev => ({ ...prev, dueDate: value }))}
            />

            <InlineStack gap="400">
              <Checkbox
                label="Generate PDF"
                checked={bulkInvoiceForm.generatePDF}
                onChange={(checked) => setBulkInvoiceForm(prev => ({ ...prev, generatePDF: checked }))}
              />
              <Checkbox
                label="Send Notifications"
                checked={bulkInvoiceForm.sendNotifications}
                onChange={(checked) => setBulkInvoiceForm(prev => ({ ...prev, sendNotifications: checked }))}
              />
            </InlineStack>

            {bulkInvoiceForm.sendNotifications && (
              <InlineStack gap="400">
                <Checkbox
                  label="Send Email"
                  checked={bulkInvoiceForm.sendEmail}
                  onChange={(checked) => setBulkInvoiceForm(prev => ({ ...prev, sendEmail: checked }))}
                />
                <Checkbox
                  label="Send WhatsApp"
                  checked={bulkInvoiceForm.sendWhatsApp}
                  onChange={(checked) => setBulkInvoiceForm(prev => ({ ...prev, sendWhatsApp: checked }))}
                />
              </InlineStack>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Bulk Label Modal */}
      <Modal
        open={showBulkLabelModal}
        onClose={() => setShowBulkLabelModal(false)}
        title="Bulk Label Generation"
        primaryAction={{
          content: 'Generate Labels',
          onAction: handleBulkGenerateLabels,
          loading: fetcher.state === 'submitting',
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowBulkLabelModal(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Select
              label="Courier Service"
              options={courierOptions}
              value={bulkLabelForm.courierService}
              onChange={(value) => setBulkLabelForm(prev => ({ ...prev, courierService: value }))}
            />

            <Select
              label="Service Type"
              options={serviceTypeOptions}
              value={bulkLabelForm.serviceType}
              onChange={(value) => setBulkLabelForm(prev => ({ ...prev, serviceType: value }))}
            />

            <InlineStack gap="400">
              <TextField
                label="Weight (kg)"
                type="number"
                value={bulkLabelForm.weight}
                onChange={(value) => setBulkLabelForm(prev => ({ ...prev, weight: value }))}
              />
              <TextField
                label="Shipping Cost"
                type="number"
                value={bulkLabelForm.shippingCost}
                onChange={(value) => setBulkLabelForm(prev => ({ ...prev, shippingCost: value }))}
              />
            </InlineStack>

            <InlineStack gap="400">
              <Checkbox
                label="Generate PDF"
                checked={bulkLabelForm.generatePDF}
                onChange={(checked) => setBulkLabelForm(prev => ({ ...prev, generatePDF: checked }))}
              />
              <Checkbox
                label="Send Notifications"
                checked={bulkLabelForm.sendNotifications}
                onChange={(checked) => setBulkLabelForm(prev => ({ ...prev, sendNotifications: checked }))}
              />
            </InlineStack>

            {bulkLabelForm.sendNotifications && (
              <InlineStack gap="400">
                <Checkbox
                  label="Send Email"
                  checked={bulkLabelForm.sendEmail}
                  onChange={(checked) => setBulkLabelForm(prev => ({ ...prev, sendEmail: checked }))}
                />
                <Checkbox
                  label="Send WhatsApp"
                  checked={bulkLabelForm.sendWhatsApp}
                  onChange={(checked) => setBulkLabelForm(prev => ({ ...prev, sendWhatsApp: checked }))}
                />
              </InlineStack>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Customers from CSV"
        primaryAction={{
          content: 'Import Data',
          onAction: handleBulkImportCustomers,
          loading: fetcher.state === 'submitting',
          disabled: !uploadedFile,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowImportModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd">
              Upload a CSV file with customer data. Required columns: name, email
            </Text>
            
            <DropZone onDrop={handleFileUpload} accept=".csv">
              {uploadedFile ? (
                <InlineStack gap="400">
                  <Thumbnail
                    source="https://cdn.shopify.com/s/files/1/0757/9955/files/New_Post.png?12678548500147524304"
                    alt="CSV file"
                    size="small"
                  />
                  <div>
                    <Text variant="bodyMd" fontWeight="semibold">
                      {uploadedFile.name}
                    </Text>
                    <Text variant="bodyMd" color="subdued">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </Text>
                  </div>
                </InlineStack>
              ) : (
                <DropZone.FileUpload />
              )}
            </DropZone>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
};