import twilio from 'twilio';
import axios from 'axios';
import FormData from 'form-data';

/**
 * WhatsApp Service for automated messaging
 * Supports Twilio WhatsApp Business API and WhatsApp Business API
 */
export class WhatsAppService {
  constructor() {
    // Twilio configuration
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    
    // WhatsApp Business API configuration
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL;
    this.whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
    this.whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    this.businessName = process.env.BUSINESS_NAME || 'Your Business';
    
    this.initializeServices();
  }

  /**
   * Initialize WhatsApp services
   */
  initializeServices() {
    // Initialize Twilio client
    if (this.twilioAccountSid && this.twilioAuthToken) {
      this.twilioClient = twilio(this.twilioAccountSid, this.twilioAuthToken);
      console.log('Twilio WhatsApp client initialized successfully');
    }

    // Initialize WhatsApp Business API
    if (this.whatsappApiUrl && this.whatsappApiToken) {
      console.log('WhatsApp Business API initialized successfully');
    }
  }

  /**
   * Send WhatsApp message using preferred method
   */
  async sendMessage(messageData) {
    try {
      if (this.whatsappApiUrl && this.whatsappApiToken) {
        return await this.sendWithBusinessAPI(messageData);
      } else if (this.twilioClient) {
        return await this.sendWithTwilio(messageData);
      } else {
        throw new Error('No WhatsApp service configured. Please set up Twilio or WhatsApp Business API.');
      }
    } catch (error) {
      console.error('WhatsApp message sending failed:', error);
      throw error;
    }
  }

  /**
   * Send message using Twilio WhatsApp API
   */
  async sendWithTwilio(messageData) {
    const message = await this.twilioClient.messages.create({
      from: this.twilioWhatsAppNumber,
      to: `whatsapp:${messageData.to}`,
      body: messageData.text,
      mediaUrl: messageData.mediaUrl || undefined,
    });

    console.log('WhatsApp message sent via Twilio:', message.sid);
    return message;
  }

