import React, { useState, useRef, useCallback } from 'react';
import {
  Card,
  Button,
  ButtonGroup,
  InlineStack,
  BlockStack,
  Text,
  TextField,
  Select,
  Checkbox,
  Banner,
  Modal,
  Tabs,
  Layout,
  FormLayout,
} from '@shopify/polaris';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface InvoiceElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'line' | 'rectangle' | 'logo' | 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  alignment?: 'left' | 'center' | 'right';
  visible?: boolean;
  locked?: boolean;
}

interface InvoiceTemplate {
  id: string;
  name: string;
  elements: InvoiceElement[];
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  backgroundColor: string;
}

interface InvoiceDesignerProps {
  template?: InvoiceTemplate;
  onSave?: (template: InvoiceTemplate) => void;
  onPreview?: (template: InvoiceTemplate) => void;
  readOnly?: boolean;
}

const defaultElements: InvoiceElement[] = [
  {
    id: 'company-name',
    type: 'text',
    x: 50,
    y: 50,
    width: 300,
    height: 40,
    content: 'Company Name',
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    color: '#000000',
    alignment: 'left',
    visible: true,
    locked: false,
  },
  {
    id: 'company-address',
    type: 'text',
    x: 50,
    y: 100,
    width: 300,
    height: 60,
    content: 'Company Address\nCity, State, PIN\nGSTIN: XXXXXXXXXX',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#666666',
    alignment: 'left',
    visible: true,
    locked: false,
  },
  {
    id: 'invoice-title',
    type: 'text',
    x: 400,
    y: 50,
    width: 150,
    height: 30,
    content: 'TAX INVOICE',
    fontSize: 18,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    color: '#cc0000',
    alignment: 'right',
    visible: true,
    locked: false,
  },
  {
    id: 'invoice-number',
    type: 'text',
    x: 400,
    y: 90,
    width: 150,
    height: 20,
    content: 'Invoice No: {invoiceNumber}',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    color: '#000000',
    alignment: 'right',
    visible: true,
    locked: false,
  },
  {
    id: 'invoice-date',
    type: 'text',
    x: 400,
    y: 115,
    width: 150,
    height: 20,
    content: 'Date: {invoiceDate}',
    fontSize: 10,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#000000',
    alignment: 'right',
    visible: true,
    locked: false,
  },
  {
    id: 'customer-info',
    type: 'rectangle',
    x: 50,
    y: 180,
    width: 500,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderColor: '#cccccc',
    borderWidth: 1,
    visible: true,
    locked: false,
  },
  {
    id: 'bill-to-label',
    type: 'text',
    x: 60,
    y: 190,
    width: 100,
    height: 20,
    content: 'Bill To:',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    color: '#000000',
    alignment: 'left',
    visible: true,
    locked: false,
  },
  {
    id: 'customer-details',
    type: 'text',
    x: 60,
    y: 215,
    width: 480,
    height: 40,
    content: '{customerName}\n{customerAddress}\nGSTIN: {customerGSTIN}',
    fontSize: 11,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#000000',
    alignment: 'left',
    visible: true,
    locked: false,
  },
  {
    id: 'items-table',
    type: 'table',
    x: 50,
    y: 280,
    width: 500,
    height: 200,
    visible: true,
    locked: false,
  },
  {
    id: 'total-section',
    type: 'rectangle',
    x: 350,
    y: 500,
    width: 200,
    height: 100,
    backgroundColor: '#ffffff',
    borderColor: '#000000',
    borderWidth: 1,
    visible: true,
    locked: false,
  },
  {
    id: 'signature-area',
    type: 'signature',
    x: 400,
    y: 650,
    width: 150,
    height: 80,
    content: 'Authorized Signatory',
    fontSize: 10,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    color: '#000000',
    alignment: 'center',
    visible: true,
    locked: false,
  },
];

