import db from '../db.server';
import { notificationService } from './NotificationService.server.js';
import { PDFGenerator } from './PDFGenerator.server.js';
import JSZip from 'jszip';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

/**
 * Advanced Bulk Operations Service
 * Handles bulk invoice generation, label creation, data import/export, and batch processing
 */
export class BulkOperationsService {
  constructor() {
    this.notificationService = notificationService;
    this.pdfGenerator = new PDFGenerator();
  }

  /**
   * Bulk invoice generation from orders
   */
  async bulkGenerateInvoices(orderIds, options = {}) {
    try {
      const results = {
        totalOrders: orderIds.length,
        successCount: 0,
        failureCount: 0,
        invoices: [],
        errors: [],
      };

      const orders = await db.order.findMany({
        where: {
          id: { in: orderIds },
          invoiceGenerated: false,
        },
        include: {
          customer: true,
          items: true,
        },
      });

      for (const order of orders) {
        try {
          // Generate invoice from order
          const invoice = await this.generateInvoiceFromOrder(order, options);
          
          // Generate PDF if requested
          let pdfBuffer = null;
          if (options.generatePDF) {
            pdfBuffer = await this.pdfGenerator.generateInvoicePDF(invoice);
          }

          // Send notifications if requested
          if (options.sendNotifications) {
            await this.notificationService.sendInvoiceNotification(invoice.id, {
              email: options.sendEmail,
              whatsapp: options.sendWhatsApp,
              pdfBuffer,
            });
          }

          // Mark order as invoice generated
          await db.order.update({
            where: { id: order.id },
            data: { invoiceGenerated: true },
          });

          results.invoices.push({
            orderId: order.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            customer: order.customer.name,
          });

          results.successCount++;
        } catch (error) {
          results.errors.push({
            orderId: order.id,
            orderNumber: order.shopifyOrderId,
            error: error.message,
          });
          results.failureCount++;
        }
      }

      // Log bulk operation
      await this.logBulkOperation({
        type: 'BULK_INVOICE_GENERATION',
        totalItems: results.totalOrders,
        successCount: results.successCount,
        failureCount: results.failureCount,
        options,
      });

      return results;
    } catch (error) {
      console.error('Bulk invoice generation failed:', error);
      throw error;
    }
  }

  /**
   * Bulk shipping label generation
   */
  async bulkGenerateLabels(orderIds, labelOptions = {}) {
    try {
      const results = {
        totalOrders: orderIds.length,
        successCount: 0,
        failureCount: 0,
        labels: [],
        errors: [],
      };

      const orders = await db.order.findMany({
        where: {
          id: { in: orderIds },
          labelGenerated: false,
        },
        include: {
          customer: true,
        },
      });

      for (const order of orders) {
        try {
          // Generate shipping label
          const label = await this.generateLabelFromOrder(order, labelOptions);
          
          // Generate PDF if requested
          let pdfBuffer = null;
          if (labelOptions.generatePDF) {
            pdfBuffer = await this.pdfGenerator.generateLabelPDF(label);
          }

          // Send notifications if requested
          if (labelOptions.sendNotifications) {
            await this.notificationService.sendShippingNotification(label.id, {
              email: labelOptions.sendEmail,
              whatsapp: labelOptions.sendWhatsApp,
              pdfBuffer,
            });
          }

          // Mark order as label generated
          await db.order.update({
            where: { id: order.id },
            data: { labelGenerated: true },
          });

          results.labels.push({
            orderId: order.id,
            labelId: label.id,
            trackingId: label.trackingId,
            courierService: label.courierService,
            customer: order.customer.name,
          });

          results.successCount++;
        } catch (error) {
          results.errors.push({
            orderId: order.id,
            orderNumber: order.shopifyOrderId,
            error: error.message,
          });
          results.failureCount++;
        }
      }

      // Log bulk operation
      await this.logBulkOperation({
        type: 'BULK_LABEL_GENERATION',
        totalItems: results.totalOrders,
        successCount: results.successCount,
        failureCount: results.failureCount,
        options: labelOptions,
      });

      return results;
    } catch (error) {
      console.error('Bulk label generation failed:', error);
      throw error;
    }
  }

