import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  ShowButton,
  DeleteButton,
  Create,
  Edit,
  Show,
  SimpleForm,
  SimpleShowLayout,
  TextInput,
  required,
  Filter,
  SearchInput,
  SelectInput,
  Tab,
  TabbedShowLayout,
  ChipField,
  BooleanField,
  BooleanInput,
  FunctionField,
} from 'react-admin';
import { Typography, Card, CardContent, Box } from '@mui/material';

/**
 * Template List Filters
 */
const TemplateFilter = (props: any) => (
  <Filter {...props}>
    <SearchInput source="q" alwaysOn />
    <SelectInput
      source="type"
      choices={[
        { id: 'INVOICE', name: 'Invoice' },
        { id: 'LABEL', name: 'Shipping Label' },
        { id: 'RECEIPT', name: 'Receipt' },
        { id: 'QUOTATION', name: 'Quotation' },
      ]}
    />
    <BooleanInput source="isDefault" label="Default Template" />
  </Filter>
);

/**
 * Template Preview Component
 */
const TemplatePreview = ({ record }: any) => {
  if (!record?.elements || !Array.isArray(record.elements)) {
    return <Typography>No preview available</Typography>;
  }

  return (
    <Card sx={{ maxWidth: 400, margin: 'auto' }}>
      <CardContent>
        <Box
          sx={{
            width: '100%',
            height: 300,
            border: '1px solid #ddd',
            position: 'relative',
            backgroundColor: '#fff',
            overflow: 'hidden',
          }}
        >
          {record.elements.map((element: any, index: number) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                left: `${element.x || 0}px`,
                top: `${element.y || 0}px`,
                width: `${element.width || 100}px`,
                height: `${element.height || 20}px`,
                fontSize: `${element.fontSize || 12}px`,
                color: element.color || '#000',
                backgroundColor: element.backgroundColor || 'transparent',
                border: element.type === 'rectangle' ? '1px solid #000' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: element.textAlign || 'left',
                padding: '2px',
                boxSizing: 'border-box',
              }}
            >
              {element.type === 'text' && (element.text || element.content)}
              {element.type === 'rectangle' && ''}
              {element.type === 'line' && <hr style={{ width: '100%', margin: 0 }} />}
              {element.type === 'image' && '📷'}
            </Box>
          ))}
        </Box>
        <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1 }}>
          Template Preview ({record.elements.length} elements)
        </Typography>
      </CardContent>
    </Card>
  );
};

/**
 * Template List Component
 */
export const TemplateList = (props: any) => (
  <List
    {...props}
    filters={<TemplateFilter />}
    sort={{ field: 'updatedAt', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show">
      <TextField source="name" />
      <ChipField source="type" />
      <TextField source="pageSize" />
      <TextField source="orientation" />
      <FunctionField
        label="Elements"
        render={(record: any) => record.elements?.length || 0}
      />
      <BooleanField source="isDefault" label="Default" />
      <DateField source="updatedAt" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

/**
 * Template Create Component
 */
export const TemplateCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <Typography variant="h6" gutterBottom>
        Template Information
      </Typography>
      <TextInput source="name" validate={[required()]} fullWidth />
      <SelectInput
        source="type"
        choices={[
          { id: 'INVOICE', name: 'Invoice' },
          { id: 'LABEL', name: 'Shipping Label' },
          { id: 'RECEIPT', name: 'Receipt' },
          { id: 'QUOTATION', name: 'Quotation' },
        ]}
        validate={[required()]}
      />
      <TextInput source="description" multiline rows={3} fullWidth />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Page Settings
      </Typography>
      <SelectInput
        source="pageSize"
        choices={[
          { id: 'A4', name: 'A4' },
          { id: 'A5', name: 'A5' },
          { id: 'LETTER', name: 'Letter' },
          { id: 'LEGAL', name: 'Legal' },
        ]}
        defaultValue="A4"
      />
      <SelectInput
        source="orientation"
        choices={[
          { id: 'portrait', name: 'Portrait' },
          { id: 'landscape', name: 'Landscape' },
        ]}
        defaultValue="portrait"
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Template Settings
      </Typography>
      <BooleanInput source="isDefault" label="Set as Default Template" />
      <BooleanInput source="isActive" label="Active" defaultValue={true} />
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Note: Use the Invoice Designer to add elements and customize the template layout.
      </Typography>
    </SimpleForm>
  </Create>
);

/**
 * Template Edit Component
 */
export const TemplateEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <Typography variant="h6" gutterBottom>
        Template Information
      </Typography>
      <TextInput source="name" validate={[required()]} fullWidth />
      <SelectInput
        source="type"
        choices={[
          { id: 'INVOICE', name: 'Invoice' },
          { id: 'LABEL', name: 'Shipping Label' },
          { id: 'RECEIPT', name: 'Receipt' },
          { id: 'QUOTATION', name: 'Quotation' },
        ]}
        validate={[required()]}
      />
      <TextInput source="description" multiline rows={3} fullWidth />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Page Settings
      </Typography>
      <SelectInput
        source="pageSize"
        choices={[
          { id: 'A4', name: 'A4' },
          { id: 'A5', name: 'A5' },
          { id: 'LETTER', name: 'Letter' },
          { id: 'LEGAL', name: 'Legal' },
        ]}
      />
      <SelectInput
        source="orientation"
        choices={[
          { id: 'portrait', name: 'Portrait' },
          { id: 'landscape', name: 'Landscape' },
        ]}
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Template Settings
      </Typography>
      <BooleanInput source="isDefault" label="Set as Default Template" />
      <BooleanInput source="isActive" label="Active" />
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Note: Use the Invoice Designer to modify elements and customize the template layout.
      </Typography>
    </SimpleForm>
  </Edit>
);

/**
 * Template Show Component
 */
export const TemplateShow = (props: any) => (
  <Show {...props}>
    <TabbedShowLayout>
      <Tab label="Template Details">
        <SimpleShowLayout>
          <TextField source="name" />
          <ChipField source="type" />
          <TextField source="description" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Page Settings
          </Typography>
          <TextField source="pageSize" />
          <TextField source="orientation" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Template Settings
          </Typography>
          <BooleanField source="isDefault" label="Default Template" />
          <BooleanField source="isActive" label="Active" />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Statistics
          </Typography>
          <FunctionField
            label="Elements Count"
            render={(record: any) => record.elements?.length || 0}
          />
          <DateField source="createdAt" />
          <DateField source="updatedAt" />
        </SimpleShowLayout>
      </Tab>
      
      <Tab label="Template Preview">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Template Preview
          </Typography>
          <FunctionField render={TemplatePreview} />
        </Box>
      </Tab>
      
      <Tab label="Template Elements">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Template Elements
          </Typography>
          <FunctionField
            render={({ record }: any) => {
              if (!record?.elements || !Array.isArray(record.elements)) {
                return <Typography>No elements defined</Typography>;
              }

              return (
                <Box>
                  {record.elements.map((element: any, index: number) => (
                    <Card key={index} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Element {index + 1}: {element.type}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Position: ({element.x || 0}, {element.y || 0})
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Size: {element.width || 0} × {element.height || 0}
                        </Typography>
                        {element.text && (
                          <Typography variant="body2">
                            Content: {element.text}
                          </Typography>
                        )}
                        {element.fontSize && (
                          <Typography variant="body2" color="textSecondary">
                            Font Size: {element.fontSize}px
                          </Typography>
                        )}
                        {element.color && (
                          <Typography variant="body2" color="textSecondary">
                            Color: {element.color}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              );
            }}
          />
        </Box>
      </Tab>
    </TabbedShowLayout>
  </Show>
);