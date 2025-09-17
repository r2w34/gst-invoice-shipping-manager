import { DataProvider } from 'react-admin';

/**
 * Client-side Data Provider for React Admin
 * Communicates with our Remix API routes
 */
export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const { filter } = params;

    const query = new URLSearchParams({
      resource,
      method: 'getList',
      page: page.toString(),
      perPage: perPage.toString(),
      sortField: field,
      sortOrder: order,
      filter: JSON.stringify(filter),
    });

    const response = await fetch(`/api/admin?${query}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    
    return {
      data: json.data,
      total: json.total,
    };
  },

  getOne: async (resource, params) => {
    const query = new URLSearchParams({
      resource,
      method: 'getOne',
      id: params.id.toString(),
    });

    const response = await fetch(`/api/admin?${query}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    
    return {
      data: json.data,
    };
  },

  getMany: async (resource, params) => {
    const query = new URLSearchParams({
      resource,
      method: 'getMany',
      ids: JSON.stringify(params.ids),
    });

    const response = await fetch(`/api/admin?${query}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    
    return {
      data: json.data,
    };
  },

  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const { filter } = params;

    const query = new URLSearchParams({
      resource,
      method: 'getList',
      page: page.toString(),
      perPage: perPage.toString(),
      sortField: field,
      sortOrder: order,
      filter: JSON.stringify({
        ...filter,
        [params.target]: params.id,
      }),
    });

    const response = await fetch(`/api/admin?${query}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const json = await response.json();
    
    return {
      data: json.data,
      total: json.total,
    };
  },

  create: async (resource, params) => {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource,
        method: 'create',
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    
    return {
      data: json.data,
    };
  },

  update: async (resource, params) => {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource,
        method: 'update',
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    
    return {
      data: json.data,
    };
  },

  updateMany: async (resource, params) => {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource,
        method: 'updateMany',
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    
    return {
      data: json.data,
    };
  },

  delete: async (resource, params) => {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource,
        method: 'delete',
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    
    return {
      data: json.data,
    };
  },

  deleteMany: async (resource, params) => {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource,
        method: 'deleteMany',
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    
    return {
      data: json.data,
    };
  },
};

/**
 * Get analytics data
 */
export const getAnalytics = async () => {
  const query = new URLSearchParams({
    resource: 'analytics',
    method: 'analytics',
  });

  const response = await fetch(`/api/admin?${query}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};