  /**
   * Bulk PDF generation and download
   */
  async bulkGeneratePDFs(type, itemIds, options = {}) {
    try {
      const zip = new JSZip();
      const results = {
        totalItems: itemIds.length,
        successCount: 0,
        failureCount: 0,
        zipBuffer: null,
        errors: [],
      };

      for (const itemId of itemIds) {
        try {
          let pdfBuffer;
          let filename;

          if (type === 'invoices') {
            const invoice = await db.invoice.findUnique({
              where: { id: itemId },
              include: { customer: true, items: true },
            });
            
            if (!invoice) {
              throw new Error('Invoice not found');
            }

            pdfBuffer = await this.pdfGenerator.generateInvoicePDF(invoice);
            filename = `Invoice-${invoice.invoiceNumber}.pdf`;
          } else if (type === 'labels') {
            const label = await db.shippingLabel.findUnique({
              where: { id: itemId },
              include: { customer: true },
            });
            
            if (!label) {
              throw new Error('Label not found');
            }

            pdfBuffer = await this.pdfGenerator.generateLabelPDF(label);
            filename = `Label-${label.trackingId}.pdf`;
          } else {
            throw new Error('Invalid PDF type');
          }

          zip.file(filename, pdfBuffer);
          results.successCount++;
        } catch (error) {
          results.errors.push({
            itemId,
            error: error.message,
          });
          results.failureCount++;
        }
      }

      // Generate ZIP file
      results.zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // Log bulk operation
      await this.logBulkOperation({
        type: `BULK_PDF_GENERATION_${type.toUpperCase()}`,
        totalItems: results.totalItems,
        successCount: results.successCount,
        failureCount: results.failureCount,
        options,
      });

      return results;
    } catch (error) {
      console.error('Bulk PDF generation failed:', error);
      throw error;
    }
  }

  /**
   * Bulk customer import from CSV
   */
  async bulkImportCustomers(csvBuffer, options = {}) {
    try {
      const results = {
        totalRows: 0,
        successCount: 0,
        failureCount: 0,
        customers: [],
        errors: [],
      };

      const csvData = await this.parseCSV(csvBuffer);
      results.totalRows = csvData.length;

      for (const row of csvData) {
        try {
          // Validate required fields
          if (!row.name || !row.email) {
            throw new Error('Name and email are required fields');
          }

          // Check if customer already exists
          const existingCustomer = await db.customer.findFirst({
            where: {
              OR: [
                { email: row.email },
                { phone: row.phone },
              ],
            },
          });

          if (existingCustomer && !options.allowDuplicates) {
            throw new Error('Customer already exists');
          }

          // Create customer
          const customer = await db.customer.create({
            data: {
              name: row.name,
              email: row.email,
              phone: row.phone || null,
              address: row.address || null,
              city: row.city || null,
              state: row.state || null,
              pincode: row.pincode || null,
              country: row.country || 'India',
              gstin: row.gstin || null,
              isGSTRegistered: row.gstin ? true : false,
              notes: row.notes || null,
              status: row.status || 'ACTIVE',
            },
          });

          results.customers.push({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          });

          results.successCount++;
        } catch (error) {
          results.errors.push({
            row: row,
            error: error.message,
          });
          results.failureCount++;
        }
      }

      // Log bulk operation
      await this.logBulkOperation({
        type: 'BULK_CUSTOMER_IMPORT',
        totalItems: results.totalRows,
        successCount: results.successCount,
        failureCount: results.failureCount,
        options,
      });

      return results;
    } catch (error) {
      console.error('Bulk customer import failed:', error);
      throw error;
    }
  }

  /**
   * Bulk data export to CSV
   */
  async bulkExportData(type, filters = {}, options = {}) {
    try {
      let data;
      let headers;

      switch (type) {
        case 'customers':
          data = await this.exportCustomers(filters);
          headers = ['ID', 'Name', 'Email', 'Phone', 'City', 'State', 'GSTIN', 'Status', 'Created At'];
          break;
        
        case 'invoices':
          data = await this.exportInvoices(filters);
          headers = ['ID', 'Invoice Number', 'Customer', 'Date', 'Due Date', 'Amount', 'Tax', 'Status', 'Created At'];
          break;
        
        case 'orders':
          data = await this.exportOrders(filters);
          headers = ['ID', 'Order ID', 'Customer', 'Date', 'Amount', 'Items', 'Status', 'Created At'];
          break;
        
        case 'labels':
          data = await this.exportLabels(filters);
          headers = ['ID', 'Tracking ID', 'Customer', 'Courier', 'Service', 'Weight', 'Cost', 'Status', 'Created At'];
          break;
        
        default:
          throw new Error('Invalid export type');
      }

      const csvContent = this.generateCSV(data, headers);

      // Log bulk operation
      await this.logBulkOperation({
        type: `BULK_EXPORT_${type.toUpperCase()}`,
        totalItems: data.length,
        successCount: data.length,
        failureCount: 0,
        options: { filters, ...options },
      });

      return {
        type,
        totalRecords: data.length,
        csvContent,
        filename: `${type}_export_${new Date().toISOString().split('T')[0]}.csv`,
      };
    } catch (error) {
      console.error('Bulk export failed:', error);
      throw error;
    }
  }