export const InvoiceDesigner: React.FC<InvoiceDesignerProps> = ({
  template,
  onSave,
  onPreview,
  readOnly = false,
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate>(
    template || {
      id: 'default',
      name: 'Default Invoice Template',
      elements: defaultElements,
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 50, right: 50, bottom: 50, left: 50 },
      backgroundColor: '#ffffff',
    }
  );

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedElement, setDraggedElement] = useState<InvoiceElement | null>(null);
  const [isAddingElement, setIsAddingElement] = useState(false);
  const [newElementType, setNewElementType] = useState<string>('text');

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleElementSelect = (elementId: string) => {
    if (!readOnly) {
      setSelectedElement(elementId);
    }
  };

  const handleElementUpdate = (elementId: string, updates: Partial<InvoiceElement>) => {
    if (readOnly) return;

    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    }));
  };

  const handleElementMove = (elementId: string, x: number, y: number) => {
    if (readOnly) return;

    handleElementUpdate(elementId, { x, y });
  };

  const handleElementResize = (elementId: string, width: number, height: number) => {
    if (readOnly) return;

    handleElementUpdate(elementId, { width, height });
  };

  const handleAddElement = (type: string) => {
    if (readOnly) return;

    const newElement: InvoiceElement = {
      id: `element-${Date.now()}`,
      type: type as any,
      x: 100,
      y: 100,
      width: type === 'line' ? 200 : 150,
      height: type === 'line' ? 2 : 30,
      content: type === 'text' ? 'New Text' : undefined,
      fontSize: 12,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: '#000000',
      alignment: 'left',
      visible: true,
      locked: false,
    };

    setCurrentTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));

    setSelectedElement(newElement.id);
    setIsAddingElement(false);
  };

  const handleDeleteElement = (elementId: string) => {
    if (readOnly) return;

    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId),
    }));

    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  const handleDuplicateElement = (elementId: string) => {
    if (readOnly) return;

    const element = currentTemplate.elements.find(el => el.id === elementId);
    if (element) {
      const duplicatedElement: InvoiceElement = {
        ...element,
        id: `element-${Date.now()}`,
        x: element.x + 20,
        y: element.y + 20,
      };

      setCurrentTemplate(prev => ({
        ...prev,
        elements: [...prev.elements, duplicatedElement],
      }));
    }
  };

  const handleSave = () => {
    onSave?.(currentTemplate);
  };

  const handlePreview = () => {
    onPreview?.(currentTemplate);
    setShowPreview(true);
  };

  const renderElement = (element: InvoiceElement) => {
    const isSelected = selectedElement === element.id;
    const style: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontWeight: element.fontWeight,
      color: element.color,
      backgroundColor: element.backgroundColor,
      border: isSelected ? '2px dashed #007ace' : element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor}` : 'none',
      textAlign: element.alignment,
      cursor: readOnly ? 'default' : 'move',
      userSelect: 'none',
      display: element.visible ? 'block' : 'none',
      zIndex: isSelected ? 1000 : 1,
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (readOnly || element.locked) return;
      
      e.preventDefault();
      setSelectedElement(element.id);
      
      const startX = e.clientX - element.x;
      const startY = e.clientY - element.y;

      const handleMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        handleElementMove(element.id, Math.max(0, newX), Math.max(0, newY));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const content = element.content?.replace(/\{(\w+)\}/g, (match, key) => {
      // Replace template variables with sample data for preview
      const sampleData: Record<string, string> = {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: new Date().toLocaleDateString(),
        customerName: 'Sample Customer',
        customerAddress: 'Sample Address, City, State',
        customerGSTIN: '27AAAAA0000A1Z5',
      };
      return sampleData[key] || match;
    });

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={handleMouseDown}
            onClick={() => handleElementSelect(element.id)}
          >
            {content?.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
            {isSelected && !readOnly && (
              <div style={{
                position: 'absolute',
                top: -25,
                right: 0,
                display: 'flex',
                gap: '4px',
              }}>
                <button
                  style={{ fontSize: '12px', padding: '2px 6px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateElement(element.id);
                  }}
                >
                  Copy
                </button>
                <button
                  style={{ fontSize: '12px', padding: '2px 6px', color: 'red' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteElement(element.id);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );

      case 'rectangle':
        return (
          <div
            key={element.id}
            style={style}
            onMouseDown={handleMouseDown}
            onClick={() => handleElementSelect(element.id)}
          />
        );

      case 'line':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              borderTop: `${element.height}px solid ${element.color}`,
              height: 0,
            }}
            onMouseDown={handleMouseDown}
            onClick={() => handleElementSelect(element.id)}
          />
        );

      case 'table':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              border: '1px solid #ccc',
              backgroundColor: '#f9f9f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={handleMouseDown}
            onClick={() => handleElementSelect(element.id)}
          >
            <Text variant="bodyMd" as="span">Items Table</Text>
          </div>
        );

      case 'signature':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              border: '1px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={handleMouseDown}
            onClick={() => handleElementSelect(element.id)}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✍️</div>
            <Text variant="bodyMd" as="span">{element.content}</Text>
          </div>
        );

      default:
        return null;
    }
  };

  const selectedElementData = selectedElement 
    ? currentTemplate.elements.find(el => el.id === selectedElement)
    : null;

  const tabs = [
    { id: 'design', content: 'Design', panelID: 'design-panel' },
    { id: 'properties', content: 'Properties', panelID: 'properties-panel' },
    { id: 'settings', content: 'Settings', panelID: 'settings-panel' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar - Tools and Properties */}
      <div style={{ width: '300px', borderRight: '1px solid #e1e3e5', overflow: 'auto' }}>
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {/* Design Tab */}
            {selectedTab === 0 && (
              <div style={{ padding: '1rem' }}>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Add Elements</Text>
                  
                  <ButtonGroup segmented>
                    <Button onClick={() => handleAddElement('text')}>Text</Button>
                    <Button onClick={() => handleAddElement('rectangle')}>Box</Button>
                    <Button onClick={() => handleAddElement('line')}>Line</Button>
                  </ButtonGroup>
                  
                  <ButtonGroup segmented>
                    <Button onClick={() => handleAddElement('table')}>Table</Button>
                    <Button onClick={() => handleAddElement('signature')}>Signature</Button>
                  </ButtonGroup>

                  <Text variant="headingMd" as="h3">Elements</Text>
                  
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {currentTemplate.elements.map(element => (
                      <div
                        key={element.id}
                        style={{
                          padding: '8px',
                          border: selectedElement === element.id ? '2px solid #007ace' : '1px solid #e1e3e5',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          backgroundColor: selectedElement === element.id ? '#f0f8ff' : 'white',
                        }}
                        onClick={() => handleElementSelect(element.id)}
                      >
                        <InlineStack align="space-between">
                          <InlineStack align="center">
                            <Text variant="bodyMd" as="span">
                              {element.type} - {element.id}
                            </Text>
                          </InlineStack>
                          <Checkbox
                            checked={element.visible}
                            onChange={(checked) => handleElementUpdate(element.id, { visible: checked })}
                          />
                        </InlineStack>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              </div>
            )}

            {/* Properties Tab */}
            {selectedTab === 1 && selectedElementData && (
              <div style={{ padding: '1rem' }}>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Element Properties</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Content"
                      value={selectedElementData.content || ''}
                      onChange={(value) => handleElementUpdate(selectedElementData.id, { content: value })}
                      multiline={selectedElementData.type === 'text'}
                    />
                    
                    <TextField
                      label="X Position"
                      type="number"
                      value={selectedElementData.x.toString()}
                      onChange={(value) => handleElementUpdate(selectedElementData.id, { x: parseInt(value) || 0 })}
                    />
                    
                    <TextField
                      label="Y Position"
                      type="number"
                      value={selectedElementData.y.toString()}
                      onChange={(value) => handleElementUpdate(selectedElementData.id, { y: parseInt(value) || 0 })}
                    />
                    
                    <TextField
                      label="Width"
                      type="number"
                      value={selectedElementData.width.toString()}
                      onChange={(value) => handleElementUpdate(selectedElementData.id, { width: parseInt(value) || 0 })}
                    />
                    
                    <TextField
                      label="Height"
                      type="number"
                      value={selectedElementData.height.toString()}
                      onChange={(value) => handleElementUpdate(selectedElementData.id, { height: parseInt(value) || 0 })}
                    />

                    {selectedElementData.type === 'text' && (
                      <>
                        <TextField
                          label="Font Size"
                          type="number"
                          value={selectedElementData.fontSize?.toString() || '12'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { fontSize: parseInt(value) || 12 })}
                        />
                        
                        <Select
                          label="Font Family"
                          options={[
                            { label: 'Arial', value: 'Arial' },
                            { label: 'Helvetica', value: 'Helvetica' },
                            { label: 'Times New Roman', value: 'Times New Roman' },
                            { label: 'Courier New', value: 'Courier New' },
                          ]}
                          value={selectedElementData.fontFamily || 'Arial'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { fontFamily: value })}
                        />
                        
                        <Select
                          label="Font Weight"
                          options={[
                            { label: 'Normal', value: 'normal' },
                            { label: 'Bold', value: 'bold' },
                          ]}
                          value={selectedElementData.fontWeight || 'normal'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { fontWeight: value as any })}
                        />
                        
                        <Select
                          label="Alignment"
                          options={[
                            { label: 'Left', value: 'left' },
                            { label: 'Center', value: 'center' },
                            { label: 'Right', value: 'right' },
                          ]}
                          value={selectedElementData.alignment || 'left'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { alignment: value as any })}
                        />
                      </>
                    )}

                    <TextField
                      label="Text Color"
                      value={selectedElementData.color || '#000000'}
                      onChange={(value) => handleElementUpdate(selectedElementData.id, { color: value })}
                    />

                    {(selectedElementData.type === 'rectangle' || selectedElementData.type === 'table') && (
                      <>
                        <TextField
                          label="Background Color"
                          value={selectedElementData.backgroundColor || '#ffffff'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { backgroundColor: value })}
                        />
                        
                        <TextField
                          label="Border Color"
                          value={selectedElementData.borderColor || '#000000'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { borderColor: value })}
                        />
                        
                        <TextField
                          label="Border Width"
                          type="number"
                          value={selectedElementData.borderWidth?.toString() || '1'}
                          onChange={(value) => handleElementUpdate(selectedElementData.id, { borderWidth: parseInt(value) || 1 })}
                        />
                      </>
                    )}

                    <Checkbox
                      label="Visible"
                      checked={selectedElementData.visible}
                      onChange={(checked) => handleElementUpdate(selectedElementData.id, { visible: checked })}
                    />
                    
                    <Checkbox
                      label="Locked"
                      checked={selectedElementData.locked}
                      onChange={(checked) => handleElementUpdate(selectedElementData.id, { locked: checked })}
                    />
                  </FormLayout>
                </BlockStack>
              </div>
            )}

            {/* Settings Tab */}
            {selectedTab === 2 && (
              <div style={{ padding: '1rem' }}>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Template Settings</Text>
                  
                  <FormLayout>
                    <TextField
                      label="Template Name"
                      value={currentTemplate.name}
                      onChange={(value) => setCurrentTemplate(prev => ({ ...prev, name: value }))}
                    />
                    
                    <Select
                      label="Page Size"
                      options={[
                        { label: 'A4', value: 'A4' },
                        { label: 'Letter', value: 'Letter' },
                      ]}
                      value={currentTemplate.pageSize}
                      onChange={(value) => setCurrentTemplate(prev => ({ ...prev, pageSize: value as any }))}
                    />
                    
                    <Select
                      label="Orientation"
                      options={[
                        { label: 'Portrait', value: 'portrait' },
                        { label: 'Landscape', value: 'landscape' },
                      ]}
                      value={currentTemplate.orientation}
                      onChange={(value) => setCurrentTemplate(prev => ({ ...prev, orientation: value as any }))}
                    />
                    
                    <TextField
                      label="Background Color"
                      value={currentTemplate.backgroundColor}
                      onChange={(value) => setCurrentTemplate(prev => ({ ...prev, backgroundColor: value }))}
                    />
                  </FormLayout>
                </BlockStack>
              </div>
            )}
          </Tabs>
        </Card>
      </div>

      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Card>
          <div style={{ padding: '1rem' }}>
            <InlineStack align="space-between">
              <InlineStack>
                <Text variant="headingMd" as="h3">{currentTemplate.name}</Text>
              </InlineStack>
              
              <InlineStack gap="200">
                <Button onClick={handlePreview}>Preview</Button>
                <Button variant="primary" onClick={handleSave}>Save Template</Button>
              </InlineStack>
            </InlineStack>
          </div>
        </Card>

        {/* Canvas */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: '#f5f5f5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '2rem',
        }}>
          <div
            ref={canvasRef}
            style={{
              width: currentTemplate.pageSize === 'A4' ? '595px' : '612px',
              height: currentTemplate.pageSize === 'A4' ? '842px' : '792px',
              backgroundColor: currentTemplate.backgroundColor,
              position: 'relative',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              transform: currentTemplate.orientation === 'landscape' ? 'rotate(90deg)' : 'none',
            }}
            onClick={() => setSelectedElement(null)}
          >
            {currentTemplate.elements.map(renderElement)}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Invoice Preview"
        large
      >
        <Modal.Section>
          <div style={{ textAlign: 'center' }}>
            <Text variant="bodyMd" as="p">
              This is how your invoice template will look when generated with actual data.
            </Text>
            {/* Preview would show the actual rendered invoice */}
          </div>
        </Modal.Section>
      </Modal>
    </div>
  );
};

export default InvoiceDesigner;