import { emailService } from './EmailService.server.js';
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';
let whatsappService = null;
if (WHATSAPP_ENABLED) {
  // Lazy-load only if enabled
  const svc = await import('./WhatsAppService.server.js');
  whatsappService = svc.whatsappService;
}
import db from '../db.server';

/**
 * Comprehensive Notification Service
 * Orchestrates email and WhatsApp notifications for business events
 */
export class NotificationService {
  constructor() {
    this.emailService = emailService;
    this.whatsappService = whatsappService;
  }

  /**
   * Send invoice notification via multiple channels
   */
  async sendInvoiceNotification(invoiceId, options = {}) {
    try {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          items: true,
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const results = {
        invoice: invoice.invoiceNumber,
        customer: invoice.customer.name,
        notifications: [],
      };

      // Send email notification
      if (options.email !== false && invoice.customer.email) {
        try {
          const pdfBuffer = options.pdfBuffer || await this.generateInvoicePDF(invoice);
          const emailResult = await this.emailService.sendInvoiceEmail(
            invoice,
            invoice.customer,
            pdfBuffer
          );
          
          results.notifications.push({
            type: 'email',
            status: 'success',
            recipient: invoice.customer.email,
            result: emailResult,
          });

          // Log notification
          await this.logNotification({
            type: 'EMAIL',
            event: 'INVOICE_SENT',
            recipientId: invoice.customerId,
            recipientEmail: invoice.customer.email,
            invoiceId: invoice.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'email',
            status: 'error',
            recipient: invoice.customer.email,
            error: error.message,
          });

          await this.logNotification({
            type: 'EMAIL',
            event: 'INVOICE_SENT',
            recipientId: invoice.customerId,
            recipientEmail: invoice.customer.email,
            invoiceId: invoice.id,
            status: 'FAILED',
            error: error.message,
          });
        }
      }

      // Send WhatsApp notification
      if (WHATSAPP_ENABLED && this.whatsappService && options.whatsapp !== false && invoice.customer.phone) {
        try {
          const whatsappResult = await this.whatsappService.sendInvoiceNotification(
            invoice,
            invoice.customer,
            options.pdfUrl
          );
          
          results.notifications.push({
            type: 'whatsapp',
            status: 'success',
            recipient: invoice.customer.phone,
            result: whatsappResult,
          });

          await this.logNotification({
            type: 'WHATSAPP',
            event: 'INVOICE_SENT',
            recipientId: invoice.customerId,
            recipientPhone: invoice.customer.phone,
            invoiceId: invoice.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'whatsapp',
            status: 'error',
            recipient: invoice.customer.phone,
            error: error.message,
          });

          await this.logNotification({
            type: 'WHATSAPP',
            event: 'INVOICE_SENT',
            recipientId: invoice.customerId,
            recipientPhone: invoice.customer.phone,
            invoiceId: invoice.id,
            status: 'FAILED',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Invoice notification failed:', error);
      throw error;
    }
  }

  /**
   * Send shipping notification via multiple channels
   */
  async sendShippingNotification(labelId, options = {}) {
    try {
      const label = await db.shippingLabel.findUnique({
        where: { id: labelId },
        include: {
          customer: true,
          order: true,
        },
      });

      if (!label) {
        throw new Error('Shipping label not found');
      }

      const results = {
        trackingId: label.trackingId,
        customer: label.customer.name,
        notifications: [],
      };

      // Send email notification
      if (options.email !== false && label.customer.email) {
        try {
          const pdfBuffer = options.pdfBuffer || await this.generateLabelPDF(label);
          const emailResult = await this.emailService.sendShippingLabelEmail(
            label,
            label.customer,
            pdfBuffer
          );
          
          results.notifications.push({
            type: 'email',
            status: 'success',
            recipient: label.customer.email,
            result: emailResult,
          });

          await this.logNotification({
            type: 'EMAIL',
            event: 'SHIPPING_LABEL_SENT',
            recipientId: label.customerId,
            recipientEmail: label.customer.email,
            labelId: label.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'email',
            status: 'error',
            recipient: label.customer.email,
            error: error.message,
          });

          await this.logNotification({
            type: 'EMAIL',
            event: 'SHIPPING_LABEL_SENT',
            recipientId: label.customerId,
            recipientEmail: label.customer.email,
            labelId: label.id,
            status: 'FAILED',
            error: error.message,
          });
        }
      }

      // Send WhatsApp notification
      if (WHATSAPP_ENABLED && this.whatsappService && options.whatsapp !== false && label.customer.phone) {
        try {
          const whatsappResult = await this.whatsappService.sendShippingNotification(
            label,
            label.customer
          );
          
          results.notifications.push({
            type: 'whatsapp',
            status: 'success',
            recipient: label.customer.phone,
            result: whatsappResult,
          });

          await this.logNotification({
            type: 'WHATSAPP',
            event: 'SHIPPING_NOTIFICATION',
            recipientId: label.customerId,
            recipientPhone: label.customer.phone,
            labelId: label.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'whatsapp',
            status: 'error',
            recipient: label.customer.phone,
            error: error.message,
          });

          await this.logNotification({
            type: 'WHATSAPP',
            event: 'SHIPPING_NOTIFICATION',
            recipientId: label.customerId,
            recipientPhone: label.customer.phone,
            labelId: label.id,
            status: 'FAILED',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Shipping notification failed:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(orderId, options = {}) {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const results = {
        orderId: order.shopifyOrderId,
        customer: order.customer.name,
        notifications: [],
      };

      // Send email confirmation
      if (options.email !== false && order.customer.email) {
        try {
          const emailResult = await this.emailService.sendOrderConfirmationEmail(
            order,
            order.customer
          );
          
          results.notifications.push({
            type: 'email',
            status: 'success',
            recipient: order.customer.email,
            result: emailResult,
          });

          await this.logNotification({
            type: 'EMAIL',
            event: 'ORDER_CONFIRMATION',
            recipientId: order.customerId,
            recipientEmail: order.customer.email,
            orderId: order.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'email',
            status: 'error',
            recipient: order.customer.email,
            error: error.message,
          });
        }
      }

      // Send WhatsApp confirmation
      if (WHATSAPP_ENABLED && this.whatsappService && options.whatsapp !== false && order.customer.phone) {
        try {
          const whatsappResult = await this.whatsappService.sendOrderConfirmation(
            order,
            order.customer
          );
          
          results.notifications.push({
            type: 'whatsapp',
            status: 'success',
            recipient: order.customer.phone,
            result: whatsappResult,
          });

          await this.logNotification({
            type: 'WHATSAPP',
            event: 'ORDER_CONFIRMATION',
            recipientId: order.customerId,
            recipientPhone: order.customer.phone,
            orderId: order.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'whatsapp',
            status: 'error',
            recipient: order.customer.phone,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Order confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Send payment reminder notifications
   */
  async sendPaymentReminders(options = {}) {
    try {
      const overdueInvoices = await db.invoice.findMany({
        where: {
          status: 'SENT',
          dueDate: {
            lt: new Date(),
          },
        },
        include: {
          customer: true,
        },
      });

      const results = [];

      for (const invoice of overdueInvoices) {
        try {
          const reminderResult = await this.sendPaymentReminder(invoice.id, options);
          results.push(reminderResult);
        } catch (error) {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            error: error.message,
          });
        }
      }

      return {
        totalInvoices: overdueInvoices.length,
        results,
      };
    } catch (error) {
      console.error('Payment reminders failed:', error);
      throw error;
    }
  }

  /**
   * Send individual payment reminder
   */
  async sendPaymentReminder(invoiceId, options = {}) {
    try {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const results = {
        invoice: invoice.invoiceNumber,
        customer: invoice.customer.name,
        notifications: [],
      };

      // Send email reminder
      if (options.email !== false && invoice.customer.email) {
        try {
          const emailResult = await this.emailService.sendPaymentReminderEmail(
            invoice,
            invoice.customer
          );
          
          results.notifications.push({
            type: 'email',
            status: 'success',
            recipient: invoice.customer.email,
            result: emailResult,
          });

          await this.logNotification({
            type: 'EMAIL',
            event: 'PAYMENT_REMINDER',
            recipientId: invoice.customerId,
            recipientEmail: invoice.customer.email,
            invoiceId: invoice.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'email',
            status: 'error',
            recipient: invoice.customer.email,
            error: error.message,
          });
        }
      }

      // Send WhatsApp reminder
      if (WHATSAPP_ENABLED && this.whatsappService && options.whatsapp !== false && invoice.customer.phone) {
        try {
          const whatsappResult = await this.whatsappService.sendPaymentReminder(
            invoice,
            invoice.customer
          );
          
          results.notifications.push({
            type: 'whatsapp',
            status: 'success',
            recipient: invoice.customer.phone,
            result: whatsappResult,
          });

          await this.logNotification({
            type: 'WHATSAPP',
            event: 'PAYMENT_REMINDER',
            recipientId: invoice.customerId,
            recipientPhone: invoice.customer.phone,
            invoiceId: invoice.id,
            status: 'SUCCESS',
          });
        } catch (error) {
          results.notifications.push({
            type: 'whatsapp',
            status: 'error',
            recipient: invoice.customer.phone,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Payment reminder failed:', error);
      throw error;
    }
  }

  /**
   * Send bulk promotional messages
   */
  async sendBulkPromotion(customerIds, subject, emailContent, whatsappMessage, options = {}) {
    try {
      const customers = await db.customer.findMany({
        where: {
          id: {
            in: customerIds,
          },
        },
      });

      const results = {
        totalCustomers: customers.length,
        emailResults: [],
        whatsappResults: [],
      };

      // Send bulk emails
      if (options.email !== false) {
        const emailRecipients = customers.filter(c => c.email);
        if (emailRecipients.length > 0) {
          const emailResults = await this.emailService.sendBulkEmails(
            emailRecipients,
            subject,
            emailContent,
            this.htmlToText(emailContent)
          );
          results.emailResults = emailResults;
        }
      }

      // Send bulk WhatsApp messages
      if (WHATSAPP_ENABLED && this.whatsappService && options.whatsapp !== false) {
        const whatsappRecipients = customers.filter(c => c.phone);
        if (whatsappRecipients.length > 0) {
          const whatsappResults = await this.whatsappService.sendBulkMessages(
            whatsappRecipients,
            whatsappMessage
          );
          results.whatsappResults = whatsappResults;
        }
      }

      // Log bulk promotion
      await this.logNotification({
        type: 'BULK',
        event: 'PROMOTIONAL_MESSAGE',
        recipientCount: customers.length,
        status: 'COMPLETED',
        metadata: {
          subject,
          emailCount: results.emailResults.length,
          whatsappCount: results.whatsappResults.length,
        },
      });

      return results;
    } catch (error) {
      console.error('Bulk promotion failed:', error);
      throw error;
    }
  }

  /**
   * Send automated workflow notifications
   */
  async processAutomatedWorkflows() {
    try {
      const results = {
        paymentReminders: 0,
        deliveryConfirmations: 0,
        followUps: 0,
      };

      // Process payment reminders
      const paymentReminderResult = await this.sendPaymentReminders();
      results.paymentReminders = paymentReminderResult.totalInvoices;

      // Process delivery confirmations
      const deliveredOrders = await db.order.findMany({
        where: {
          status: 'DELIVERED',
          deliveryConfirmationSent: false,
        },
        include: {
          customer: true,
        },
      });

      for (const order of deliveredOrders) {
        try {
          await this.sendDeliveryConfirmation(order.id);
          await db.order.update({
            where: { id: order.id },
            data: { deliveryConfirmationSent: true },
          });
          results.deliveryConfirmations++;
        } catch (error) {
          console.error(`Delivery confirmation failed for order ${order.id}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Automated workflows failed:', error);
      throw error;
    }
  }

  /**
   * Send delivery confirmation
   */
  async sendDeliveryConfirmation(orderId) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const results = {
      orderId: order.shopifyOrderId,
      customer: order.customer.name,
      notifications: [],
    };

    // Send WhatsApp delivery confirmation
    if (WHATSAPP_ENABLED && this.whatsappService && order.customer.phone) {
      try {
        const whatsappResult = await this.whatsappService.sendDeliveryConfirmation(
          order,
          order.customer
        );
        
        results.notifications.push({
          type: 'whatsapp',
          status: 'success',
          recipient: order.customer.phone,
          result: whatsappResult,
        });
      } catch (error) {
        results.notifications.push({
          type: 'whatsapp',
          status: 'error',
          recipient: order.customer.phone,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Log notification activity
   */
  async logNotification(data) {
    try {
      await db.notificationLog.create({
        data: {
          type: data.type,
          event: data.event,
          recipientId: data.recipientId,
          recipientEmail: data.recipientEmail,
          recipientPhone: data.recipientPhone,
          invoiceId: data.invoiceId,
          orderId: data.orderId,
          labelId: data.labelId,
          status: data.status,
          error: data.error,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          recipientCount: data.recipientCount,
        },
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(dateFrom, dateTo) {
    const stats = await db.notificationLog.groupBy({
      by: ['type', 'event', 'status'],
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _count: {
        id: true,
      },
    });

    return stats.reduce((acc, stat) => {
      const key = `${stat.type}_${stat.event}_${stat.status}`;
      acc[key] = stat._count.id;
      return acc;
    }, {});
  }

  /**
   * Test notification services
   */
  async testNotificationServices(testEmail, testPhone) {
    const results = {
      email: null,
      whatsapp: null,
    };

    // Test email service
    if (testEmail) {
      try {
        const emailResult = await this.emailService.testEmailConfiguration(testEmail);
        results.email = { success: true, result: emailResult };
      } catch (error) {
        results.email = { success: false, error: error.message };
      }
    }

    // Test WhatsApp service
    if (WHATSAPP_ENABLED && this.whatsappService && testPhone) {
      try {
        const whatsappResult = await this.whatsappService.testWhatsAppConfiguration(testPhone);
        results.whatsapp = { success: true, result: whatsappResult };
      } catch (error) {
        results.whatsapp = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Utility function to convert HTML to text
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Generate invoice PDF (placeholder - integrate with existing PDF service)
   */
  async generateInvoicePDF(invoice) {
    // This would integrate with your existing PDF generation service
    // For now, return a placeholder buffer
    return Buffer.from('PDF content placeholder');
  }

  /**
   * Generate label PDF (placeholder - integrate with existing PDF service)
   */
  async generateLabelPDF(label) {
    // This would integrate with your existing PDF generation service
    // For now, return a placeholder buffer
    return Buffer.from('PDF content placeholder');
  }
}

export const notificationService = new NotificationService();