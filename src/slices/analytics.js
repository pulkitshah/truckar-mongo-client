import { createSlice } from "@reduxjs/toolkit";
import { analyticsApi } from "../api/analytics-api";
import { organisationApi } from "../api/organisation-api";

const initialState = {
  financialMetrics: {
    data: null,
    loading: false,
    error: null,
  },
  operationalMetrics: {
    data: null,
    loading: false,
    error: null,
  },
  topCustomers: {
    data: [],
    loading: false,
    error: null,
  },
  topTransporters: {
    data: [],
    loading: false,
    error: null,
  },
  revenueTrend: {
    data: [],
    loading: false,
    error: null,
  },
  // Organization context
  organizations: {
    data: [],
    loading: false,
    error: null,
  },
  selectedOrganization: null, // null = All Organizations, objectId = specific org
  period: "month", // 'week', 'month', 'quarter', 'year'
  dateRange: {
    startDate: null,
    endDate: null,
  },
};

export const slice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    // Financial Metrics
    setFinancialMetricsLoading(state) {
      state.financialMetrics.loading = true;
      state.financialMetrics.error = null;
    },
    setFinancialMetrics(state, action) {
      state.financialMetrics.data = action.payload;
      state.financialMetrics.loading = false;
      state.financialMetrics.error = null;
    },
    setFinancialMetricsError(state, action) {
      state.financialMetrics.loading = false;
      state.financialMetrics.error = action.payload;
    },

    // Operational Metrics
    setOperationalMetricsLoading(state) {
      state.operationalMetrics.loading = true;
      state.operationalMetrics.error = null;
    },
    setOperationalMetrics(state, action) {
      state.operationalMetrics.data = action.payload;
      state.operationalMetrics.loading = false;
      state.operationalMetrics.error = null;
    },
    setOperationalMetricsError(state, action) {
      state.operationalMetrics.loading = false;
      state.operationalMetrics.error = action.payload;
    },

    // Top Customers
    setTopCustomersLoading(state) {
      state.topCustomers.loading = true;
      state.topCustomers.error = null;
    },
    setTopCustomers(state, action) {
      state.topCustomers.data = action.payload;
      state.topCustomers.loading = false;
      state.topCustomers.error = null;
    },
    setTopCustomersError(state, action) {
      state.topCustomers.loading = false;
      state.topCustomers.error = action.payload;
    },

    // Top Transporters
    setTopTransportersLoading(state) {
      state.topTransporters.loading = true;
      state.topTransporters.error = null;
    },
    setTopTransporters(state, action) {
      state.topTransporters.data = action.payload;
      state.topTransporters.loading = false;
      state.topTransporters.error = null;
    },
    setTopTransportersError(state, action) {
      state.topTransporters.loading = false;
      state.topTransporters.error = action.payload;
    },

    // Revenue Trend
    setRevenueTrendLoading(state) {
      state.revenueTrend.loading = true;
      state.revenueTrend.error = null;
    },
    setRevenueTrend(state, action) {
      state.revenueTrend.data = action.payload;
      state.revenueTrend.loading = false;
      state.revenueTrend.error = null;
    },
    setRevenueTrendError(state, action) {
      state.revenueTrend.loading = false;
      state.revenueTrend.error = action.payload;
    },

    // Organizations
    setOrganizationsLoading(state) {
      state.organizations.loading = true;
      state.organizations.error = null;
    },
    setOrganizations(state, action) {
      state.organizations.data = action.payload;
      state.organizations.loading = false;
      state.organizations.error = null;
    },
    setOrganizationsError(state, action) {
      state.organizations.loading = false;
      state.organizations.error = action.payload;
    },
    setSelectedOrganization(state, action) {
      state.selectedOrganization = action.payload;
    },

    // Period Selection
    setPeriod(state, action) {
      state.period = action.payload;
    },
    setDateRange(state, action) {
      state.dateRange = action.payload;
    },

    // Reset
    resetAnalytics(state) {
      return initialState;
    },
  },
});

export const { reducer } = slice;

// Thunks
export const fetchFinancialMetrics = (params) => async (dispatch) => {
  dispatch(slice.actions.setFinancialMetricsLoading());
  try {
    const result = await analyticsApi.getFinancialMetrics(params);
    if (result.error) {
      dispatch(slice.actions.setFinancialMetricsError(result.error));
    } else {
      dispatch(slice.actions.setFinancialMetrics(result.data));
    }
  } catch (error) {
    dispatch(slice.actions.setFinancialMetricsError(error.message));
  }
};

export const fetchOperationalMetrics = (params) => async (dispatch) => {
  dispatch(slice.actions.setOperationalMetricsLoading());
  try {
    const result = await analyticsApi.getOperationalMetrics(params);
    if (result.error) {
      dispatch(slice.actions.setOperationalMetricsError(result.error));
    } else {
      dispatch(slice.actions.setOperationalMetrics(result.data));
    }
  } catch (error) {
    dispatch(slice.actions.setOperationalMetricsError(error.message));
  }
};

export const fetchTopCustomers = (params) => async (dispatch) => {
  dispatch(slice.actions.setTopCustomersLoading());
  try {
    const result = await analyticsApi.getTopCustomers(params);
    if (result.error) {
      dispatch(slice.actions.setTopCustomersError(result.error));
    } else {
      dispatch(slice.actions.setTopCustomers(result.data));
    }
  } catch (error) {
    dispatch(slice.actions.setTopCustomersError(error.message));
  }
};

export const fetchTopTransporters = (params) => async (dispatch) => {
  dispatch(slice.actions.setTopTransportersLoading());
  try {
    const result = await analyticsApi.getTopTransporters(params);
    if (result.error) {
      dispatch(slice.actions.setTopTransportersError(result.error));
    } else {
      dispatch(slice.actions.setTopTransporters(result.data));
    }
  } catch (error) {
    dispatch(slice.actions.setTopTransportersError(error.message));
  }
};

export const fetchRevenueTrend = (params) => async (dispatch) => {
  dispatch(slice.actions.setRevenueTrendLoading());
  try {
    const result = await analyticsApi.getRevenueTrend(params);
    if (result.error) {
      dispatch(slice.actions.setRevenueTrendError(result.error));
    } else {
      dispatch(slice.actions.setRevenueTrend(result.data));
    }
  } catch (error) {
    dispatch(slice.actions.setRevenueTrendError(error.message));
  }
};

export const fetchOrganizations = () => async (dispatch) => {
  dispatch(slice.actions.setOrganizationsLoading());
  try {
    const result = await organisationApi.getOrganisations();
    if (result.error) {
      dispatch(slice.actions.setOrganizationsError(result.error));
    } else {
      dispatch(slice.actions.setOrganizations(result.data));
    }
  } catch (error) {
    dispatch(slice.actions.setOrganizationsError(error.message));
  }
};

export const selectOrganization = (orgId) => async (dispatch) => {
  dispatch(slice.actions.setSelectedOrganization(orgId));
};

export const fetchAllDashboardData = (params) => async (dispatch) => {
  // Fetch all dashboard data in parallel
  await Promise.all([
    dispatch(fetchFinancialMetrics(params)),
    dispatch(fetchOperationalMetrics(params)),
    dispatch(fetchTopCustomers(params)),
    dispatch(fetchTopTransporters(params)),
    dispatch(fetchRevenueTrend(params)),
  ]);
};

export default slice;
