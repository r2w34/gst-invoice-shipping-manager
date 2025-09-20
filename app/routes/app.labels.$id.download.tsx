import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShippingLabel } from "../models/ShippingLabel.server";
import { PDFGenerator } from "../services/pdf.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const id = params.id as string;

  if (!id) {
    return new Response("Label ID is required", { status: 400 });
  }

  const label = await getShippingLabel(id, shop);
  if (!label) {
    return new Response("Label not found", { status: 404 });
  }

  // Load seller settings lazily to avoid static import cycles
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
    items: label.items ? label.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
    })) : undefined,
  };

  const pdfBuffer = await PDFGenerator.generateShippingLabel(pdfData);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="label-${label.orderName || label.id}.pdf"`,
    },
  });
};
