import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { notificationService } from '../services/NotificationService.server.js';

/**
 * Notification API Routes
 * Handles email and WhatsApp notification operations
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'stats':
        const dateFrom = new Date(url.searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const dateTo = new Date(url.searchParams.get('dateTo') || new Date());
        const stats = await notificationService.getNotificationStats(dateFrom, dateTo);
        return json({ success: true, data: stats });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Notification API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  
  const formData = await request.formData();
  const action = formData.get('action') as string;

  try {
    switch (action) {
      case 'send_invoice_notification':
        const invoiceId = formData.get('invoiceId') as string;
        const invoiceOptions = {
          email: formData.get('sendEmail') === 'true',
          whatsapp: formData.get('sendWhatsApp') === 'true',
        };
        const invoiceResult = await notificationService.sendInvoiceNotification(invoiceId, invoiceOptions);
        return json({ success: true, data: invoiceResult });

      case 'send_shipping_notification':
        const labelId = formData.get('labelId') as string;
        const shippingOptions = {
          email: formData.get('sendEmail') === 'true',
          whatsapp: formData.get('sendWhatsApp') === 'true',
        };
        const shippingResult = await notificationService.sendShippingNotification(labelId, shippingOptions);
        return json({ success: true, data: shippingResult });

      case 'send_order_confirmation':
        const orderId = formData.get('orderId') as string;
        const orderOptions = {
          email: formData.get('sendEmail') === 'true',
          whatsapp: formData.get('sendWhatsApp') === 'true',
        };
        const orderResult = await notificationService.sendOrderConfirmation(orderId, orderOptions);
        return json({ success: true, data: orderResult });

      case 'send_payment_reminder':
        const reminderInvoiceId = formData.get('invoiceId') as string;
        const reminderOptions = {
          email: formData.get('sendEmail') === 'true',
          whatsapp: formData.get('sendWhatsApp') === 'true',
        };
        const reminderResult = await notificationService.sendPaymentReminder(reminderInvoiceId, reminderOptions);
        return json({ success: true, data: reminderResult });

      case 'send_bulk_promotion':
        const customerIds = JSON.parse(formData.get('customerIds') as string);
        const subject = formData.get('subject') as string;
        const emailContent = formData.get('emailContent') as string;
        const whatsappMessage = formData.get('whatsappMessage') as string;
        const bulkOptions = {
          email: formData.get('sendEmail') === 'true',
          whatsapp: formData.get('sendWhatsApp') === 'true',
        };
        const bulkResult = await notificationService.sendBulkPromotion(
          customerIds,
          subject,
          emailContent,
          whatsappMessage,
          bulkOptions
        );
        return json({ success: true, data: bulkResult });

      case 'send_payment_reminders':
        const paymentReminderOptions = {
          email: formData.get('sendEmail') === 'true',
          whatsapp: formData.get('sendWhatsApp') === 'true',
        };
        const paymentRemindersResult = await notificationService.sendPaymentReminders(paymentReminderOptions);
        return json({ success: true, data: paymentRemindersResult });

      case 'test_services':
        const testEmail = formData.get('testEmail') as string;
        const testPhone = formData.get('testPhone') as string;
        const testResult = await notificationService.testNotificationServices(testEmail, testPhone);
        return json({ success: true, data: testResult });

      case 'process_automated_workflows':
        const workflowResult = await notificationService.processAutomatedWorkflows();
        return json({ success: true, data: workflowResult });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Notification action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};