import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PDFGenerator } from "../services/pdf.server";
import { getShippingLabel } from "../models/ShippingLabel.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const labelId = formData.get("labelId") as string;
    const action = formData.get("_action") as string;

    if (action === "download") {
      // Single label download
      const label = await getShippingLabel(labelId, shop);
      if (!label) {
        return new Response("Label not found", { status: 404 });
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
        country: "India",
      };

      // Convert label data to PDF format
      const pdfData = {
        orderName: label.orderName,
        customerName: label.customerName,
        customerPhone: label.customerPhone,
        shippingAddress: {
          address1: label.customerAddress?.address1,
          address2: label.customerAddress?.address2,
          city: label.customerAddress?.city,
          state: label.customerAddress?.province || label.customerAddress?.state,
          pincode: label.customerAddress?.zip || label.customerAddress?.pincode,
          country: label.customerAddress?.country || "India",
        },
        weight: label.weight,
        dimensions: label.dimensions ? {
          length: label.dimensions.length,
          width: label.dimensions.width,
          height: label.dimensions.height,
        } : undefined,
        trackingId: label.trackingId,
        courierPartner: label.courierPartner,
        codAmount: label.codAmount,
        fragile: label.fragile,
        sellerName: settings?.sellerName || "",
        sellerAddress,
        items: label.items ? label.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
        })) : undefined,
      };

      const pdfBuffer = await PDFGenerator.generateShippingLabel(pdfData);

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="label-${label.orderName}.pdf"`,
        },
      });
    }

    if (action === "bulk") {
      // Bulk label download
      const labelIds = JSON.parse(formData.get("labelIds") as string);
      const labels = [];

      for (const id of labelIds) {
        const label = await getShippingLabel(id, shop);
        if (label) {
          labels.push({
            orderName: label.orderName,
            customerName: label.customerName,
            customerPhone: label.customerPhone,
            shippingAddress: {
              address1: label.customerAddress?.address1,
              address2: label.customerAddress?.address2,
              city: label.customerAddress?.city,
              state: label.customerAddress?.province || label.customerAddress?.state,
              pincode: label.customerAddress?.zip || label.customerAddress?.pincode,
              country: label.customerAddress?.country || "India",
            },
            weight: label.weight,
            dimensions: label.dimensions ? {
              length: label.dimensions.length,
              width: label.dimensions.width,
              height: label.dimensions.height,
            } : undefined,
            trackingId: label.trackingId,
            courierPartner: label.courierPartner,
            codAmount: label.codAmount,
            fragile: label.fragile,
            sellerName: settings?.sellerName || "",
            sellerAddress,
            items: label.items ? label.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
            })) : undefined,
          });
        }
      }

      const pdfBuffer = await PDFGenerator.generateBulkLabels(labels);

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="bulk-labels-${Date.now()}.pdf"`,
        },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response("Internal server error", { status: 500 });
  }
};