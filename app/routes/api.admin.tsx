import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { reactAdminDataProvider } from '../services/ReactAdminDataProvider.server';

/**
 * React Admin API Route
 * Handles all CRUD operations for React Admin interface
 */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  const resource = url.searchParams.get('resource');
  const method = url.searchParams.get('method') || 'getList';
  
  if (!resource) {
    return json({ error: 'Resource parameter is required' }, { status: 400 });
  }

  try {
    let result;
    
    switch (method) {
      case 'getList':
        const page = parseInt(url.searchParams.get('page') || '1');
        const perPage = parseInt(url.searchParams.get('perPage') || '10');
        const sortField = url.searchParams.get('sortField') || 'id';
        const sortOrder = url.searchParams.get('sortOrder') || 'ASC';
        
        // Parse filter from query string
        const filterParam = url.searchParams.get('filter');
        const filter = filterParam ? JSON.parse(filterParam) : {};
        
        result = await reactAdminDataProvider.getList(resource, {
          pagination: { page, perPage },
          sort: { field: sortField, order: sortOrder },
          filter: { ...filter, shopId: session.shop }
        });
        break;
        
      case 'getOne':
        const id = url.searchParams.get('id');
        if (!id) {
          return json({ error: 'ID parameter is required for getOne' }, { status: 400 });
        }
        result = await reactAdminDataProvider.getOne(resource, { id });
        break;
        
      case 'getMany':
        const idsParam = url.searchParams.get('ids');
        if (!idsParam) {
          return json({ error: 'IDs parameter is required for getMany' }, { status: 400 });
        }
        const ids = JSON.parse(idsParam);
        result = await reactAdminDataProvider.getMany(resource, { ids });
        break;
        
      case 'analytics':
        result = await reactAdminDataProvider.getAnalytics(session.shop);
        break;
        
      default:
        return json({ error: `Unknown method: ${method}` }, { status: 400 });
    }
    
    return json(result);
  } catch (error) {
    console.error('React Admin API Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  try {
    const body = await request.json();
    const { resource, method, params } = body;
    
    if (!resource || !method) {
      return json({ error: 'Resource and method are required' }, { status: 400 });
    }
    
    // Add shopId to all data operations
    if (params?.data) {
      params.data.shopId = session.shop;
    }
    
    let result;
    
    switch (method) {
      case 'create':
        result = await reactAdminDataProvider.create(resource, params);
        break;
        
      case 'update':
        result = await reactAdminDataProvider.update(resource, params);
        break;
        
      case 'delete':
        result = await reactAdminDataProvider.delete(resource, params);
        break;
        
      case 'deleteMany':
        result = await reactAdminDataProvider.deleteMany(resource, params);
        break;
        
      case 'updateMany':
        result = await reactAdminDataProvider.updateMany(resource, params);
        break;
        
      default:
        return json({ error: `Unknown method: ${method}` }, { status: 400 });
    }
    
    return json(result);
  } catch (error) {
    console.error('React Admin API Action Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};