import React, { useRef, useEffect, useState } from 'react';
import { Card, Button, ButtonGroup, Stack, Text, Spinner, Banner } from '@shopify/polaris';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFEditorProps {
  pdfUrl?: string;
  pdfData?: Uint8Array;
  onSave?: (pdfData: Uint8Array) => void;
  onAnnotationAdd?: (annotation: any) => void;
  enableAnnotations?: boolean;
  enableSignature?: boolean;
  enableFormFilling?: boolean;
  readOnly?: boolean;
}

interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'rectangle' | 'signature';
  pageIndex: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: { r: number; g: number; b: number };
  fontSize?: number;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({
  pdfUrl,
  pdfData,
  onSave,
  onAnnotationAdd,
  enableAnnotations = true,
  enableSignature = true,
  enableFormFilling = true,
  readOnly = false,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  
  const signatureRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pdfUrl || pdfData) {
      setIsLoading(false);
    }
  }, [pdfUrl, pdfData]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError('');
  };

  const onDocumentLoadError = (error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  };

  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || selectedTool === 'select') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}`,
      type: selectedTool as any,
      pageIndex: currentPage - 1,
      x,
      y,
      color: { r: 1, g: 0, b: 0 },
    };

    switch (selectedTool) {
      case 'text':
        const text = prompt('Enter text:');
        if (text) {
          newAnnotation.content = text;
          newAnnotation.fontSize = 12;
          addAnnotation(newAnnotation);
        }
        break;
      
      case 'highlight':
        newAnnotation.width = 100;
        newAnnotation.height = 20;
        newAnnotation.color = { r: 1, g: 1, b: 0 };
        addAnnotation(newAnnotation);
        break;
      
      case 'rectangle':
        newAnnotation.width = 100;
        newAnnotation.height = 50;
        newAnnotation.color = { r: 0, g: 0, b: 1 };
        addAnnotation(newAnnotation);
        break;
    }
  };

  const addAnnotation = (annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
    onAnnotationAdd?.(annotation);
  };

  const handleSignatureSave = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      const newAnnotation: Annotation = {
        id: `signature-${Date.now()}`,
        type: 'signature',
        pageIndex: currentPage - 1,
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        content: signatureData,
      };
      
      addAnnotation(newAnnotation);
      setShowSignaturePad(false);
      signatureRef.current.clear();
    }
  };

  const handleSave = async () => {
    try {
      // In a real implementation, you would send annotations to the server
      // to be applied to the PDF using the EnhancedPDFEditor service
      const response = await fetch('/api/pdf/add-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfUrl: pdfUrl,
          annotations: annotations,
        }),
      });

      if (response.ok) {
        const pdfBlob = await response.blob();
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const pdfUint8Array = new Uint8Array(pdfArrayBuffer);
        onSave?.(pdfUint8Array);
      } else {
        throw new Error('Failed to save PDF');
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
      setError('Failed to save PDF');
    }
  };

  const renderAnnotations = () => {
    return annotations
      .filter(annotation => annotation.pageIndex === currentPage - 1)
      .map(annotation => (
        <div
          key={annotation.id}
          style={{
            position: 'absolute',
            left: annotation.x * scale,
            top: annotation.y * scale,
            width: annotation.width ? annotation.width * scale : 'auto',
            height: annotation.height ? annotation.height * scale : 'auto',
            backgroundColor: annotation.type === 'highlight' 
              ? `rgba(${annotation.color?.r * 255}, ${annotation.color?.g * 255}, ${annotation.color?.b * 255}, 0.3)`
              : 'transparent',
            border: annotation.type === 'rectangle' 
              ? `2px solid rgb(${annotation.color?.r * 255}, ${annotation.color?.g * 255}, ${annotation.color?.b * 255})`
              : 'none',
            color: annotation.type === 'text' 
              ? `rgb(${annotation.color?.r * 255}, ${annotation.color?.g * 255}, ${annotation.color?.b * 255})`
              : 'transparent',
            fontSize: annotation.fontSize ? annotation.fontSize * scale : 12,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {annotation.type === 'text' && annotation.content}
          {annotation.type === 'signature' && annotation.content && (
            <img 
              src={annotation.content} 
              alt="Signature" 
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      ));
  };

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Spinner size="large" />
          <Text variant="bodyMd" as="p">Loading PDF...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Banner status="critical">
          <p>{error}</p>
        </Banner>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      {!readOnly && (
        <Card>
          <div style={{ padding: '1rem' }}>
            <Stack distribution="equalSpacing" alignment="center">
              <Stack>
                <ButtonGroup segmented>
                  <Button
                    pressed={selectedTool === 'select'}
                    onClick={() => setSelectedTool('select')}
                  >
                    Select
                  </Button>
                  {enableAnnotations && (
                    <>
                      <Button
                        pressed={selectedTool === 'text'}
                        onClick={() => setSelectedTool('text')}
                      >
                        Text
                      </Button>
                      <Button
                        pressed={selectedTool === 'highlight'}
                        onClick={() => setSelectedTool('highlight')}
                      >
                        Highlight
                      </Button>
                      <Button
                        pressed={selectedTool === 'rectangle'}
                        onClick={() => setSelectedTool('rectangle')}
                      >
                        Rectangle
                      </Button>
                    </>
                  )}
                  {enableSignature && (
                    <Button onClick={() => setShowSignaturePad(true)}>
                      Add Signature
                    </Button>
                  )}
                </ButtonGroup>
              </Stack>

              <Stack>
                <ButtonGroup>
                  <Button onClick={() => setScale(scale - 0.1)} disabled={scale <= 0.5}>
                    Zoom Out
                  </Button>
                  <Text variant="bodyMd" as="span">
                    {Math.round(scale * 100)}%
                  </Text>
                  <Button onClick={() => setScale(scale + 0.1)} disabled={scale >= 3}>
                    Zoom In
                  </Button>
                </ButtonGroup>
              </Stack>

              <Stack>
                <Button primary onClick={handleSave}>
                  Save PDF
                </Button>
              </Stack>
            </Stack>
          </div>
        </Card>
      )}

      {/* PDF Viewer */}
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <div 
            ref={containerRef}
            style={{ position: 'relative', display: 'inline-block' }}
            onClick={handlePageClick}
          >
            <Document
              file={pdfUrl || pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<Spinner size="large" />}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
            {renderAnnotations()}
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <Card>
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <Stack distribution="center" alignment="center">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Text variant="bodyMd" as="span">
              Page {currentPage} of {numPages}
            </Text>
            <Button
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
            >
              Next
            </Button>
          </Stack>
        </div>
      </Card>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <Card>
            <div style={{ padding: '2rem', width: '500px' }}>
              <Stack vertical>
                <Text variant="headingMd" as="h3">
                  Add Your Signature
                </Text>
                <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 450,
                      height: 200,
                      style: { border: 'none' }
                    }}
                  />
                </div>
                <Stack distribution="trailing">
                  <Button onClick={() => signatureRef.current?.clear()}>
                    Clear
                  </Button>
                  <Button onClick={() => setShowSignaturePad(false)}>
                    Cancel
                  </Button>
                  <Button primary onClick={handleSignatureSave}>
                    Add Signature
                  </Button>
                </Stack>
              </Stack>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PDFEditor;