import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

export interface GSTInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGSTIN?: string;
  billingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  sellerName: string;
  sellerGSTIN: string;
  sellerAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    discount?: number;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
  }>;
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalInvoiceValue: number;
  placeOfSupply: string;
  reverseCharge: boolean;
  transportationMode?: string;
  vehicleNumber?: string;
  dateOfSupply?: string;
  placeOfDelivery?: string;
}

export interface ShippingLabelData {
  orderName: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  trackingId?: string;
  courierPartner?: string;
  codAmount?: number;
  fragile?: boolean;
  sellerName: string;
  sellerAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
  }>;
}

export class PDFGenerator {
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  private static formatAddress(address: any): string {
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.state,
      address.pincode,
      address.country
    ].filter(Boolean);
    return parts.join(', ');
  }

  static async generateGSTInvoice(data: GSTInvoiceData): Promise<Buffer> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let yPosition = 20;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const contentWidth = rightMargin - leftMargin;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Invoice details box
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.rect(leftMargin, yPosition, contentWidth, 25);
    
    // Left side - Invoice details
    doc.text(`Invoice No: ${data.invoiceNumber}`, leftMargin + 5, yPosition + 8);
    doc.text(`Invoice Date: ${data.invoiceDate}`, leftMargin + 5, yPosition + 15);
    doc.text(`Place of Supply: ${data.placeOfSupply}`, leftMargin + 5, yPosition + 22);
    
    // Right side - Reverse charge
    doc.text(`Reverse Charge: ${data.reverseCharge ? 'Yes' : 'No'}`, rightMargin - 50, yPosition + 8);
    
    yPosition += 30;

    // Seller and Buyer details
    const boxHeight = 40;
    
    // Seller details
    doc.rect(leftMargin, yPosition, contentWidth / 2, boxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text('Sold by:', leftMargin + 5, yPosition + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.sellerName, leftMargin + 5, yPosition + 15);
    doc.text(`GSTIN: ${data.sellerGSTIN}`, leftMargin + 5, yPosition + 22);
    
    const sellerAddressLines = doc.splitTextToSize(this.formatAddress(data.sellerAddress), (contentWidth / 2) - 10);
    doc.text(sellerAddressLines, leftMargin + 5, yPosition + 29);

    // Buyer details
    doc.rect(leftMargin + (contentWidth / 2), yPosition, contentWidth / 2, boxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text('Billing Address:', leftMargin + (contentWidth / 2) + 5, yPosition + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.customerName, leftMargin + (contentWidth / 2) + 5, yPosition + 15);
    if (data.customerGSTIN) {
      doc.text(`GSTIN: ${data.customerGSTIN}`, leftMargin + (contentWidth / 2) + 5, yPosition + 22);
    }
    
    const billingAddressLines = doc.splitTextToSize(this.formatAddress(data.billingAddress), (contentWidth / 2) - 10);
    doc.text(billingAddressLines, leftMargin + (contentWidth / 2) + 5, yPosition + (data.customerGSTIN ? 29 : 22));

    yPosition += boxHeight + 5;

    // Shipping address if different
    if (JSON.stringify(data.billingAddress) !== JSON.stringify(data.shippingAddress)) {
      doc.rect(leftMargin, yPosition, contentWidth, 25);
      doc.setFont('helvetica', 'bold');
      doc.text('Shipping Address:', leftMargin + 5, yPosition + 8);
      doc.setFont('helvetica', 'normal');
      const shippingAddressLines = doc.splitTextToSize(this.formatAddress(data.shippingAddress), contentWidth - 10);
      doc.text(shippingAddressLines, leftMargin + 5, yPosition + 15);
      yPosition += 30;
    }

    // Items table header
    const tableStartY = yPosition;
    const colWidths = [8, 50, 20, 15, 15, 20, 15, 15, 15, 15, 20];
    const colPositions = [leftMargin];
    for (let i = 1; i < colWidths.length; i++) {
      colPositions[i] = colPositions[i - 1] + colWidths[i - 1];
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    
    // Table header
    doc.rect(leftMargin, yPosition, contentWidth, 15);
    const headers = ['S.No', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc', 'Taxable', 'CGST', 'SGST', 'Amount'];
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index] + 2, yPosition + 10, { maxWidth: colWidths[index] - 4 });
    });
    
    yPosition += 15;

    // Items
    doc.setFont('helvetica', 'normal');
    data.items.forEach((item, index) => {
      const rowHeight = 12;
      doc.rect(leftMargin, yPosition, contentWidth, rowHeight);
      
      const rowData = [
        (index + 1).toString(),
        item.description,
        item.hsnCode,
        item.quantity.toString(),
        item.unit,
        this.formatCurrency(item.rate),
        item.discount ? this.formatCurrency(item.discount) : '-',
        this.formatCurrency(item.taxableValue),
        `${item.cgstRate}%\n${this.formatCurrency(item.cgstAmount)}`,
        `${item.sgstRate}%\n${this.formatCurrency(item.sgstAmount)}`,
        this.formatCurrency(item.taxableValue + item.cgstAmount + item.sgstAmount + item.igstAmount)
      ];

      rowData.forEach((data, colIndex) => {
        const lines = doc.splitTextToSize(data, colWidths[colIndex] - 4);
        doc.text(lines, colPositions[colIndex] + 2, yPosition + 8);
      });
      
      yPosition += rowHeight;
    });

    // Totals
    const totalsStartY = yPosition;
    doc.setFont('helvetica', 'bold');
    
    // Total row
    doc.rect(leftMargin, yPosition, contentWidth, 12);
    doc.text('Total', colPositions[1] + 2, yPosition + 8);
    doc.text(this.formatCurrency(data.totalTaxableValue), colPositions[7] + 2, yPosition + 8);
    doc.text(this.formatCurrency(data.totalCGST), colPositions[8] + 2, yPosition + 8);
    doc.text(this.formatCurrency(data.totalSGST), colPositions[9] + 2, yPosition + 8);
    doc.text(this.formatCurrency(data.totalInvoiceValue), colPositions[10] + 2, yPosition + 8);
    
    yPosition += 15;

    // Amount in words
    doc.rect(leftMargin, yPosition, contentWidth, 15);
    doc.text(`Total Invoice Value: ${this.formatCurrency(data.totalInvoiceValue)}`, leftMargin + 5, yPosition + 10);
    
    yPosition += 20;

    // Terms and conditions
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Terms & Conditions:', leftMargin, yPosition);
    yPosition += 5;
    doc.text('1. Goods once sold will not be taken back.', leftMargin, yPosition);
    yPosition += 4;
    doc.text('2. Interest @ 18% p.a. will be charged on delayed payment.', leftMargin, yPosition);
    yPosition += 4;
    doc.text('3. Subject to jurisdiction only.', leftMargin, yPosition);

    // Signature
    yPosition = pageHeight - 40;
    doc.text('For ' + data.sellerName, rightMargin - 60, yPosition);
    yPosition += 20;
    doc.text('Authorized Signatory', rightMargin - 60, yPosition);

    return Buffer.from(doc.output('arraybuffer'));
  }

  static async generateShippingLabel(data: ShippingLabelData): Promise<Buffer> {
    const doc = new jsPDF('p', 'mm', [100, 150]); // Custom size for shipping label
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let yPosition = 10;
    const margin = 5;

    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIPPING LABEL', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Order details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order: ${data.orderName}`, margin, yPosition);
    yPosition += 5;

    if (data.trackingId) {
      doc.text(`Tracking: ${data.trackingId}`, margin, yPosition);
      yPosition += 5;
    }

    // Separator line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // From address
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', margin, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(data.sellerName, margin, yPosition);
    yPosition += 4;
    
    const fromAddressLines = doc.splitTextToSize(this.formatAddress(data.sellerAddress), pageWidth - 2 * margin);
    doc.text(fromAddressLines, margin, yPosition);
    yPosition += fromAddressLines.length * 4 + 5;

    // To address
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', margin, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(data.customerName, margin, yPosition);
    yPosition += 4;
    
    if (data.customerPhone) {
      doc.text(`Ph: ${data.customerPhone}`, margin, yPosition);
      yPosition += 4;
    }
    
    const toAddressLines = doc.splitTextToSize(this.formatAddress(data.shippingAddress), pageWidth - 2 * margin);
    doc.text(toAddressLines, margin, yPosition);
    yPosition += toAddressLines.length * 4 + 5;

    // Package details
    doc.setFont('helvetica', 'bold');
    doc.text('PACKAGE DETAILS:', margin, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Weight: ${data.weight}kg`, margin, yPosition);
    yPosition += 4;

    if (data.dimensions) {
      doc.text(`Dimensions: ${data.dimensions.length}x${data.dimensions.width}x${data.dimensions.height}cm`, margin, yPosition);
      yPosition += 4;
    }

    if (data.codAmount) {
      doc.setFont('helvetica', 'bold');
      doc.text(`COD: ${this.formatCurrency(data.codAmount)}`, margin, yPosition);
      yPosition += 4;
    }

    if (data.fragile) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0);
      doc.text('FRAGILE - HANDLE WITH CARE', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 4;
    }

    // Items list
    if (data.items && data.items.length > 0) {
      yPosition += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('ITEMS:', margin, yPosition);
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      
      data.items.forEach(item => {
        doc.text(`• ${item.name} (${item.quantity})`, margin, yPosition);
        yPosition += 3;
      });
    }

    // Barcode for tracking ID
    if (data.trackingId) {
      try {
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: data.trackingId,
          scale: 2,
          height: 8,
          includetext: true,
          textxalign: 'center',
        });
        
        // Convert buffer to base64 and add to PDF
        const barcodeBase64 = `data:image/png;base64,${barcodeBuffer.toString('base64')}`;
        doc.addImage(barcodeBase64, 'PNG', margin, pageHeight - 25, pageWidth - 2 * margin, 15);
      } catch (error) {
        console.error('Error generating barcode:', error);
        // Fallback: just show tracking ID as text
        doc.setFont('helvetica', 'bold');
        doc.text(data.trackingId, pageWidth / 2, pageHeight - 15, { align: 'center' });
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  static async generateBulkInvoices(invoices: GSTInvoiceData[]): Promise<Buffer> {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < invoices.length; i++) {
      if (i > 0) {
        doc.addPage();
      }
      
      // Generate each invoice on a separate page
      const invoiceBuffer = await this.generateGSTInvoice(invoices[i]);
      // Note: This is a simplified approach. In a real implementation,
      // you'd need to properly merge the PDF pages
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  static async generateBulkLabels(labels: ShippingLabelData[]): Promise<Buffer> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const labelsPerPage = 4; // 2x2 grid
    const labelWidth = 100;
    const labelHeight = 75;
    
    for (let i = 0; i < labels.length; i++) {
      if (i > 0 && i % labelsPerPage === 0) {
        doc.addPage();
      }
      
      // Calculate position on page
      const row = Math.floor((i % labelsPerPage) / 2);
      const col = (i % labelsPerPage) % 2;
      const x = col * labelWidth;
      const y = row * labelHeight;
      
      // Generate label at specific position
      // Note: This is a simplified approach. In a real implementation,
      // you'd need to properly position each label
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}