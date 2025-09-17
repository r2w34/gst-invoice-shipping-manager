import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

export class PDFGenerator {
  constructor() {
    this.doc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 20;
  }

  // Initialize new PDF document
  initDocument() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    return this.doc;
  }

  // Generate GST Invoice PDF
  async generateInvoicePDF(invoiceData, settings) {
    this.initDocument();
    
    // Header with company logo and details
    this.addInvoiceHeader(settings);
    
    // Invoice details
    this.addInvoiceDetails(invoiceData);
    
    // Customer details
    this.addCustomerDetails(invoiceData);
    
    // Items table
    this.addItemsTable(invoiceData.items);
    
    // Tax calculations
    this.addTaxCalculations(invoiceData);
    
    // Footer with terms and signature
    this.addInvoiceFooter(settings);
    
    return this.doc.output('arraybuffer');
  }

  // Generate Shipping Label PDF
  async generateShippingLabelPDF(labelData) {
    this.initDocument();
    
    // Set smaller page size for label (100mm x 150mm)
    this.doc = new jsPDF('p', 'mm', [100, 150]);
    this.pageWidth = 100;
    this.pageHeight = 150;
    this.margin = 5;
    
    // Add label content
    await this.addLabelHeader(labelData);
    await this.addLabelAddresses(labelData);
    await this.addLabelBarcodes(labelData);
    
    return this.doc.output('arraybuffer');
  }

  // Invoice Header
  addInvoiceHeader(settings) {
    const doc = this.doc;
    
    // Company name
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(settings.companyName || 'Your Company Name', this.margin, 30);
    
    // Company address
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const address = [
      settings.address || 'Company Address',
      settings.city || 'City',
      `${settings.state || 'State'} - ${settings.pincode || 'PIN'}`,
      `GSTIN: ${settings.gstin || 'GSTIN Number'}`
    ];
    
    let yPos = 40;
    address.forEach(line => {
      doc.text(line, this.margin, yPos);
      yPos += 5;
    });
    
    // Invoice title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('TAX INVOICE', this.pageWidth - this.margin - 40, 30);
    
    // Draw line
    doc.line(this.margin, 65, this.pageWidth - this.margin, 65);
  }

  // Invoice Details
  addInvoiceDetails(invoiceData) {
    const doc = this.doc;
    let yPos = 75;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    
    // Left side - Invoice details
    doc.text('Invoice No:', this.margin, yPos);
    doc.text('Invoice Date:', this.margin, yPos + 7);
    doc.text('Place of Supply:', this.margin, yPos + 14);
    
    doc.setFont(undefined, 'normal');
    doc.text(invoiceData.invoiceNumber, this.margin + 30, yPos);
    doc.text(new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN'), this.margin + 30, yPos + 7);
    doc.text(invoiceData.placeOfSupply, this.margin + 30, yPos + 14);
    
    // Right side - Order details
    doc.setFont(undefined, 'bold');
    doc.text('Order ID:', this.pageWidth - 80, yPos);
    doc.text('Order Date:', this.pageWidth - 80, yPos + 7);
    
    doc.setFont(undefined, 'normal');
    doc.text(invoiceData.orderId || 'N/A', this.pageWidth - 50, yPos);
    doc.text(invoiceData.orderDate ? new Date(invoiceData.orderDate).toLocaleDateString('en-IN') : 'N/A', this.pageWidth - 50, yPos + 7);
  }

  // Customer Details
  addCustomerDetails(invoiceData) {
    const doc = this.doc;
    let yPos = 105;
    
    // Bill to section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', this.margin, yPos);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    yPos += 10;
    
    const billTo = [
      invoiceData.customerName,
      invoiceData.billingAddress?.address1 || '',
      invoiceData.billingAddress?.address2 || '',
      `${invoiceData.billingAddress?.city || ''} - ${invoiceData.billingAddress?.pincode || ''}`,
      invoiceData.billingAddress?.state || '',
      invoiceData.customerGstin ? `GSTIN: ${invoiceData.customerGstin}` : ''
    ].filter(line => line.trim());
    
    billTo.forEach(line => {
      doc.text(line, this.margin, yPos);
      yPos += 5;
    });
    
    // Ship to section (if different)
    if (invoiceData.shippingAddress && 
        JSON.stringify(invoiceData.billingAddress) !== JSON.stringify(invoiceData.shippingAddress)) {
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Ship To:', this.pageWidth/2 + 10, 115);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      let shipYPos = 125;
      
      const shipTo = [
        invoiceData.shippingAddress.name || invoiceData.customerName,
        invoiceData.shippingAddress.address1 || '',
        invoiceData.shippingAddress.address2 || '',
        `${invoiceData.shippingAddress.city || ''} - ${invoiceData.shippingAddress.pincode || ''}`,
        invoiceData.shippingAddress.state || ''
      ].filter(line => line.trim());
      
      shipTo.forEach(line => {
        doc.text(line, this.pageWidth/2 + 10, shipYPos);
        shipYPos += 5;
      });
    }
  }

  // Items Table
  addItemsTable(items) {
    const doc = this.doc;
    let yPos = 170;
    
    // Table headers
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    
    const headers = ['S.No', 'Description', 'HSN', 'Qty', 'Rate', 'Amount'];
    const colWidths = [15, 60, 20, 15, 25, 25];
    let xPos = this.margin;
    
    // Draw header background
    doc.setFillColor(240, 240, 240);
    doc.rect(this.margin, yPos - 5, this.pageWidth - 2 * this.margin, 10, 'F');
    
    headers.forEach((header, index) => {
      doc.text(header, xPos + 2, yPos);
      xPos += colWidths[index];
    });
    
    yPos += 10;
    
    // Table rows
    doc.setFont(undefined, 'normal');
    items.forEach((item, index) => {
      xPos = this.margin;
      
      const rowData = [
        (index + 1).toString(),
        item.description || item.name,
        item.hsnCode || '',
        item.quantity.toString(),
        `₹${item.rate.toFixed(2)}`,
        `₹${(item.quantity * item.rate).toFixed(2)}`
      ];
      
      rowData.forEach((data, colIndex) => {
        doc.text(data, xPos + 2, yPos);
        xPos += colWidths[colIndex];
      });
      
      yPos += 7;
      
      // Add new page if needed
      if (yPos > this.pageHeight - 50) {
        doc.addPage();
        yPos = 30;
      }
    });
    
    // Draw table borders
    this.drawTableBorders(170, items.length + 1, colWidths);
  }

  // Tax Calculations
  addTaxCalculations(invoiceData) {
    const doc = this.doc;
    let yPos = 170 + (invoiceData.items.length + 1) * 7 + 20;
    
    // Ensure we don't go off page
    if (yPos > this.pageHeight - 60) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    
    const calculations = [
      ['Subtotal:', `₹${invoiceData.subtotal.toFixed(2)}`],
      ['Discount:', `₹${(invoiceData.discount || 0).toFixed(2)}`],
      ['Taxable Amount:', `₹${invoiceData.taxableAmount.toFixed(2)}`]
    ];
    
    // Add tax breakdown
    if (invoiceData.cgst > 0) {
      calculations.push([`CGST (${invoiceData.cgstRate}%):`, `₹${invoiceData.cgst.toFixed(2)}`]);
      calculations.push([`SGST (${invoiceData.sgstRate}%):`, `₹${invoiceData.sgst.toFixed(2)}`]);
    }
    if (invoiceData.igst > 0) {
      calculations.push([`IGST (${invoiceData.igstRate}%):`, `₹${invoiceData.igst.toFixed(2)}`]);
    }
    
    calculations.push(['Total Amount:', `₹${invoiceData.totalValue.toFixed(2)}`]);
    
    // Right align calculations
    calculations.forEach(([label, value]) => {
      doc.text(label, this.pageWidth - 80, yPos);
      doc.text(value, this.pageWidth - this.margin, yPos, { align: 'right' });
      yPos += 7;
    });
    
    // Amount in words
    yPos += 10;
    doc.setFont(undefined, 'normal');
    doc.text('Amount in Words:', this.margin, yPos);
    doc.text(this.numberToWords(invoiceData.totalValue), this.margin, yPos + 7);
  }

  // Invoice Footer
  addInvoiceFooter(settings) {
    const doc = this.doc;
    const yPos = this.pageHeight - 40;
    
    // Terms and conditions
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Terms & Conditions:', this.margin, yPos);
    doc.text(settings.termsAndConditions || 'Payment due within 30 days.', this.margin, yPos + 5);
    
    // Signature
    doc.setFont(undefined, 'bold');
    doc.text('For ' + (settings.companyName || 'Your Company'), this.pageWidth - 60, yPos + 10);
    doc.text('Authorized Signatory', this.pageWidth - 60, yPos + 25);
  }

  // Shipping Label Header
  async addLabelHeader(labelData) {
    const doc = this.doc;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('SHIPPING LABEL', this.pageWidth/2, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Order: ${labelData.orderId}`, this.margin, 25);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, this.margin, 30);
  }

  // Label Addresses
  async addLabelAddresses(labelData) {
    const doc = this.doc;
    let yPos = 40;
    
    // From address
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('FROM:', this.margin, yPos);
    
    doc.setFont(undefined, 'normal');
    yPos += 5;
    const fromAddress = [
      labelData.fromName || 'Sender Name',
      labelData.fromAddress || 'Sender Address',
      `${labelData.fromCity || 'City'} - ${labelData.fromPincode || 'PIN'}`,
      labelData.fromPhone || 'Phone'
    ];
    
    fromAddress.forEach(line => {
      doc.text(line, this.margin, yPos);
      yPos += 4;
    });
    
    yPos += 5;
    
    // To address
    doc.setFont(undefined, 'bold');
    doc.text('TO:', this.margin, yPos);
    
    doc.setFont(undefined, 'normal');
    yPos += 5;
    const toAddress = [
      labelData.customerName,
      labelData.shippingAddress?.address1 || '',
      labelData.shippingAddress?.address2 || '',
      `${labelData.shippingAddress?.city || ''} - ${labelData.shippingAddress?.pincode || ''}`,
      labelData.shippingAddress?.phone || ''
    ].filter(line => line.trim());
    
    toAddress.forEach(line => {
      doc.text(line, this.margin, yPos);
      yPos += 4;
    });
  }

  // Label Barcodes
  async addLabelBarcodes(labelData) {
    const doc = this.doc;
    let yPos = 100;
    
    try {
      // Generate tracking barcode
      if (labelData.trackingId) {
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: labelData.trackingId,
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: 'center',
        });
        
        // Convert buffer to base64 and add to PDF
        const barcodeBase64 = `data:image/png;base64,${barcodeBuffer.toString('base64')}`;
        doc.addImage(barcodeBase64, 'PNG', this.margin, yPos, 60, 15);
        yPos += 20;
      }
      
      // Generate QR code with tracking URL
      if (labelData.trackingUrl) {
        const qrCodeDataUrl = await QRCode.toDataURL(labelData.trackingUrl, {
          width: 100,
          margin: 1,
        });
        
        doc.addImage(qrCodeDataUrl, 'PNG', this.margin, yPos, 20, 20);
        
        doc.setFontSize(6);
        doc.text('Scan for tracking', this.margin + 25, yPos + 10);
      }
      
    } catch (error) {
      console.error('Error generating barcodes:', error);
      // Fallback text
      doc.setFontSize(8);
      doc.text(`Tracking: ${labelData.trackingId || 'N/A'}`, this.margin, yPos);
    }
  }

  // Helper method to draw table borders
  drawTableBorders(startY, rows, colWidths) {
    const doc = this.doc;
    let xPos = this.margin;
    const tableHeight = rows * 7;
    
    // Vertical lines
    colWidths.forEach(width => {
      doc.line(xPos, startY - 5, xPos, startY + tableHeight + 5);
      xPos += width;
    });
    doc.line(xPos, startY - 5, xPos, startY + tableHeight + 5); // Last vertical line
    
    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = startY - 5 + (i * 7);
      doc.line(this.margin, y, this.pageWidth - this.margin, y);
    }
  }

  // Convert number to words (Indian format)
  numberToWords(amount) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (num) => {
      let result = '';
      if (num > 99) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num > 19) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num > 9) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };
    
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    
    let result = '';
    
    if (rupees === 0) {
      result = 'Zero Rupees';
    } else {
      const crores = Math.floor(rupees / 10000000);
      const lakhs = Math.floor((rupees % 10000000) / 100000);
      const thousands = Math.floor((rupees % 100000) / 1000);
      const hundreds = rupees % 1000;
      
      if (crores > 0) result += convertHundreds(crores) + 'Crore ';
      if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
      if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
      if (hundreds > 0) result += convertHundreds(hundreds);
      
      result += 'Rupees';
    }
    
    if (paise > 0) {
      result += ' and ' + convertHundreds(paise) + 'Paise';
    }
    
    return result + ' Only';
  }

  // Generate bulk PDFs as ZIP
  async generateBulkPDFs(items, type = 'invoice') {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    for (const item of items) {
      let pdfBuffer;
      let filename;
      
      if (type === 'invoice') {
        pdfBuffer = await this.generateInvoicePDF(item.data, item.settings);
        filename = `invoice_${item.data.invoiceNumber}.pdf`;
      } else if (type === 'label') {
        pdfBuffer = await this.generateShippingLabelPDF(item.data);
        filename = `label_${item.data.orderId}.pdf`;
      }
      
      zip.file(filename, pdfBuffer);
    }
    
    return await zip.generateAsync({ type: 'arraybuffer' });
  }
}

export default PDFGenerator;