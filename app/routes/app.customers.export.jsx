import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server.js";
import { prisma } from "../shopify.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";

  const shop = await prisma.shop.findFirst({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  try {
    // Get customers with related data
    const customers = await prisma.customer.findMany({
      where: { shopId: shop.id },
      include: {
        invoices: {
          select: { totalAmount: true, status: true }
        },
        labels: {
          select: { id: true }
        },
        _count: {
          select: {
            invoices: true,
            labels: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Prepare export data
    const exportData = customers.map(customer => {
      const totalRevenue = customer.invoices.reduce((sum, invoice) => 
        sum + (invoice.status === 'paid' ? invoice.totalAmount : 0), 0
      );
      
      const pendingAmount = customer.invoices.reduce((sum, invoice) => 
        sum + (invoice.status === 'sent' ? invoice.totalAmount : 0), 0
      );

      return {
        'Customer ID': customer.id,
        'First Name': customer.firstName || '',
        'Last Name': customer.lastName || '',
        'Full Name': `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        'Email': customer.email || '',
        'Phone': customer.phone || '',
        'Address Line 1': customer.address1 || '',
        'Address Line 2': customer.address2 || '',
        'City': customer.city || '',
        'State': customer.state || '',
        'Pincode': customer.pincode || '',
        'Country': customer.country || '',
        'GSTIN': customer.gstin || '',
        'GSTIN Validated': customer.gstinValidated ? 'Yes' : 'No',
        'Tags': customer.tags || '',
        'Notes': customer.notes || '',
        'Total Invoices': customer._count.invoices,
        'Total Labels': customer._count.labels,
        'Total Revenue': totalRevenue,
        'Pending Amount': pendingAmount,
        'Created Date': customer.createdAt.toISOString().split('T')[0],
        'Last Updated': customer.updatedAt.toISOString().split('T')[0]
      };
    });

    if (format === "csv") {
      return generateCSV(exportData);
    } else if (format === "excel") {
      return generateExcel(exportData);
    } else {
      return json({ error: "Invalid format" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error exporting customers:", error);
    return json({ 
      error: "Failed to export customers" 
    }, { status: 500 });
  }
};

function generateCSV(data) {
  if (data.length === 0) {
    return new Response("No data to export", {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });

  const filename = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function generateExcel(data) {
  if (data.length === 0) {
    return new Response("No data to export", {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // For now, we'll generate a tab-separated file that Excel can open
  // In a production app, you'd use a library like xlsx or exceljs
  const headers = Object.keys(data[0]);
  
  let tsvContent = headers.join('\t') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape tabs and newlines in TSV
      if (typeof value === 'string') {
        return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
      }
      return value;
    });
    tsvContent += values.join('\t') + '\n';
  });

  const filename = `customers-export-${new Date().toISOString().split('T')[0]}.xlsx`;

  return new Response(tsvContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}