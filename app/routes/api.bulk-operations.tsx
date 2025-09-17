import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { bulkOperationsService } from '../services/BulkOperationsService.server.js';

/**
 * Bulk Operations API Routes
 * Handles bulk invoice generation, label creation, data import/export, and batch processing
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'export_data':
        const type = url.searchParams.get('type') as string;
        const filters = JSON.parse(url.searchParams.get('filters') || '{}');
        const options = JSON.parse(url.searchParams.get('options') || '{}');
        
        const exportResult = await bulkOperationsService.bulkExportData(type, filters, options);
        
        return new Response(exportResult.csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
          },
        });

      case 'download_bulk_pdfs':
        const pdfType = url.searchParams.get('pdfType') as string;
        const itemIds = JSON.parse(url.searchParams.get('itemIds') as string);
        const pdfOptions = JSON.parse(url.searchParams.get('options') || '{}');
        
        const pdfResult = await bulkOperationsService.bulkGeneratePDFs(pdfType, itemIds, pdfOptions);
        
        return new Response(pdfResult.zipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${pdfType}_bulk_${new Date().toISOString().split('T')[0]}.zip"`,
          },
        });

      case 'stats':
        const dateFrom = new Date(url.searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const dateTo = new Date(url.searchParams.get('dateTo') || new Date());
        const stats = await bulkOperationsService.getBulkOperationStats(dateFrom, dateTo);
        return json({ success: true, data: stats });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bulk operations API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get('action') as string;

  try {
    switch (action) {
      case 'bulk_generate_invoices':
        const orderIds = JSON.parse(formData.get('orderIds') as string);
        const invoiceOptions = {
          generatePDF: formData.get('generatePDF') === 'true',
          sendNotifications: formData.get('sendNotifications') === 'true',
          sendEmail: formData.get('sendEmail') === 'true',
          sendWhatsApp: formData.get('sendWhatsApp') === 'true',
          dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : undefined,
        };
        const invoiceResult = await bulkOperationsService.bulkGenerateInvoices(orderIds, invoiceOptions);
        return json({ success: true, data: invoiceResult });

      case 'bulk_generate_labels':
        const labelOrderIds = JSON.parse(formData.get('orderIds') as string);
        const labelOptions = {
          generatePDF: formData.get('generatePDF') === 'true',
          sendNotifications: formData.get('sendNotifications') === 'true',
          sendEmail: formData.get('sendEmail') === 'true',
          sendWhatsApp: formData.get('sendWhatsApp') === 'true',
          courierService: formData.get('courierService') as string,
          serviceType: formData.get('serviceType') as string,
          weight: parseFloat(formData.get('weight') as string) || 1.0,
          shippingCost: parseFloat(formData.get('shippingCost') as string) || 0,
        };
        const labelResult = await bulkOperationsService.bulkGenerateLabels(labelOrderIds, labelOptions);
        return json({ success: true, data: labelResult });

      case 'bulk_import_customers':
        const csvFile = formData.get('csvFile') as File;
        if (!csvFile) {
          return json({ error: 'CSV file is required' }, { status: 400 });
        }
        
        const csvBuffer = Buffer.from(await csvFile.arrayBuffer());
        const importOptions = {
          allowDuplicates: formData.get('allowDuplicates') === 'true',
        };
        const importResult = await bulkOperationsService.bulkImportCustomers(csvBuffer, importOptions);
        return json({ success: true, data: importResult });

      case 'bulk_update_tracking':
        const trackingUpdates = JSON.parse(formData.get('updates') as string);
        const trackingResult = await bulkOperationsService.bulkUpdateTrackingIds(trackingUpdates);
        return json({ success: true, data: trackingResult });

      case 'bulk_update_status':
        const statusType = formData.get('type') as string;
        const itemIds = JSON.parse(formData.get('itemIds') as string);
        const newStatus = formData.get('newStatus') as string;
        const statusOptions = {
          sendNotifications: formData.get('sendNotifications') === 'true',
        };
        const statusResult = await bulkOperationsService.bulkUpdateStatus(
          statusType,
          itemIds,
          newStatus,
          statusOptions
        );
        return json({ success: true, data: statusResult });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bulk operations action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};