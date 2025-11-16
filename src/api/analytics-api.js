import axios from "../utils/axios";

class AnalyticsApi {
  /**
   * Get financial metrics for the dashboard
   * @param {Object} params - { account, period, startDate, endDate }
   * @returns {Object} - Revenue, profit, margins, and growth metrics
   */
  async getFinancialMetrics(params) {
    try {
      const response = await axios.get(`/api/analytics/financial-metrics`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Financial Metrics]: ", err);
      return {
        status: err.response?.status || 400,
        data: null,
        error:
          err.response?.data?.message || "Failed to fetch financial metrics",
      };
    }
  }

  /**
   * Get operational KPIs
   * @param {Object} params - { account, period, startDate, endDate }
   * @returns {Object} - Order counts, delivery stats, fleet utilization
   */
  async getOperationalMetrics(params) {
    try {
      const response = await axios.get(`/api/analytics/operational-metrics`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Operational Metrics]: ", err);
      return {
        status: err.response?.status || 400,
        data: null,
        error:
          err.response?.data?.message || "Failed to fetch operational metrics",
      };
    }
  }

  /**
   * Get top customers by profit
   * @param {Object} params - { account, period, startDate, endDate, limit }
   * @returns {Array} - Top customers with profit data
   */
  async getTopCustomers(params) {
    try {
      const response = await axios.get(`/api/analytics/top-customers`, {
        params: { ...params, limit: params.limit || 10 },
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Top Customers]: ", err);
      return {
        status: err.response?.status || 400,
        data: [],
        error: err.response?.data?.message || "Failed to fetch top customers",
      };
    }
  }

  /**
   * Get top transporters by profit
   * @param {Object} params - { account, period, startDate, endDate, limit }
   * @returns {Array} - Top transporters with profit data
   */
  async getTopTransporters(params) {
    try {
      const response = await axios.get(`/api/analytics/top-transporters`, {
        params: { ...params, limit: params.limit || 10 },
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Top Transporters]: ", err);
      return {
        status: err.response?.status || 400,
        data: [],
        error:
          err.response?.data?.message || "Failed to fetch top transporters",
      };
    }
  }

  /**
   * Get revenue trend over time
   * @param {Object} params - { account, period, startDate, endDate, groupBy }
   * @returns {Array} - Time series data for revenue and profit
   */
  async getRevenueTrend(params) {
    try {
      const response = await axios.get(`/api/analytics/revenue-trend`, {
        params: { ...params, groupBy: params.groupBy || "day" },
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Revenue Trend]: ", err);
      return {
        status: err.response?.status || 400,
        data: [],
        error: err.response?.data?.message || "Failed to fetch revenue trend",
      };
    }
  }

  /**
   * Get pending actions that require attention
   * @param {Object} params - { account }
   * @returns {Object} - Pending LRs, invoices, and outstanding amounts
   */
  async getPendingActions(params) {
    try {
      const response = await axios.get(`/api/analytics/pending-actions`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Pending Actions]: ", err);
      return {
        status: err.response?.status || 400,
        data: null,
        error: err.response?.data?.message || "Failed to fetch pending actions",
      };
    }
  }

  /**
   * Get recent orders for quick view
   * @param {Object} params - { account, limit }
   * @returns {Array} - Recent orders with status
   */
  async getRecentOrders(params) {
    try {
      const response = await axios.get(`/api/analytics/recent-orders`, {
        params: { ...params, limit: params.limit || 10 },
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Recent Orders]: ", err);
      return {
        status: err.response?.status || 400,
        data: [],
        error: err.response?.data?.message || "Failed to fetch recent orders",
      };
    }
  }

  /**
   * Get fleet utilization statistics
   * @param {Object} params - { account, period, startDate, endDate }
   * @returns {Object} - Active vehicles, utilization percentage
   */
  async getFleetUtilization(params) {
    try {
      const response = await axios.get(`/api/analytics/fleet-utilization`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Fleet Utilization]: ", err);
      return {
        status: err.response?.status || 400,
        data: null,
        error:
          err.response?.data?.message || "Failed to fetch fleet utilization",
      };
    }
  }

  /**
   * Get detailed orders for a specific date
   * @param {Object} params - { account, date, groupBy }
   * @returns {Array} - Detailed list of orders for the given date
   */
  async getRevenueDetails(params) {
    try {
      const response = await axios.get(`/api/analytics/revenue-details`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Revenue Details]: ", err);
      return {
        status: err.response?.status || 400,
        data: { data: [], dateRange: {} },
        error: err.response?.data?.message || "Failed to fetch revenue details",
      };
    }
  }

  /**
   * Get detailed orders for a specific customer
   * @param {Object} params - { account, customerId, startDate, endDate }
   * @returns {Array} - Detailed list of orders for the given customer
   */
  async getCustomerDetails(params) {
    try {
      const response = await axios.get(`/api/analytics/customer-details`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Customer Details]: ", err);
      return {
        status: err.response?.status || 400,
        data: { data: [] },
        error:
          err.response?.data?.message || "Failed to fetch customer details",
      };
    }
  }

  /**
   * Get detailed orders for a specific transporter
   * @param {Object} params - { account, transporterId, startDate, endDate }
   * @returns {Array} - Detailed list of orders for the given transporter
   */
  async getTransporterDetails(params) {
    try {
      const response = await axios.get(`/api/analytics/transporter-details`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Transporter Details]: ", err);
      return {
        status: err.response?.status || 400,
        data: { data: [] },
        error:
          err.response?.data?.message || "Failed to fetch transporter details",
      };
    }
  }

  /**
   * Get auto-generated insights from dashboard data
   * @param {Object} params - { account, period, startDate, endDate }
   * @returns {Array} - Array of insight objects with type, message, and severity
   */
  async getInsights(params) {
    try {
      const response = await axios.get(`/api/analytics/insights`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Insights]: ", err);
      return {
        status: err.response?.status || 400,
        data: [],
        error: err.response?.data?.message || "Failed to fetch insights",
      };
    }
  }

  /**
   * Get financial metrics with sparkline trend data
   * @param {Object} params - { account, period, startDate, endDate, organisation }
   * @returns {Object} - Enhanced metrics with trend arrays and targets
   */
  async getFinancialMetricsEnhanced(params) {
    try {
      const response = await axios.get(`/api/analytics/financial-metrics`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Financial Metrics Enhanced]: ", err);
      return {
        status: err.response?.status || 400,
        data: null,
        error:
          err.response?.data?.message || "Failed to fetch enhanced financial metrics",
      };
    }
  }

  /**
   * Get revenue trend with comparison to previous period
   * @param {Object} params - { account, period, startDate, endDate, groupBy, comparison }
   * @returns {Object} - Current and previous period data
   */
  async getRevenueTrendWithComparison(params) {
    try {
      const response = await axios.get(`/api/analytics/revenue-trend-comparison`, {
        params: { ...params, groupBy: params.groupBy || "day" },
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Revenue Trend Comparison]: ", err);
      return {
        status: err.response?.status || 400,
        data: { current: [], previous: [] },
        error: err.response?.data?.message || "Failed to fetch revenue trend comparison",
      };
    }
  }

  /**
   * Get operational health metrics
   * @param {Object} params - { account, startDate, endDate, organisation }
   * @returns {Object} - Document completion, fleet utilization, pending actions, outstanding invoices
   */
  async getOperationalHealth(params) {
    try {
      const response = await axios.get(`/api/analytics/operational-health`, {
        params,
      });

      return {
        status: response.status,
        data: response.data,
        error: false,
      };
    } catch (err) {
      console.error("[Analytics Api - Operational Health]: ", err);
      return {
        status: err.response?.status || 400,
        data: null,
        error:
          err.response?.data?.message || "Failed to fetch operational health",
      };
    }
  }
}

export const analyticsApi = new AnalyticsApi();
