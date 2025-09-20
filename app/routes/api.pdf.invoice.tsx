import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PDFGenerator } from "../services/pdf.server";
import { getInvoice } from "../models/Invoice.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const invoiceId = formData.get("invoiceId") as string;
    const action = formData.get("_action") as string;

    if (action === "download") {
      // Single invoice download
      const invoice = await getInvoice(invoiceId, shop);
      if (!invoice) {
        return new Response("Invoice not found", { status: 404 });
      }

      // Load seller settings
      const settingsRes = await import("../models/AppSettings.server");
      const { getAppSettings } = settingsRes as any;
      const settings = await getAppSettings(shop);
      const sellerAddress = settings?.sellerAddress ? JSON.parse(settings.sellerAddress) : {
        address1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      };

      // Convert invoice data to PDF format
      const pdfData = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt).toLocaleDateString('en-IN'),
        customerName: invoice.customerName,
        customerGSTIN: invoice.customerGSTIN,
        billingAddress: invoice.billingAddress,
        shippingAddress: invoice.shippingAddress,
        sellerName: settings?.sellerName || "",
        sellerGSTIN: invoice.sellerGSTIN,
        sellerAddress,
        items: invoice.items.map(item => ({
          description: item.description,
          hsnCode: item.hsnCode || "998314", // Default HSN for services
          quantity: item.quantity,
          unit: item.unit || "NOS",
          rate: item.rate,
          discount: item.discount || 0,
          taxableValue: item.taxableValue,
          cgstRate: item.cgst > 0 ? (item.gstRate / 2) : 0,
          cgstAmount: item.cgst || 0,
          sgstRate: item.sgst > 0 ? (item.gstRate / 2) : 0,
          sgstAmount: item.sgst || 0,
          igstRate: item.igst > 0 ? item.gstRate : 0,
          igstAmount: item.igst || 0,
        })),
        totalTaxableValue: invoice.taxableValue,
        totalCGST: invoice.cgst,
        totalSGST: invoice.sgst,
        totalIGST: invoice.igst,
        totalInvoiceValue: invoice.totalValue,
        placeOfSupply: invoice.placeOfSupply,
        reverseCharge: invoice.reverseCharge || false,
      };

      const pdfBuffer = await PDFGenerator.generateGSTInvoice(pdfData);

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    }

    if (action === "bulk") {
      // Bulk invoice download
      const invoiceIds = JSON.parse(formData.get("invoiceIds") as string);
      const invoices = [];

      // Load seller settings once
      const settingsRes = await import("../models/AppSettings.server");
      const { getAppSettings } = settingsRes as any;
      const settings = await getAppSettings(shop);
      const sellerAddress = settings?.sellerAddress ? JSON.parse(settings.sellerAddress) : {
        address1: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      };

      for (const id of invoiceIds) {
        const invoice = await getInvoice(id, shop);
        if (invoice) {
          invoices.push({
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: new Date(invoice.createdAt).toLocaleDateString('en-IN'),
            customerName: invoice.customerName,
            customerGSTIN: invoice.customerGSTIN,
            billingAddress: invoice.billingAddress,
            shippingAddress: invoice.shippingAddress,
            sellerName: settings?.sellerName || "",
            sellerGSTIN: invoice.sellerGSTIN,
            sellerAddress,
            items: invoice.items.map(item => ({
              description: item.description,
              hsnCode: item.hsnCode || "998314",
              quantity: item.quantity,
              unit: item.unit || "NOS",
              rate: item.rate,
              discount: item.discount || 0,
              taxableValue: item.taxableValue,
              cgstRate: item.cgst > 0 ? (item.gstRate / 2) : 0,
              cgstAmount: item.cgst || 0,
              sgstRate: item.sgst > 0 ? (item.gstRate / 2) : 0,
              sgstAmount: item.sgst || 0,
              igstRate: item.igst > 0 ? item.gstRate : 0,
              igstAmount: item.igst || 0,
            })),
            totalTaxableValue: invoice.taxableValue,
            totalCGST: invoice.cgst,
            totalSGST: invoice.sgst,
            totalIGST: invoice.igst,
            totalInvoiceValue: invoice.totalValue,
            placeOfSupply: invoice.placeOfSupply,
            reverseCharge: invoice.reverseCharge || false,
          });
        }
      }

      const pdfBuffer = await PDFGenerator.generateBulkInvoices(invoices);

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bulk-invoices-${Date.now()}.pdf"`,
        },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Internal server error", { status: 500 });
  }
};