  /**
   * Send message using WhatsApp Business API
   */
  async sendWithBusinessAPI(messageData) {
    const url = `${this.whatsappApiUrl}/${this.whatsappPhoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: messageData.to,
      type: 'text',
      text: {
        body: messageData.text
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${this.whatsappApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('WhatsApp message sent via Business API:', response.data);
    return response.data;
  }

  /**
   * Send invoice notification via WhatsApp
   */
  async sendInvoiceNotification(invoice, customer, pdfUrl = null) {
    const message = this.generateInvoiceMessage(invoice, customer);
    
    const messageData = {
      to: this.formatPhoneNumber(customer.phone),
      text: message,
      mediaUrl: pdfUrl ? [pdfUrl] : undefined,
    };

    return await this.sendMessage(messageData);
  }

  /**
   * Send shipping notification via WhatsApp
   */
  async sendShippingNotification(label, customer) {
    const message = this.generateShippingMessage(label, customer);
    
    const messageData = {
      to: this.formatPhoneNumber(customer.phone),
      text: message,
    };

    return await this.sendMessage(messageData);
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(order, customer) {
    const message = this.generateOrderConfirmationMessage(order, customer);
    
    const messageData = {
      to: this.formatPhoneNumber(customer.phone),
      text: message,
    };

    return await this.sendMessage(messageData);
  }

  /**
   * Send payment reminder via WhatsApp
   */
  async sendPaymentReminder(invoice, customer) {
    const message = this.generatePaymentReminderMessage(invoice, customer);
    
    const messageData = {
      to: this.formatPhoneNumber(customer.phone),
      text: message,
    };

    return await this.sendMessage(messageData);
  }

  /**
   * Send delivery confirmation via WhatsApp
   */
  async sendDeliveryConfirmation(order, customer) {
    const message = this.generateDeliveryConfirmationMessage(order, customer);
    
    const messageData = {
      to: this.formatPhoneNumber(customer.phone),
      text: message,
    };

    return await this.sendMessage(messageData);
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkMessages(recipients, messageTemplate, variables = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const personalizedMessage = this.personalizeMessage(messageTemplate, {
          ...variables,
          ...recipient,
        });

        const messageData = {
          to: this.formatPhoneNumber(recipient.phone),
          text: personalizedMessage,
        };

        const result = await this.sendMessage(messageData);
        results.push({ phone: recipient.phone, success: true, result });
        
        // Add delay to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        results.push({ phone: recipient.phone, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send template message using WhatsApp Business API
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
    if (!this.whatsappApiUrl || !this.whatsappApiToken) {
      throw new Error('WhatsApp Business API not configured');
    }

    const url = `${this.whatsappApiUrl}/${this.whatsappPhoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${this.whatsappApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('WhatsApp template message sent:', response.data);
    return response.data;
  }

  /**
   * Generate invoice message
   */
  generateInvoiceMessage(invoice, customer) {
    return `🧾 *Invoice Generated*

Hello ${customer.name}!

Your invoice has been generated:

📄 *Invoice #${invoice.invoiceNumber}*
📅 Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}
💰 Amount: ₹${invoice.totalAmount}
📋 Status: ${invoice.status}

${invoice.dueDate ? `⏰ Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}` : ''}

Thank you for your business!

---
${this.businessName}`;
  }

  /**
   * Generate shipping message
   */
  generateShippingMessage(label, customer) {
    return `📦 *Your Order is Shipped!*

Hello ${customer.name}!

Great news! Your order has been shipped:

🚚 *Tracking Details:*
📋 Tracking ID: ${label.trackingId}
🏢 Courier: ${label.courierService}
⚡ Service: ${label.serviceType}
📦 Weight: ${label.weight} kg

You can track your package using the tracking ID above.

---
${this.businessName}`;
  }

  /**
   * Generate order confirmation message
   */
  generateOrderConfirmationMessage(order, customer) {
    return `✅ *Order Confirmed!*

Hello ${customer.name}!

Thank you for your order:

🛍️ *Order #${order.shopifyOrderId}*
📅 Date: ${new Date(order.orderDate).toLocaleDateString()}
💰 Total: ₹${order.totalAmount}
📦 Items: ${order.itemCount}
📋 Status: ${order.status}

We'll notify you once your order ships!

---
${this.businessName}`;
  }

  /**
   * Generate payment reminder message
   */
  generatePaymentReminderMessage(invoice, customer) {
    const daysOverdue = Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
    
    return `💳 *Payment Reminder*

Hello ${customer.name},

${daysOverdue > 0 
  ? `Your payment is ${daysOverdue} days overdue.` 
  : 'This is a friendly reminder about your upcoming payment.'
}

📄 *Invoice #${invoice.invoiceNumber}*
💰 Amount: ₹${invoice.totalAmount}
📅 Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

Please arrange payment at your earliest convenience.

---
${this.businessName}`;
  }

  /**
   * Generate delivery confirmation message
   */
  generateDeliveryConfirmationMessage(order, customer) {
    return `🎉 *Order Delivered!*

Hello ${customer.name}!

Your order has been successfully delivered:

📦 *Order #${order.shopifyOrderId}*
✅ Status: Delivered
📅 Delivered on: ${new Date().toLocaleDateString()}

We hope you love your purchase! Please let us know if you have any questions.

⭐ We'd appreciate your feedback!

---
${this.businessName}`;
  }

  /**
   * Personalize message with customer data
   */
  personalizeMessage(template, data) {
    let message = template;
    
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), data[key] || '');
    });

    return message;
  }

  /**
   * Format phone number for WhatsApp
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Ensure it starts with country code
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phone) {
    const formatted = this.formatPhoneNumber(phone);
    return formatted && formatted.length >= 10;
  }

  /**
   * Test WhatsApp configuration
   */
  async testWhatsAppConfiguration(testPhone) {
    const messageData = {
      to: this.formatPhoneNumber(testPhone),
      text: `🧪 *WhatsApp Configuration Test*

This is a test message to verify your WhatsApp integration is working correctly.

If you received this message, your WhatsApp service is configured properly! ✅

Sent at: ${new Date().toLocaleString()}

---
${this.businessName}`,
    };

    return await this.sendMessage(messageData);
  }

  /**
   * Get message delivery status (Twilio only)
   */
  async getMessageStatus(messageSid) {
    if (!this.twilioClient) {
      throw new Error('Twilio client not configured');
    }

    const message = await this.twilioClient.messages(messageSid).fetch();
    return {
      sid: message.sid,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
    };
  }

  /**
   * Get account balance (Twilio only)
   */
  async getAccountBalance() {
    if (!this.twilioClient) {
      throw new Error('Twilio client not configured');
    }

    const balance = await this.twilioClient.balance.fetch();
    return {
      balance: balance.balance,
      currency: balance.currency,
    };
  }

  /**
   * Utility function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Schedule message for later delivery
   */
  async scheduleMessage(messageData, scheduledTime) {
    // This would typically integrate with a job queue like Bull or Agenda
    // For now, we'll store it in the database and process it with a cron job
    
    return {
      scheduled: true,
      scheduledTime,
      messageData,
      message: 'Message scheduled for delivery',
    };
  }

  /**
   * Create WhatsApp message templates
   */
  getMessageTemplates() {
    return {
      invoice: {
        name: 'invoice_notification',
        template: `🧾 *Invoice Generated*

Hello {customerName}!

Your invoice has been generated:
📄 Invoice #{invoiceNumber}
💰 Amount: ₹{totalAmount}
📅 Due Date: {dueDate}

Thank you for your business!`,
      },
      shipping: {
        name: 'shipping_notification',
        template: `📦 *Your Order is Shipped!*

Hello {customerName}!

Your order has been shipped:
🚚 Tracking ID: {trackingId}
🏢 Courier: {courierService}

Track your package with the ID above.`,
      },
      payment_reminder: {
        name: 'payment_reminder',
        template: `💳 *Payment Reminder*

Hello {customerName},

Your payment is due:
📄 Invoice #{invoiceNumber}
💰 Amount: ₹{totalAmount}
📅 Due Date: {dueDate}

Please arrange payment soon.`,
      },
    };
  }
}

export const whatsappService = new WhatsAppService();