// Enhanced PDF Editor Service with PDF.js Express Integration
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';
import fs from 'fs/promises';
import path from 'path';

export class EnhancedPDFEditor {
  constructor() {
    this.defaultFont = 'Helvetica';
    this.defaultFontSize = 12;
    this.margins = { top: 50, right: 50, bottom: 50, left: 50 };
  }

  /**
   * Create a new PDF document with advanced features
   */
  async createDocument(options = {}) {
    const pdfDoc = await PDFDocument.create();
    
    // Set document metadata
    pdfDoc.setTitle(options.title || 'GST Invoice');
    pdfDoc.setAuthor(options.author || 'GST Invoice Manager');
    pdfDoc.setSubject(options.subject || 'GST Compliant Invoice');
    pdfDoc.setCreator('GST Invoice Manager v2.0');
    pdfDoc.setProducer('Enhanced PDF Editor');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    return pdfDoc;
  }

  /**
   * Generate GST Invoice with enhanced features
   */
  async generateGSTInvoice(invoiceData, options = {}) {
    try {
      const pdfDoc = await this.createDocument({
        title: `GST Invoice - ${invoiceData.invoiceNumber}`,
        subject: 'GST Compliant Invoice with Digital Signature Support'
      });

      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();

      // Load fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let yPosition = height - 60;

      // Company Header with Logo Support
      if (options.logoPath) {
        try {
          const logoBytes = await fs.readFile(options.logoPath);
          const logoImage = await pdfDoc.embedPng(logoBytes);
          const logoDims = logoImage.scale(0.3);
          
          page.drawImage(logoImage, {
            x: 50,
            y: yPosition - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
          });
          
          yPosition -= logoDims.height + 20;
        } catch (error) {
          console.warn('Logo not found, skipping logo insertion');
        }
      }

      // Company Information
      page.drawText(invoiceData.company.name, {
        x: 50,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      yPosition -= 25;

      page.drawText(invoiceData.company.address, {
        x: 50,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;

      page.drawText(`GSTIN: ${invoiceData.company.gstin}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Invoice Title and Number
      page.drawText('TAX INVOICE', {
        x: width - 200,
        y: height - 60,
        size: 18,
        font: boldFont,
        color: rgb(0.8, 0.1, 0.1),
      });

      page.drawText(`Invoice No: ${invoiceData.invoiceNumber}`, {
        x: width - 200,
        y: height - 85,
        size: 12,
        font: boldFont,
      });

      page.drawText(`Date: ${new Date(invoiceData.date).toLocaleDateString('en-IN')}`, {
        x: width - 200,
        y: height - 105,
        size: 10,
        font: regularFont,
      });

      yPosition -= 60;

      // Customer Information Box
      this.drawBox(page, 50, yPosition - 80, width - 100, 70, rgb(0.95, 0.95, 0.95));
      
      page.drawText('Bill To:', {
        x: 60,
        y: yPosition - 20,
        size: 12,
        font: boldFont,
      });

      page.drawText(invoiceData.customer.name, {
        x: 60,
        y: yPosition - 40,
        size: 11,
        font: boldFont,
      });

      page.drawText(invoiceData.customer.address, {
        x: 60,
        y: yPosition - 55,
        size: 9,
        font: regularFont,
      });

      if (invoiceData.customer.gstin) {
        page.drawText(`GSTIN: ${invoiceData.customer.gstin}`, {
          x: 60,
          y: yPosition - 70,
          size: 9,
          font: regularFont,
        });
      }

      yPosition -= 100;

      // Items Table Header
      const tableTop = yPosition;
      const tableHeaders = ['S.No', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount', 'Tax Rate', 'Tax Amount', 'Total'];
      const columnWidths = [40, 120, 60, 40, 60, 70, 60, 70, 70];
      let xPosition = 50;

      // Draw table header background
      this.drawBox(page, 50, tableTop - 25, width - 100, 25, rgb(0.2, 0.2, 0.2));

      tableHeaders.forEach((header, index) => {
        page.drawText(header, {
          x: xPosition + 5,
          y: tableTop - 18,
          size: 9,
          font: boldFont,
          color: rgb(1, 1, 1),
        });
        xPosition += columnWidths[index];
      });

      yPosition = tableTop - 35;

      // Items
      let totalAmount = 0;
      let totalTaxAmount = 0;

      invoiceData.items.forEach((item, index) => {
        const itemTotal = item.quantity * item.rate;
        const taxAmount = (itemTotal * item.taxRate) / 100;
        const finalAmount = itemTotal + taxAmount;

        totalAmount += itemTotal;
        totalTaxAmount += taxAmount;

        xPosition = 50;
        const rowData = [
          (index + 1).toString(),
          item.description,
          item.hsnCode,
          item.quantity.toString(),
          `₹${item.rate.toFixed(2)}`,
          `₹${itemTotal.toFixed(2)}`,
          `${item.taxRate}%`,
          `₹${taxAmount.toFixed(2)}`,
          `₹${finalAmount.toFixed(2)}`
        ];

        // Alternate row background
        if (index % 2 === 0) {
          this.drawBox(page, 50, yPosition - 20, width - 100, 20, rgb(0.98, 0.98, 0.98));
        }

        rowData.forEach((data, colIndex) => {
          page.drawText(data, {
            x: xPosition + 5,
            y: yPosition - 12,
            size: 8,
            font: regularFont,
          });
          xPosition += columnWidths[colIndex];
        });

        yPosition -= 20;
      });

      // Tax Summary
      yPosition -= 20;
      const grandTotal = totalAmount + totalTaxAmount;

      // Tax breakdown (CGST/SGST/IGST)
      const taxBreakdown = this.calculateGSTBreakdown(invoiceData.items, invoiceData.customer.state, invoiceData.company.state);

      page.drawText('Tax Summary:', {
        x: width - 250,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      yPosition -= 20;

      Object.entries(taxBreakdown).forEach(([taxType, amount]) => {
        if (amount > 0) {
          page.drawText(`${taxType}: ₹${amount.toFixed(2)}`, {
            x: width - 250,
            y: yPosition,
            size: 10,
            font: regularFont,
          });
          yPosition -= 15;
        }
      });

      // Grand Total Box
      this.drawBox(page, width - 250, yPosition - 30, 200, 25, rgb(0.1, 0.1, 0.1));
      page.drawText(`Grand Total: ₹${grandTotal.toFixed(2)}`, {
        x: width - 240,
        y: yPosition - 20,
        size: 12,
        font: boldFont,
        color: rgb(1, 1, 1),
      });

      // Amount in Words
      yPosition -= 50;
      page.drawText(`Amount in Words: ${this.numberToWords(grandTotal)} Only`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
      });

      // Terms and Conditions
      yPosition -= 40;
      page.drawText('Terms & Conditions:', {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
      });

      const terms = [
        '1. Payment is due within 30 days of invoice date.',
        '2. Interest @ 18% per annum will be charged on overdue amounts.',
        '3. All disputes subject to local jurisdiction only.',
        '4. Goods once sold will not be taken back.'
      ];

      terms.forEach(term => {
        yPosition -= 12;
        page.drawText(term, {
          x: 50,
          y: yPosition,
          size: 8,
          font: regularFont,
        });
      });

      // Digital Signature Area
      yPosition -= 40;
      page.drawText('For ' + invoiceData.company.name, {
        x: width - 200,
        y: yPosition,
        size: 10,
        font: regularFont,
      });

      // Add signature placeholder
      this.drawBox(page, width - 200, yPosition - 60, 150, 50, rgb(0.95, 0.95, 0.95));
      page.drawText('Authorized Signatory', {
        x: width - 190,
        y: yPosition - 70,
        size: 8,
        font: regularFont,
      });

      // Add form fields for digital signature (if supported)
      if (options.enableDigitalSignature) {
        const form = pdfDoc.getForm();
        const signatureField = form.createSignatureField('signature');
        signatureField.addToPage(page, {
          x: width - 200,
          y: yPosition - 60,
          width: 150,
          height: 50,
        });
      }

      // QR Code placeholder (for digital verification)
      if (options.enableQRCode) {
        this.drawBox(page, 50, 50, 80, 80, rgb(0.9, 0.9, 0.9));
        page.drawText('QR Code', {
          x: 75,
          y: 85,
          size: 10,
          font: regularFont,
        });
      }

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating GST invoice:', error);
      throw new Error('Failed to generate GST invoice: ' + error.message);
    }
  }

  /**
   * Add annotations to existing PDF
   */
  async addAnnotations(pdfBytes, annotations) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (const annotation of annotations) {
        const page = pages[annotation.pageIndex || 0];
        
        switch (annotation.type) {
          case 'text':
            page.drawText(annotation.content, {
              x: annotation.x,
              y: annotation.y,
              size: annotation.fontSize || 12,
              color: rgb(annotation.color?.r || 0, annotation.color?.g || 0, annotation.color?.b || 0),
            });
            break;
            
          case 'highlight':
            this.drawBox(page, annotation.x, annotation.y, annotation.width, annotation.height, 
              rgb(annotation.color?.r || 1, annotation.color?.g || 1, annotation.color?.b || 0, 0.3));
            break;
            
          case 'rectangle':
            this.drawBox(page, annotation.x, annotation.y, annotation.width, annotation.height, 
              rgb(annotation.color?.r || 0, annotation.color?.g || 0, annotation.color?.b || 1), false);
            break;
        }
      }

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error adding annotations:', error);
      throw new Error('Failed to add annotations: ' + error.message);
    }
  }

  /**
   * Fill PDF form fields
   */
  async fillFormFields(pdfBytes, fieldData) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      Object.entries(fieldData).forEach(([fieldName, value]) => {
        try {
          const field = form.getField(fieldName);
          
          if (field.constructor.name === 'PDFTextField') {
            field.setText(value.toString());
          } else if (field.constructor.name === 'PDFCheckBox') {
            if (value) field.check();
            else field.uncheck();
          } else if (field.constructor.name === 'PDFDropdown') {
            field.select(value.toString());
          }
        } catch (error) {
          console.warn(`Field ${fieldName} not found or couldn't be filled:`, error.message);
        }
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error filling form fields:', error);
      throw new Error('Failed to fill form fields: ' + error.message);
    }
  }

  /**
   * Merge multiple PDFs
   */
  async mergePDFs(pdfBytesArray) {
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfBytes of pdfBytesArray) {
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      return await mergedPdf.save();
    } catch (error) {
      console.error('Error merging PDFs:', error);
      throw new Error('Failed to merge PDFs: ' + error.message);
    }
  }

  /**
   * Add watermark to PDF
   */
  async addWatermark(pdfBytes, watermarkText, options = {}) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        page.drawText(watermarkText, {
          x: width / 2 - (watermarkText.length * 10),
          y: height / 2,
          size: options.fontSize || 50,
          font: font,
          color: rgb(0.8, 0.8, 0.8, options.opacity || 0.3),
          rotate: { angle: options.angle || -45, origin: { x: width / 2, y: height / 2 } },
        });
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error adding watermark:', error);
      throw new Error('Failed to add watermark: ' + error.message);
    }
  }

  /**
   * Extract text from PDF
   */
  async extractText(pdfBytes) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      // Note: pdf-lib doesn't have built-in text extraction
      // This would require additional libraries like pdf-parse
      console.warn('Text extraction requires additional libraries like pdf-parse');
      return 'Text extraction not implemented in this version';
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text: ' + error.message);
    }
  }

  // Helper Methods

  drawBox(page, x, y, width, height, color, filled = true) {
    if (filled) {
      page.drawRectangle({
        x: x,
        y: y,
        width: width,
        height: height,
        color: color,
      });
    } else {
      page.drawRectangle({
        x: x,
        y: y,
        width: width,
        height: height,
        borderColor: color,
        borderWidth: 1,
      });
    }
  }

  calculateGSTBreakdown(items, customerState, companyState) {
    const isInterState = customerState !== companyState;
    let cgst = 0, sgst = 0, igst = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.rate;
      const taxAmount = (itemTotal * item.taxRate) / 100;

      if (isInterState) {
        igst += taxAmount;
      } else {
        cgst += taxAmount / 2;
        sgst += taxAmount / 2;
      }
    });

    return { CGST: cgst, SGST: sgst, IGST: igst };
  }

  numberToWords(amount) {
    // Simplified number to words conversion
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (num) => {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let result = '';
    
    if (integerPart >= 10000000) {
      result += convertHundreds(Math.floor(integerPart / 10000000)) + 'Crore ';
      integerPart %= 10000000;
    }
    if (integerPart >= 100000) {
      result += convertHundreds(Math.floor(integerPart / 100000)) + 'Lakh ';
      integerPart %= 100000;
    }
    if (integerPart >= 1000) {
      result += convertHundreds(Math.floor(integerPart / 1000)) + 'Thousand ';
      integerPart %= 1000;
    }
    if (integerPart > 0) {
      result += convertHundreds(integerPart);
    }

    result += 'Rupees';
    
    if (decimalPart > 0) {
      result += ' and ' + convertHundreds(decimalPart) + 'Paise';
    }

    return result.trim();
  }
}

export default EnhancedPDFEditor;