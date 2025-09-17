// Template-Based PDF Generator Service
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export class TemplateBasedPDFGenerator {
  constructor() {
    this.pageSize = {
      A4: { width: 595.28, height: 841.89 },
      Letter: { width: 612, height: 792 },
    };
  }

  /**
   * Generate PDF from custom template
   */
  async generateFromTemplate(template, invoiceData, options = {}) {
    try {
      const pdfDoc = await PDFDocument.create();
      
      // Set document metadata
      pdfDoc.setTitle(`${invoiceData.invoiceNumber} - ${invoiceData.company.name}`);
      pdfDoc.setAuthor(invoiceData.company.name);
      pdfDoc.setSubject('GST Compliant Invoice');
      pdfDoc.setCreator('GST Invoice Manager - Template Designer');
      pdfDoc.setProducer('Enhanced Template PDF Generator');
      pdfDoc.setCreationDate(new Date());

      // Get page dimensions
      const pageDimensions = this.pageSize[template.pageSize] || this.pageSize.A4;
      const { width, height } = template.orientation === 'landscape' 
        ? { width: pageDimensions.height, height: pageDimensions.width }
        : pageDimensions;

      const page = pdfDoc.addPage([width, height]);

      // Set background color
      if (template.backgroundColor && template.backgroundColor !== '#ffffff') {
        page.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: height,
          color: this.hexToRgb(template.backgroundColor),
        });
      }

      // Load fonts
      const fonts = {
        'Arial': await pdfDoc.embedFont(StandardFonts.Helvetica),
        'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
        'Times New Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
        'Courier New': await pdfDoc.embedFont(StandardFonts.Courier),
      };

      // Process template variables
      const processedData = this.processTemplateVariables(invoiceData);

      // Render elements
      for (const element of template.elements) {
        if (!element.visible) continue;

        await this.renderElement(page, element, processedData, fonts, options);
      }

      // Add special elements (items table, totals, etc.)
      await this.renderSpecialElements(page, template, invoiceData, fonts);

      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating PDF from template:', error);
      throw new Error('Failed to generate PDF from template: ' + error.message);
    }
  }

  /**
   * Render individual element on PDF page
   */
  async renderElement(page, element, data, fonts, options) {
    const font = fonts[element.fontFamily] || fonts['Arial'];
    const color = element.color ? this.hexToRgb(element.color) : rgb(0, 0, 0);

    switch (element.type) {
      case 'text':
        await this.renderTextElement(page, element, data, font, color);
        break;
        
      case 'rectangle':
        this.renderRectangleElement(page, element);
        break;
        
      case 'line':
        this.renderLineElement(page, element);
        break;
        
      case 'image':
        await this.renderImageElement(page, element, options);
        break;
        
      case 'signature':
        await this.renderSignatureElement(page, element, options);
        break;
    }
  }

  /**
   * Render text element with variable substitution
   */
  async renderTextElement(page, element, data, font, color) {
    let content = element.content || '';
    
    // Replace template variables
    content = content.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? value.toString() : match;
    });

    // Handle multi-line text
    const lines = content.split('\n');
    const lineHeight = (element.fontSize || 12) * 1.2;

    lines.forEach((line, index) => {
      const yPosition = element.y - (index * lineHeight);
      
      page.drawText(line, {
        x: this.getAlignedX(element, line, font),
        y: yPosition,
        size: element.fontSize || 12,
        font: font,
        color: color,
      });
    });
  }

  /**
   * Render rectangle element
   */
  renderRectangleElement(page, element) {
    const backgroundColor = element.backgroundColor 
      ? this.hexToRgb(element.backgroundColor) 
      : rgb(1, 1, 1);
    
    // Draw filled rectangle
    page.drawRectangle({
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      color: backgroundColor,
    });

    // Draw border if specified
    if (element.borderWidth && element.borderWidth > 0) {
      const borderColor = element.borderColor 
        ? this.hexToRgb(element.borderColor) 
        : rgb(0, 0, 0);

      page.drawRectangle({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        borderColor: borderColor,
        borderWidth: element.borderWidth,
      });
    }
  }

  /**
   * Render line element
   */
  renderLineElement(page, element) {
    const color = element.color ? this.hexToRgb(element.color) : rgb(0, 0, 0);
    
    page.drawLine({
      start: { x: element.x, y: element.y },
      end: { x: element.x + element.width, y: element.y },
      thickness: element.height || 1,
      color: color,
    });
  }

  /**
   * Render image element
   */
  async renderImageElement(page, element, options) {
    try {
      if (element.content && element.content.startsWith('data:image')) {
        // Handle base64 images
        const base64Data = element.content.split(',')[1];
        const imageBytes = Buffer.from(base64Data, 'base64');
        
        let image;
        if (element.content.includes('image/png')) {
          image = await page.doc.embedPng(imageBytes);
        } else if (element.content.includes('image/jpeg') || element.content.includes('image/jpg')) {
          image = await page.doc.embedJpg(imageBytes);
        }

        if (image) {
          page.drawImage(image, {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          });
        }
      } else if (options.logoPath && element.id === 'logo') {
        // Handle logo from file path
        const logoBytes = await fs.readFile(options.logoPath);
        const logoImage = await page.doc.embedPng(logoBytes);
        
        page.drawImage(logoImage, {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        });
      }
    } catch (error) {
      console.warn('Failed to render image element:', error.message);
    }
  }

  /**
   * Render signature element
   */
  async renderSignatureElement(page, element, options) {
    // Draw signature placeholder box
    page.drawRectangle({
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      borderDashArray: [3, 3],
    });

    // Add signature label
    const font = await page.doc.embedFont(StandardFonts.Helvetica);
    page.drawText(element.content || 'Authorized Signatory', {
      x: element.x + 10,
      y: element.y - 15,
      size: element.fontSize || 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // If signature image is provided, render it
    if (element.signatureImage) {
      try {
        const base64Data = element.signatureImage.split(',')[1];
        const imageBytes = Buffer.from(base64Data, 'base64');
        const signatureImage = await page.doc.embedPng(imageBytes);
        
        page.drawImage(signatureImage, {
          x: element.x + 5,
          y: element.y + 5,
          width: element.width - 10,
          height: element.height - 20,
        });
      } catch (error) {
        console.warn('Failed to render signature image:', error.message);
      }
    }
  }

  /**
   * Render special elements like items table
   */
  async renderSpecialElements(page, template, invoiceData, fonts) {
    const tableElement = template.elements.find(el => el.type === 'table');
    if (tableElement && tableElement.visible) {
      await this.renderItemsTable(page, tableElement, invoiceData, fonts);
    }

    // Render totals section
    await this.renderTotalsSection(page, template, invoiceData, fonts);
  }

  /**
   * Render items table
   */
  async renderItemsTable(page, tableElement, invoiceData, fonts) {
    const font = fonts['Arial'];
    const headerFont = fonts['Arial'];
    
    const headers = ['S.No', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount', 'Tax Rate', 'Tax Amount', 'Total'];
    const columnWidths = [40, 120, 60, 40, 60, 70, 60, 70, 70];
    
    let currentY = tableElement.y + tableElement.height - 25;
    let currentX = tableElement.x;

    // Draw table header
    page.drawRectangle({
      x: tableElement.x,
      y: currentY,
      width: tableElement.width,
      height: 25,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Header text
    currentX = tableElement.x;
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: currentX + 5,
        y: currentY + 8,
        size: 9,
        font: headerFont,
        color: rgb(1, 1, 1),
      });
      currentX += columnWidths[index];
    });

    currentY -= 25;

    // Draw items
    invoiceData.items.forEach((item, index) => {
      const itemTotal = item.quantity * item.rate;
      const taxAmount = (itemTotal * item.taxRate) / 100;
      const finalAmount = itemTotal + taxAmount;

      // Alternate row background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableElement.x,
          y: currentY,
          width: tableElement.width,
          height: 20,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

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

      currentX = tableElement.x;
      rowData.forEach((data, colIndex) => {
        page.drawText(data, {
          x: currentX + 5,
          y: currentY + 6,
          size: 8,
          font: font,
          color: rgb(0, 0, 0),
        });
        currentX += columnWidths[colIndex];
      });

      currentY -= 20;
    });

    // Draw table border
    page.drawRectangle({
      x: tableElement.x,
      y: currentY,
      width: tableElement.width,
      height: tableElement.height - (tableElement.y - currentY),
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 1,
    });
  }

  /**
   * Render totals section
   */
  async renderTotalsSection(page, template, invoiceData, fonts) {
    const font = fonts['Arial'];
    
    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    invoiceData.items.forEach(item => {
      const itemTotal = item.quantity * item.rate;
      const taxAmount = (itemTotal * item.taxRate) / 100;
      subtotal += itemTotal;
      totalTax += taxAmount;
    });

    const grandTotal = subtotal + totalTax;

    // Find totals area or use default position
    const totalsElement = template.elements.find(el => el.id === 'total-section');
    const x = totalsElement ? totalsElement.x : 350;
    const y = totalsElement ? totalsElement.y : 400;

    // Draw totals
    const totalsData = [
      { label: 'Subtotal:', value: `₹${subtotal.toFixed(2)}` },
      { label: 'Tax:', value: `₹${totalTax.toFixed(2)}` },
      { label: 'Grand Total:', value: `₹${grandTotal.toFixed(2)}`, bold: true },
    ];

    let currentY = y + 60;
    totalsData.forEach(total => {
      page.drawText(total.label, {
        x: x + 10,
        y: currentY,
        size: total.bold ? 12 : 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(total.value, {
        x: x + 120,
        y: currentY,
        size: total.bold ? 12 : 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      currentY -= 20;
    });

    // Draw grand total box
    if (totalsData[2]) {
      page.drawRectangle({
        x: x,
        y: currentY + 15,
        width: 180,
        height: 25,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText('Grand Total: ' + totalsData[2].value, {
        x: x + 10,
        y: currentY + 25,
        size: 12,
        font: font,
        color: rgb(1, 1, 1),
      });
    }
  }

  // Helper methods

  processTemplateVariables(invoiceData) {
    return {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: new Date(invoiceData.date).toLocaleDateString('en-IN'),
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString('en-IN') : '',
      
      company: {
        name: invoiceData.company.name,
        address: invoiceData.company.address,
        gstin: invoiceData.company.gstin,
        phone: invoiceData.company.phone || '',
        email: invoiceData.company.email || '',
      },
      
      customer: {
        name: invoiceData.customer.name,
        address: invoiceData.customer.address,
        gstin: invoiceData.customer.gstin || '',
        phone: invoiceData.customer.phone || '',
        email: invoiceData.customer.email || '',
      },
      
      items: invoiceData.items,
      
      totals: this.calculateTotals(invoiceData.items),
      
      notes: invoiceData.notes || '',
      terms: invoiceData.terms || 'Payment is due within 30 days.',
    };
  }

  calculateTotals(items) {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.rate;
      const taxAmount = (itemTotal * item.taxRate) / 100;
      subtotal += itemTotal;
      totalTax += taxAmount;
    });

    return {
      subtotal: subtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      grandTotal: (subtotal + totalTax).toFixed(2),
    };
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  getAlignedX(element, text, font) {
    const textWidth = font.widthOfTextAtSize(text, element.fontSize || 12);
    
    switch (element.alignment) {
      case 'center':
        return element.x + (element.width - textWidth) / 2;
      case 'right':
        return element.x + element.width - textWidth;
      default:
        return element.x;
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ) : rgb(0, 0, 0);
  }
}

export default TemplateBasedPDFGenerator;