  /**
   * Bulk update tracking IDs
   */
  async bulkUpdateTrackingIds(updates) {
    try {
      const results = {
        totalUpdates: updates.length,
        successCount: 0,
        failureCount: 0,
        updated: [],
        errors: [],
      };

      for (const update of updates) {
        try {
          const label = await db.shippingLabel.update({
            where: { id: update.labelId },
            data: {
              trackingId: update.trackingId,
              status: update.status || 'SHIPPED',
              updatedAt: new Date(),
            },
            include: {
              customer: true,
            },
          });

          // Send tracking notification if requested
          if (update.sendNotification) {
            await this.notificationService.sendShippingNotification(label.id, {
              email: update.sendEmail,
              whatsapp: update.sendWhatsApp,
            });
          }

          results.updated.push({
            labelId: label.id,
            trackingId: label.trackingId,
            customer: label.customer.name,
          });

          results.successCount++;
        } catch (error) {
          results.errors.push({
            labelId: update.labelId,
            trackingId: update.trackingId,
            error: error.message,
          });
          results.failureCount++;
        }
      }

      // Log bulk operation
      await this.logBulkOperation({
        type: 'BULK_TRACKING_UPDATE',
        totalItems: results.totalUpdates,
        successCount: results.successCount,
        failureCount: results.failureCount,
      });

      return results;
    } catch (error) {
      console.error('Bulk tracking update failed:', error);
      throw error;
    }
  }

  /**
   * Bulk status updates
   */
  async bulkUpdateStatus(type, itemIds, newStatus, options = {}) {
    try {
      const results = {
        totalItems: itemIds.length,
        successCount: 0,
        failureCount: 0,
        updated: [],
        errors: [],
      };

      for (const itemId of itemIds) {
        try {
          let updatedItem;

          switch (type) {
            case 'invoices':
              updatedItem = await db.invoice.update({
                where: { id: itemId },
                data: { status: newStatus },
                include: { customer: true },
              });
              break;
            
            case 'orders':
              updatedItem = await db.order.update({
                where: { id: itemId },
                data: { status: newStatus },
                include: { customer: true },
              });
              break;
            
            case 'labels':
              updatedItem = await db.shippingLabel.update({
                where: { id: itemId },
                data: { status: newStatus },
                include: { customer: true },
              });
              break;
            
            case 'customers':
              updatedItem = await db.customer.update({
                where: { id: itemId },
                data: { status: newStatus },
              });
              break;
            
            default:
              throw new Error('Invalid update type');
          }

          // Send notifications for specific status changes
          if (options.sendNotifications) {
            await this.sendStatusChangeNotification(type, updatedItem, newStatus);
          }

          results.updated.push({
            id: updatedItem.id,
            status: newStatus,
            name: updatedItem.customer?.name || updatedItem.name,
          });

          results.successCount++;
        } catch (error) {
          results.errors.push({
            itemId,
            error: error.message,
          });
          results.failureCount++;
        }
      }

      // Log bulk operation
      await this.logBulkOperation({
        type: `BULK_STATUS_UPDATE_${type.toUpperCase()}`,
        totalItems: results.totalItems,
        successCount: results.successCount,
        failureCount: results.failureCount,
        options: { newStatus, ...options },
      });

      return results;
    } catch (error) {
      console.error('Bulk status update failed:', error);
      throw error;
    }
  }

