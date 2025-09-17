import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { EnhancedPDFEditor } from '../services/EnhancedPDFEditor.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { pdfUrl, annotations } = await request.json();

    if (!pdfUrl || !annotations) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch the PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF');
    }

    const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

    // Add annotations using EnhancedPDFEditor
    const pdfEditor = new EnhancedPDFEditor();
    const annotatedPdfBytes = await pdfEditor.addAnnotations(pdfBytes, annotations);

    // Return the annotated PDF
    return new Response(annotatedPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="annotated-invoice.pdf"',
      },
    });
  } catch (error) {
    console.error('Error adding annotations to PDF:', error);
    return json({ error: 'Failed to add annotations to PDF' }, { status: 500 });
  }
};

export const loader = () => {
  return json({ error: 'Method not allowed' }, { status: 405 });
};