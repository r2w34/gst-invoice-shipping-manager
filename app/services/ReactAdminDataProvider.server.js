import db from '../db.server';

/**
 * React Admin Data Provider for Prisma Database
 * Provides CRUD operations for React Admin interface
 */
export class ReactAdminDataProvider {
  constructor() {
    this.db = db;
  }

  /**
   * Get list of resources with pagination, sorting, and filtering
   */
  async getList(resource, params) {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const { filter } = params;

    try {
      let whereClause = {};
      let orderByClause = {};

      // Build filter clause
      if (filter) {
        whereClause = this.buildFilterClause(resource, filter);
      }

      // Build order clause
      if (field && order) {
        orderByClause[field] = order.toLowerCase();
      }

      const skip = (page - 1) * perPage;
      const take = perPage;

      let data, total;

      switch (resource) {
        case 'customers':
          [data, total] = await Promise.all([
            this.db.customer.findMany({
              where: whereClause,
              orderBy: orderByClause,
              skip,
              take,
              include: {
                _count: {
                  select: { invoices: true }
                }
              }
            }),
            this.db.customer.count({ where: whereClause })
          ]);
          break;

        case 'invoices':
          [data, total] = await Promise.all([
            this.db.invoice.findMany({
              where: whereClause,
              orderBy: orderByClause,
              skip,
              take,
              include: {
                customer: {
                  select: { name: true, email: true }
                }
              }
            }),
            this.db.invoice.count({ where: whereClause })
          ]);
          break;

        case 'orders':
          [data, total] = await Promise.all([
            this.db.order.findMany({
              where: whereClause,
              orderBy: orderByClause,
              skip,
              take,
              include: {
                customer: {
                  select: { name: true, email: true }
                }
              }
            }),
            this.db.order.count({ where: whereClause })
          ]);
          break;

        case 'labels':
          [data, total] = await Promise.all([
            this.db.shippingLabel.findMany({
              where: whereClause,
              orderBy: orderByClause,
              skip,
              take,
              include: {
                customer: {
                  select: { name: true, email: true }
                }
              }
            }),
            this.db.shippingLabel.count({ where: whereClause })
          ]);
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return {
        data: data.map(item => ({ ...item, id: item.id })),
        total
      };
    } catch (error) {
      console.error(`Error in getList for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Get single resource by ID
   */
  async getOne(resource, params) {
    const { id } = params;

    try {
      let data;

      switch (resource) {
        case 'customers':
          data = await this.db.customer.findUnique({
            where: { id },
            include: {
              invoices: {
                orderBy: { createdAt: 'desc' },
                take: 10
              },
              _count: {
                select: { invoices: true }
              }
            }
          });
          break;

        case 'invoices':
          data = await this.db.invoice.findUnique({
            where: { id },
            include: {
              customer: true
            }
          });
          break;

        case 'orders':
          data = await this.db.order.findUnique({
            where: { id },
            include: {
              customer: true
            }
          });
          break;

        case 'labels':
          data = await this.db.shippingLabel.findUnique({
            where: { id },
            include: {
              customer: true
            }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      if (!data) {
        throw new Error(`${resource} with id ${id} not found`);
      }

      return { data };
    } catch (error) {
      console.error(`Error in getOne for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Create new resource
   */
  async create(resource, params) {
    const { data } = params;

    try {
      let result;

      switch (resource) {
        case 'customers':
          result = await this.db.customer.create({
            data: {
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          break;

        case 'invoices':
          result = await this.db.invoice.create({
            data: {
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            include: {
              customer: true
            }
          });
          break;

        case 'orders':
          result = await this.db.order.create({
            data: {
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            include: {
              customer: true
            }
          });
          break;

        case 'labels':
          result = await this.db.shippingLabel.create({
            data: {
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            include: {
              customer: true
            }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return { data: result };
    } catch (error) {
      console.error(`Error in create for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Update existing resource
   */
  async update(resource, params) {
    const { id, data } = params;

    try {
      let result;

      switch (resource) {
        case 'customers':
          result = await this.db.customer.update({
            where: { id },
            data: {
              ...data,
              updatedAt: new Date()
            }
          });
          break;

        case 'invoices':
          result = await this.db.invoice.update({
            where: { id },
            data: {
              ...data,
              updatedAt: new Date()
            },
            include: {
              customer: true
            }
          });
          break;

        case 'orders':
          result = await this.db.order.update({
            where: { id },
            data: {
              ...data,
              updatedAt: new Date()
            },
            include: {
              customer: true
            }
          });
          break;

        case 'labels':
          result = await this.db.shippingLabel.update({
            where: { id },
            data: {
              ...data,
              updatedAt: new Date()
            },
            include: {
              customer: true
            }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return { data: result };
    } catch (error) {
      console.error(`Error in update for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Delete resource
   */
  async delete(resource, params) {
    const { id } = params;

    try {
      let result;

      switch (resource) {
        case 'customers':
          result = await this.db.customer.delete({
            where: { id }
          });
          break;

        case 'invoices':
          result = await this.db.invoice.delete({
            where: { id }
          });
          break;

        case 'orders':
          result = await this.db.order.delete({
            where: { id }
          });
          break;

        case 'labels':
          result = await this.db.shippingLabel.delete({
            where: { id }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return { data: result };
    } catch (error) {
      console.error(`Error in delete for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple resources
   */
  async deleteMany(resource, params) {
    const { ids } = params;

    try {
      let result;

      switch (resource) {
        case 'customers':
          result = await this.db.customer.deleteMany({
            where: { id: { in: ids } }
          });
          break;

        case 'invoices':
          result = await this.db.invoice.deleteMany({
            where: { id: { in: ids } }
          });
          break;

        case 'orders':
          result = await this.db.order.deleteMany({
            where: { id: { in: ids } }
          });
          break;

        case 'labels':
          result = await this.db.shippingLabel.deleteMany({
            where: { id: { in: ids } }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return { data: ids };
    } catch (error) {
      console.error(`Error in deleteMany for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Get many resources by IDs
   */
  async getMany(resource, params) {
    const { ids } = params;

    try {
      let data;

      switch (resource) {
        case 'customers':
          data = await this.db.customer.findMany({
            where: { id: { in: ids } }
          });
          break;

        case 'invoices':
          data = await this.db.invoice.findMany({
            where: { id: { in: ids } },
            include: {
              customer: {
                select: { name: true, email: true }
              }
            }
          });
          break;

        case 'orders':
          data = await this.db.order.findMany({
            where: { id: { in: ids } },
            include: {
              customer: {
                select: { name: true, email: true }
              }
            }
          });
          break;

        case 'labels':
          data = await this.db.shippingLabel.findMany({
            where: { id: { in: ids } },
            include: {
              customer: {
                select: { name: true, email: true }
              }
            }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return { data };
    } catch (error) {
      console.error(`Error in getMany for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Update many resources
   */
  async updateMany(resource, params) {
    const { ids, data } = params;

    try {
      let result;

      switch (resource) {
        case 'customers':
          result = await this.db.customer.updateMany({
            where: { id: { in: ids } },
            data: {
              ...data,
              updatedAt: new Date()
            }
          });
          break;

        case 'invoices':
          result = await this.db.invoice.updateMany({
            where: { id: { in: ids } },
            data: {
              ...data,
              updatedAt: new Date()
            }
          });
          break;

        case 'orders':
          result = await this.db.order.updateMany({
            where: { id: { in: ids } },
            data: {
              ...data,
              updatedAt: new Date()
            }
          });
          break;

        case 'labels':
          result = await this.db.shippingLabel.updateMany({
            where: { id: { in: ids } },
            data: {
              ...data,
              updatedAt: new Date()
            }
          });
          break;

        default:
          throw new Error(`Unknown resource: ${resource}`);
      }

      return { data: ids };
    } catch (error) {
      console.error(`Error in updateMany for ${resource}:`, error);
      throw error;
    }
  }

  /**
   * Build filter clause for database queries
   */
  buildFilterClause(resource, filter) {
    const whereClause = {};

    Object.keys(filter).forEach(key => {
      const value = filter[key];

      if (value === null || value === undefined || value === '') {
        return;
      }

      // Handle different filter types
      if (typeof value === 'string') {
        // Text search
        whereClause[key] = {
          contains: value,
          mode: 'insensitive'
        };
      } else if (typeof value === 'number') {
        // Exact number match
        whereClause[key] = value;
      } else if (typeof value === 'boolean') {
        // Boolean match
        whereClause[key] = value;
      } else if (Array.isArray(value)) {
        // Array of values (IN clause)
        whereClause[key] = {
          in: value
        };
      } else if (typeof value === 'object') {
        // Range or complex filter
        if (value.gte !== undefined || value.lte !== undefined) {
          whereClause[key] = value;
        }
      }
    });

    return whereClause;
  }

  /**
   * Get analytics data for dashboard
   */
  async getAnalytics(shopId) {
    try {
      const [
        totalCustomers,
        totalInvoices,
        totalOrders,
        totalLabels,
        recentInvoices,
        monthlyRevenue,
        topCustomers
      ] = await Promise.all([
        this.db.customer.count({ where: { shopId } }),
        this.db.invoice.count({ where: { shopId } }),
        this.db.order.count({ where: { shopId } }),
        this.db.shippingLabel.count({ where: { shopId } }),
        this.db.invoice.findMany({
          where: { shopId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            customer: {
              select: { name: true }
            }
          }
        }),
        this.getMonthlyRevenue(shopId),
        this.getTopCustomers(shopId)
      ]);

      return {
        totalCustomers,
        totalInvoices,
        totalOrders,
        totalLabels,
        recentInvoices,
        monthlyRevenue,
        topCustomers
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get monthly revenue data
   */
  async getMonthlyRevenue(shopId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const invoices = await this.db.invoice.findMany({
      where: {
        shopId,
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      select: {
        createdAt: true,
        totalAmount: true
      }
    });

    // Group by month
    const monthlyData = {};
    invoices.forEach(invoice => {
      const month = invoice.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += parseFloat(invoice.totalAmount || 0);
    });

    return Object.keys(monthlyData).map(month => ({
      month,
      revenue: monthlyData[month]
    }));
  }

  /**
   * Get top customers by invoice value
   */
  async getTopCustomers(shopId) {
    const result = await this.db.customer.findMany({
      where: { shopId },
      include: {
        invoices: {
          select: {
            totalAmount: true
          }
        }
      },
      take: 10
    });

    return result
      .map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        totalValue: customer.invoices.reduce((sum, invoice) => 
          sum + parseFloat(invoice.totalAmount || 0), 0
        ),
        invoiceCount: customer.invoices.length
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }
}

export const reactAdminDataProvider = new ReactAdminDataProvider();