  /**
   * Generate invoice from order
   */
  async generateInvoiceFromOrder(order, options = {}) {
    const invoiceNumber = await this.generateInvoiceNumber();
    
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: order.customerId,
        orderId: order.id,
        invoiceDate: new Date(),
        dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: order.totalAmount - (order.taxAmount || 0),
        taxAmount: order.taxAmount || 0,
        totalAmount: order.totalAmount,
        status: 'DRAFT',
        placeOfSupply: order.customer.state || 'Unknown',
        items: {
          create: order.items.map(item => ({
            description: item.title,
            quantity: item.quantity,
            rate: item.price,
            amount: item.quantity * item.price,
            hsnCode: item.hsnCode || '0000',
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return invoice;
  }

  /**
   * Generate shipping label from order
   */
  async generateLabelFromOrder(order, options = {}) {
    const trackingId = options.trackingId || this.generateTrackingId();
    
    const label = await db.shippingLabel.create({
      data: {
        trackingId,
        customerId: order.customerId,
        orderId: order.id,
        courierService: options.courierService || 'INDIA_POST',
        serviceType: options.serviceType || 'STANDARD',
        weight: options.weight || 1.0,
        shippingCost: options.shippingCost || 0,
        fromAddress: options.fromAddress || 'Business Address',
        toAddress: order.shippingAddress,
        status: 'CREATED',
      },
      include: {
        customer: true,
      },
    });

    return label;
  }

  /**
   * Export customers data
   */
  async exportCustomers(filters) {
    const customers = await db.customer.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });

    return customers.map(customer => [
      customer.id,
      customer.name,
      customer.email,
      customer.phone || '',
      customer.city || '',
      customer.state || '',
      customer.gstin || '',
      customer.status,
      customer.createdAt.toISOString(),
    ]);
  }

  /**
   * Export invoices data
   */
  async exportInvoices(filters) {
    const invoices = await db.invoice.findMany({
      where: filters,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map(invoice => [
      invoice.id,
      invoice.invoiceNumber,
      invoice.customer.name,
      invoice.invoiceDate.toISOString().split('T')[0],
      invoice.dueDate?.toISOString().split('T')[0] || '',
      invoice.totalAmount,
      invoice.taxAmount,
      invoice.status,
      invoice.createdAt.toISOString(),
    ]);
  }

  /**
   * Export orders data
   */
  async exportOrders(filters) {
    const orders = await db.order.findMany({
      where: filters,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(order => [
      order.id,
      order.shopifyOrderId,
      order.customer.name,
      order.orderDate.toISOString().split('T')[0],
      order.totalAmount,
      order.itemCount,
      order.status,
      order.createdAt.toISOString(),
    ]);
  }

  /**
   * Export labels data
   */
  async exportLabels(filters) {
    const labels = await db.shippingLabel.findMany({
      where: filters,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    return labels.map(label => [
      label.id,
      label.trackingId,
      label.customer.name,
      label.courierService,
      label.serviceType,
      label.weight,
      label.shippingCost,
      label.status,
      label.createdAt.toISOString(),
    ]);
  }

  /**
   * Parse CSV data
   */
  async parseCSV(csvBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(csvBuffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Generate CSV content
   */
  generateCSV(data, headers) {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const csvRow = row.map(field => {
        // Escape commas and quotes
        if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      });
      csvRows.push(csvRow.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    const lastInvoice = await db.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop());
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Generate tracking ID
   */
  generateTrackingId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TRK${timestamp}${random}`.toUpperCase();
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(type, item, newStatus) {
    try {
      if (type === 'orders' && newStatus === 'DELIVERED') {
        await this.notificationService.sendDeliveryConfirmation(item.id);
      }
      // Add more status change notifications as needed
    } catch (error) {
      console.error('Status change notification failed:', error);
    }
  }

  /**
   * Log bulk operation
   */
  async logBulkOperation(data) {
    try {
      await db.bulkOperationLog.create({
        data: {
          type: data.type,
          totalItems: data.totalItems,
          successCount: data.successCount,
          failureCount: data.failureCount,
          options: data.options ? JSON.stringify(data.options) : null,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log bulk operation:', error);
    }
  }

  /**
   * Get bulk operation statistics
   */
  async getBulkOperationStats(dateFrom, dateTo) {
    const stats = await db.bulkOperationLog.groupBy({
      by: ['type'],
      where: {
        completedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _sum: {
        totalItems: true,
        successCount: true,
        failureCount: true,
      },
      _count: {
        id: true,
      },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.type] = {
        operations: stat._count.id,
        totalItems: stat._sum.totalItems,
        successCount: stat._sum.successCount,
        failureCount: stat._sum.failureCount,
      };
      return acc;
    }, {});
  }
}

export const bulkOperationsService = new BulkOperationsService();