import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Email Service for automated invoice and label delivery
 * Supports both SendGrid and SMTP configurations
 */
export class EmailService {
  constructor() {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY;
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    };
    
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourbusiness.com';
    this.fromName = process.env.FROM_NAME || 'Your Business Name';
    
    this.initializeServices();
  }

  /**
   * Initialize email services
   */
  initializeServices() {
    // Initialize SendGrid if API key is available
    if (this.sendGridApiKey) {
      sgMail.setApiKey(this.sendGridApiKey);
      console.log('SendGrid initialized successfully');
    }

    // Initialize SMTP transporter
    if (this.smtpConfig.auth.user && this.smtpConfig.auth.pass) {
      this.smtpTransporter = nodemailer.createTransporter(this.smtpConfig);
      console.log('SMTP transporter initialized successfully');
    }
  }

  /**
   * Send email using preferred method (SendGrid first, then SMTP)
   */
  async sendEmail(emailData) {
    try {
      if (this.sendGridApiKey) {
        return await this.sendWithSendGrid(emailData);
      } else if (this.smtpTransporter) {
        return await this.sendWithSMTP(emailData);
      } else {
        throw new Error('No email service configured. Please set up SendGrid or SMTP.');
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  /**
   * Send email using SendGrid
   */
  async sendWithSendGrid(emailData) {
    const msg = {
      to: emailData.to,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments || [],
    };

    const response = await sgMail.send(msg);
    console.log('Email sent via SendGrid:', response[0].statusCode);
    return response;
  }

  /**
   * Send email using SMTP
   */
  async sendWithSMTP(emailData) {
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments || [],
    };

    const response = await this.smtpTransporter.sendMail(mailOptions);
    console.log('Email sent via SMTP:', response.messageId);
    return response;
  }

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoiceEmail(invoice, customer, pdfBuffer) {
    const emailData = {
      to: customer.email,
      subject: `Invoice #${invoice.invoiceNumber} from ${this.fromName}`,
      html: this.generateInvoiceEmailHTML(invoice, customer),
      text: this.generateInvoiceEmailText(invoice, customer),
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send shipping label email with PDF attachment
   */
  async sendShippingLabelEmail(label, customer, pdfBuffer) {
    const emailData = {
      to: customer.email,
      subject: `Shipping Label - Tracking ID: ${label.trackingId}`,
      html: this.generateShippingLabelEmailHTML(label, customer),
      text: this.generateShippingLabelEmailText(label, customer),
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Shipping-Label-${label.trackingId}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(order, customer) {
    const emailData = {
      to: customer.email,
      subject: `Order Confirmation - Order #${order.shopifyOrderId}`,
      html: this.generateOrderConfirmationEmailHTML(order, customer),
      text: this.generateOrderConfirmationEmailText(order, customer),
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(invoice, customer) {
    const emailData = {
      to: customer.email,
      subject: `Payment Reminder - Invoice #${invoice.invoiceNumber}`,
      html: this.generatePaymentReminderEmailHTML(invoice, customer),
      text: this.generatePaymentReminderEmailText(invoice, customer),
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send bulk emails (for newsletters, promotions, etc.)
   */
  async sendBulkEmails(recipients, subject, htmlContent, textContent) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const emailData = {
          to: recipient.email,
          subject: this.personalizeContent(subject, recipient),
          html: this.personalizeContent(htmlContent, recipient),
          text: this.personalizeContent(textContent, recipient),
        };

        const result = await this.sendEmail(emailData);
        results.push({ email: recipient.email, success: true, result });
      } catch (error) {
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Generate invoice email HTML template
   */
  generateInvoiceEmailHTML(invoice, customer) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #00A96E; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .invoice-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #00A96E; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice #${invoice.invoiceNumber}</h1>
          </div>
          <div class="content">
            <p>Dear ${customer.name},</p>
            <p>Thank you for your business! Please find your invoice attached to this email.</p>
            
            <div class="invoice-details">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${invoice.totalAmount}</p>
              <p><strong>Status:</strong> ${invoice.status}</p>
            </div>

            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <p style="text-align: center;">
              <a href="#" class="button">View Invoice Online</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>${this.fromName} | ${this.fromEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate invoice email text template
   */
  generateInvoiceEmailText(invoice, customer) {
    return `
Dear ${customer.name},

Thank you for your business! Please find your invoice attached to this email.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
- Total Amount: ₹${invoice.totalAmount}
- Status: ${invoice.status}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
${this.fromName}
${this.fromEmail}

This is an automated email. Please do not reply to this email.
    `;
  }

  /**
   * Generate shipping label email HTML template
   */
  generateShippingLabelEmailHTML(label, customer) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shipping Label - ${label.trackingId}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #5C6AC4; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .shipping-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #5C6AC4; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order is Ready to Ship!</h1>
          </div>
          <div class="content">
            <p>Dear ${customer.name},</p>
            <p>Your order has been processed and is ready for shipping. Please find the shipping label attached.</p>
            
            <div class="shipping-details">
              <h3>Shipping Details:</h3>
              <p><strong>Tracking ID:</strong> ${label.trackingId}</p>
              <p><strong>Courier Service:</strong> ${label.courierService}</p>
              <p><strong>Service Type:</strong> ${label.serviceType}</p>
              <p><strong>Weight:</strong> ${label.weight} kg</p>
              <p><strong>Shipping Cost:</strong> ₹${label.shippingCost}</p>
            </div>

            <p>You can track your shipment using the tracking ID provided above.</p>
            
            <p style="text-align: center;">
              <a href="#" class="button">Track Your Order</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>${this.fromName} | ${this.fromEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate shipping label email text template
   */
  generateShippingLabelEmailText(label, customer) {
    return `
Dear ${customer.name},

Your order has been processed and is ready for shipping. Please find the shipping label attached.

Shipping Details:
- Tracking ID: ${label.trackingId}
- Courier Service: ${label.courierService}
- Service Type: ${label.serviceType}
- Weight: ${label.weight} kg
- Shipping Cost: ₹${label.shippingCost}

You can track your shipment using the tracking ID provided above.

Best regards,
${this.fromName}
${this.fromEmail}

This is an automated email. Please do not reply to this email.
    `;
  }

  /**
   * Generate order confirmation email HTML template
   */
  generateOrderConfirmationEmailHTML(order, customer) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation - ${order.shopifyOrderId}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #00A96E; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <p>Dear ${customer.name},</p>
            <p>Thank you for your order! We have received your order and it is being processed.</p>
            
            <div class="order-details">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${order.shopifyOrderId}</p>
              <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
              <p><strong>Items:</strong> ${order.itemCount}</p>
              <p><strong>Status:</strong> ${order.status}</p>
            </div>

            <p>We will send you another email with tracking information once your order ships.</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>${this.fromName} | ${this.fromEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate order confirmation email text template
   */
  generateOrderConfirmationEmailText(order, customer) {
    return `
Dear ${customer.name},

Thank you for your order! We have received your order and it is being processed.

Order Details:
- Order ID: ${order.shopifyOrderId}
- Order Date: ${new Date(order.orderDate).toLocaleDateString()}
- Total Amount: ₹${order.totalAmount}
- Items: ${order.itemCount}
- Status: ${order.status}

We will send you another email with tracking information once your order ships.

Best regards,
${this.fromName}
${this.fromEmail}

This is an automated email. Please do not reply to this email.
    `;
  }

  /**
   * Generate payment reminder email HTML template
   */
  generatePaymentReminderEmailHTML(invoice, customer) {
    const daysOverdue = Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Reminder - Invoice #${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .invoice-details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .urgent { color: #FF6B35; font-weight: bold; }
          .button { display: inline-block; padding: 10px 20px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${customer.name},</p>
            <p class="urgent">This is a friendly reminder that your invoice payment is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}.</p>
            
            <div class="invoice-details">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Amount Due:</strong> ₹${invoice.totalAmount}</p>
            </div>

            <p>Please arrange for payment at your earliest convenience to avoid any late fees.</p>
            
            <p style="text-align: center;">
              <a href="#" class="button">Pay Now</a>
            </p>
          </div>
          <div class="footer">
            <p>If you have already made this payment, please disregard this email.</p>
            <p>${this.fromName} | ${this.fromEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate payment reminder email text template
   */
  generatePaymentReminderEmailText(invoice, customer) {
    const daysOverdue = Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
    
    return `
Dear ${customer.name},

This is a friendly reminder that your invoice payment is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
- Amount Due: ₹${invoice.totalAmount}

Please arrange for payment at your earliest convenience to avoid any late fees.

If you have already made this payment, please disregard this email.

Best regards,
${this.fromName}
${this.fromEmail}
    `;
  }

  /**
   * Personalize email content with customer data
   */
  personalizeContent(content, customer) {
    return content
      .replace(/\{customerName\}/g, customer.name || 'Valued Customer')
      .replace(/\{customerEmail\}/g, customer.email || '')
      .replace(/\{customerPhone\}/g, customer.phone || '')
      .replace(/\{customerCity\}/g, customer.city || '')
      .replace(/\{customerState\}/g, customer.state || '');
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail) {
    const emailData = {
      to: testEmail,
      subject: 'Email Configuration Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your email configuration is working correctly.</p>
        <p>If you received this email, your email service is configured properly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
      text: `
Email Configuration Test

This is a test email to verify your email configuration is working correctly.
If you received this email, your email service is configured properly!

Sent at: ${new Date().toISOString()}
      `,
    };

    return await this.sendEmail(emailData);
  }
}

export const emailService = new EmailService();