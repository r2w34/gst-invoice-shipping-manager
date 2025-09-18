import React, { useState, useCallback } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useActionData, useSubmit, useNavigation } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Button,
  InlineStack,
  BlockStack,
  Text,
  Banner,
  Modal,
  TextField,
  Select,
  ButtonGroup,
  Toast,
  Frame,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import InvoiceDesigner from '../components/InvoiceDesigner';
import { EnhancedPDFEditor } from '../services/EnhancedPDFEditor.server';

// Mock template storage (in production, use database)
const templates = new Map();

// Demo templates
const demoTemplates = [
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    description: 'Clean and professional blue-themed template',
    preview: '/images/templates/modern-blue-preview.png',
    config: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#0ea5e9',
        text: '#1e293b',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
        size: {
          heading: '24px',
          subheading: '18px',
          body: '14px',
          small: '12px'
        }
      },
      layout: {
        header: 'centered',
        logo: 'left',
        spacing: 'normal',
        borders: true
      },
      sections: {
        companyInfo: true,
        customerInfo: true,
        itemsTable: true,
        taxSummary: true,
        footer: true,
        notes: true
      }
    }
  },
  {
    id: 'classic-green',
    name: 'Classic Green',
    description: 'Traditional green-themed invoice template',
    preview: '/images/templates/classic-green-preview.png',
    config: {
      colors: {
        primary: '#16a34a',
        secondary: '#6b7280',
        accent: '#22c55e',
        text: '#111827',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Georgia',
        body: 'Arial',
        size: {
          heading: '22px',
          subheading: '16px',
          body: '13px',
          small: '11px'
        }
      },
      layout: {
        header: 'left',
        logo: 'left',
        spacing: 'compact',
        borders: true
      },
      sections: {
        companyInfo: true,
        customerInfo: true,
        itemsTable: true,
        taxSummary: true,
        footer: true,
        notes: true
      }
    }
  },
  {
    id: 'minimal-gray',
    name: 'Minimal Gray',
    description: 'Simple and elegant gray-themed template',
    preview: '/images/templates/minimal-gray-preview.png',
    config: {
      colors: {
        primary: '#374151',
        secondary: '#9ca3af',
        accent: '#6b7280',
        text: '#1f2937',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Helvetica',
        body: 'Helvetica',
        size: {
          heading: '20px',
          subheading: '16px',
          body: '12px',
          small: '10px'
        }
      },
      layout: {
        header: 'minimal',
        logo: 'center',
        spacing: 'wide',
        borders: false
      },
      sections: {
        companyInfo: true,
        customerInfo: true,
        itemsTable: true,
        taxSummary: true,
        footer: false,
        notes: true
      }
    }
  },
  {
    id: 'corporate-red',
    name: 'Corporate Red',
    description: 'Bold corporate red-themed template',
    preview: '/images/templates/corporate-red-preview.png',
    config: {
      colors: {
        primary: '#dc2626',
        secondary: '#64748b',
        accent: '#ef4444',
        text: '#0f172a',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Arial Black',
        body: 'Arial',
        size: {
          heading: '26px',
          subheading: '18px',
          body: '14px',
          small: '12px'
        }
      },
      layout: {
        header: 'bold',
        logo: 'right',
        spacing: 'normal',
        borders: true
      },
      sections: {
        companyInfo: true,
        customerInfo: true,
        itemsTable: true,
        taxSummary: true,
        footer: true,
        notes: true
      }
    }
  },
  {
    id: 'elegant-purple',
    name: 'Elegant Purple',
    description: 'Sophisticated purple-themed template',
    preview: '/images/templates/elegant-purple-preview.png',
    config: {
      colors: {
        primary: '#7c3aed',
        secondary: '#64748b',
        accent: '#8b5cf6',
        text: '#1e293b',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Times New Roman',
        body: 'Times New Roman',
        size: {
          heading: '24px',
          subheading: '18px',
          body: '14px',
          small: '12px'
        }
      },
      layout: {
        header: 'elegant',
        logo: 'center',
        spacing: 'normal',
        borders: true
      },
      sections: {
        companyInfo: true,
        customerInfo: true,
        itemsTable: true,
        taxSummary: true,
        footer: true,
        notes: true
      }
    }
  }
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const templateId = url.searchParams.get('template');

  let template = null;
  if (templateId && templates.has(templateId)) {
    template = templates.get(templateId);
  }

  // Get saved templates for this shop
  const savedTemplates = Array.from(templates.values()).filter(
    (t: any) => t.shopId === session.shop
  );

  return json({
    template,
    savedTemplates,
    demoTemplates,
    shopId: session.shop,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('action');

  try {
    switch (action) {
      case 'save_template': {
        const templateData = JSON.parse(formData.get('template') as string);
        templateData.shopId = session.shop;
        templateData.updatedAt = new Date().toISOString();
        
        templates.set(templateData.id, templateData);
        
        return json({ 
          success: true, 
          message: 'Template saved successfully',
          template: templateData 
        });
      }

      case 'delete_template': {
        const templateId = formData.get('templateId') as string;
        templates.delete(templateId);
        
        return json({ 
          success: true, 
          message: 'Template deleted successfully' 
        });
      }

      case 'generate_preview': {
        const templateData = JSON.parse(formData.get('template') as string);
        const sampleData = {
          invoiceNumber: 'INV-2024-PREVIEW',
          date: new Date().toISOString(),
          company: {
            name: 'Your Company Name',
            address: 'Your Company Address\nCity, State, PIN',
            gstin: 'YOUR_GSTIN_NUMBER',
          },
          customer: {
            name: 'Sample Customer',
            address: 'Customer Address\nCity, State, PIN',
            gstin: '27AAAAA0000A1Z5',
            state: 'Maharashtra',
          },
          items: [
            {
              description: 'Sample Product 1',
              hsnCode: '1234',
              quantity: 2,
              rate: 1000,
              taxRate: 18,
            },
            {
              description: 'Sample Product 2',
              hsnCode: '5678',
              quantity: 1,
              rate: 2000,
              taxRate: 18,
            },
          ],
        };

        const pdfEditor = new EnhancedPDFEditor();
        const pdfBytes = await pdfEditor.generateGSTInvoice(sampleData, {
          template: templateData,
          enableDigitalSignature: true,
          enableQRCode: true,
        });

        return new Response(pdfBytes, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="invoice-preview.pdf"',
          },
        });
      }

      default:
        return json({ success: false, message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Invoice designer action error:', error);
    return json({ 
      success: false, 
      message: 'An error occurred: ' + error.message 
    }, { status: 500 });
  }
};

export default function InvoiceDesignerPage() {
  const { template, savedTemplates, shopId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [currentTemplate, setCurrentTemplate] = useState(template);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isLoading = navigation.state === 'submitting';

  const handleSaveTemplate = useCallback((templateData: any) => {
    const formData = new FormData();
    formData.append('action', 'save_template');
    formData.append('template', JSON.stringify({
      ...templateData,
      id: templateData.id || `template-${Date.now()}`,
      createdAt: templateData.createdAt || new Date().toISOString(),
    }));

    submit(formData, { method: 'post' });
  }, [submit]);

  const handlePreviewTemplate = useCallback((templateData: any) => {
    const formData = new FormData();
    formData.append('action', 'generate_preview');
    formData.append('template', JSON.stringify(templateData));

    // Open preview in new tab
    const form = document.createElement('form');
    form.method = 'POST';
    form.target = '_blank';
    form.action = '/app/invoice-designer';
    
    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = 'generate_preview';
    form.appendChild(actionInput);
    
    const templateInput = document.createElement('input');
    templateInput.type = 'hidden';
    templateInput.name = 'template';
    templateInput.value = JSON.stringify(templateData);
    form.appendChild(templateInput);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    const formData = new FormData();
    formData.append('action', 'delete_template');
    formData.append('templateId', templateId);

    submit(formData, { method: 'post' });
    setShowDeleteModal(false);
    setTemplateToDelete(null);
  }, [submit]);

  const handleLoadTemplate = useCallback((templateId: string) => {
    const template = savedTemplates.find((t: any) => t.id === templateId);
    if (template) {
      setCurrentTemplate(template);
    }
  }, [savedTemplates]);

  const handleNewTemplate = useCallback(() => {
    setCurrentTemplate(null);
    setNewTemplateName('');
    setShowTemplateModal(true);
  }, []);

  const handleCreateNewTemplate = useCallback(() => {
    const newTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName || 'New Template',
      elements: [],
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 50, right: 50, bottom: 50, left: 50 },
      backgroundColor: '#ffffff',
      shopId,
      createdAt: new Date().toISOString(),
    };

    setCurrentTemplate(newTemplate);
    setShowTemplateModal(false);
  }, [newTemplateName, shopId]);

  // Show toast on successful actions
  React.useEffect(() => {
    if (actionData?.success) {
      setToastMessage(actionData.message);
      setShowToast(true);
    }
  }, [actionData]);

  const toastMarkup = showToast ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setShowToast(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page
        title="Invoice Designer"
        subtitle="Design and customize your invoice templates"
        primaryAction={{
          content: 'New Template',
          onAction: handleNewTemplate,
        }}
        secondaryActions={[
          {
            content: 'Load Template',
            onAction: () => setShowTemplateModal(true),
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            {actionData?.success === false && (
              <Banner status="critical">
                <p>{actionData.message}</p>
              </Banner>
            )}

            {savedTemplates.length > 0 && (
              <Card>
                <div style={{ padding: '1rem' }}>
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">Saved Templates</Text>
                    <Button onClick={() => setShowTemplateModal(true)}>
                      Load Template
                    </Button>
                  </InlineStack>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <BlockStack gap="200">
                      {savedTemplates.slice(0, 3).map((template: any) => (
                        <Card key={template.id}>
                          <div style={{ padding: '1rem' }}>
                            <InlineStack align="space-between">
                              <BlockStack gap="100">
                                <Text variant="bodyMd" as="p" fontWeight="semibold">
                                  {template.name}
                                </Text>
                                <Text variant="bodySm" as="p" tone="subdued">
                                  Updated: {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}
                                </Text>
                              </BlockStack>
                              <ButtonGroup>
                                <Button onClick={() => handleLoadTemplate(template.id)}>
                                  Load
                                </Button>
                                <Button
                                  destructive
                                  onClick={() => {
                                    setTemplateToDelete(template.id);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  Delete
                                </Button>
                              </ButtonGroup>
                            </InlineStack>
                          </div>
                        </Card>
                      ))}
                    </BlockStack>
                  </div>
                </div>
              </Card>
            )}

            {currentTemplate ? (
              <InvoiceDesigner
                template={currentTemplate}
                onSave={handleSaveTemplate}
                onPreview={handlePreviewTemplate}
              />
            ) : (
              <Card>
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <BlockStack align="center" gap="400">
                    <div style={{ fontSize: '4rem' }}>📄</div>
                    <Text variant="headingLg" as="h2">
                      Create Your First Invoice Template
                    </Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Design custom invoice templates with drag-and-drop elements,
                      customize colors, fonts, and layout to match your brand.
                    </Text>
                    <Button variant="primary" size="large" onClick={handleNewTemplate}>
                      Create New Template
                    </Button>
                  </BlockStack>
                </div>
              </Card>
            )}
          </Layout.Section>
        </Layout>

        {/* Template Selection Modal */}
        <Modal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          title={currentTemplate ? "Load Template" : "Create New Template"}
          primaryAction={{
            content: currentTemplate ? "Load" : "Create",
            onAction: currentTemplate ? () => setShowTemplateModal(false) : handleCreateNewTemplate,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowTemplateModal(false),
            },
          ]}
        >
          <Modal.Section>
            {!currentTemplate ? (
              <TextField
                label="Template Name"
                value={newTemplateName}
                onChange={setNewTemplateName}
                placeholder="Enter template name"
                autoComplete="off"
              />
            ) : (
              <div>
                <Text variant="headingMd" as="h3">Select a template to load:</Text>
                <div style={{ marginTop: '1rem' }}>
                  {savedTemplates.map((template: any) => (
                    <Card key={template.id}>
                      <div style={{ padding: '1rem' }}>
                        <InlineStack align="space-between">
                          <BlockStack gap="100">
                            <Text variant="bodyMd" as="p" fontWeight="semibold">
                              {template.name}
                            </Text>
                            <Text variant="bodySm" as="p" tone="subdued">
                              {template.elements.length} elements • {template.pageSize} • {template.orientation}
                            </Text>
                          </BlockStack>
                          <Button
                            onClick={() => {
                              handleLoadTemplate(template.id);
                              setShowTemplateModal(false);
                            }}
                          >
                            Load
                          </Button>
                        </InlineStack>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Modal.Section>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Template"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: () => templateToDelete && handleDeleteTemplate(templateToDelete),
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowDeleteModal(false),
            },
          ]}
        >
          <Modal.Section>
            <Text variant="bodyMd" as="p">
              Are you sure you want to delete this template? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        {toastMarkup}
      </Page>
    </Frame>
  );
}