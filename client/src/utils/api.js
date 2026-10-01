import { Capacitor } from '@capacitor/core';

// Automatically detect native mobile app vs web browser
const isNative = typeof window !== 'undefined' && (
  (window.Capacitor && Capacitor.isNativePlatform()) ||
  window.location.protocol === 'capacitor:' ||
  (window.location.hostname === 'localhost' && window.location.port !== '5173' && window.location.port !== '5000')
);

export const BACKEND_URL = import.meta.env.VITE_API_URL || (isNative ? 'https://fcnwifi.shop' : '');
export const API_BASE = `${BACKEND_URL}/api`;

export function getToken() {
  return localStorage.getItem('dish_auth_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('dish_auth_token', token);
  } else {
    localStorage.removeItem('dish_auth_token');
  }
}

export function getStoredUser() {
  const u = localStorage.getItem('dish_auth_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('dish_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('dish_auth_user');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data && data.error ? data.error : `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => apiRequest('/auth/me'),
  demoSwitch: (role, email) => apiRequest('/auth/demo-switch', { method: 'POST', body: JSON.stringify({ role, email }) }),
  getLoginSettings: () => apiRequest('/auth/login-settings'),

  // Super Admin
  getSuperAdminStats: () => apiRequest('/superadmin/dashboard-stats'),
  getCompanies: (params = '') => apiRequest(`/superadmin/companies?${params}`),
  getCompany: (id) => apiRequest(`/superadmin/companies/${id}`),
  createCompany: (data) => apiRequest('/superadmin/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id, data) => apiRequest(`/superadmin/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeCompanyStatus: (id, status) => apiRequest(`/superadmin/companies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  resetCompanyPassword: (id, new_password) => apiRequest(`/superadmin/companies/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password }) }),
  deleteCompany: (id) => apiRequest(`/superadmin/companies/${id}`, { method: 'DELETE' }),
  autoLoginCompany: (id) => apiRequest(`/superadmin/companies/${id}/auto-login`, { method: 'POST' }),
  clearDummyData: () => apiRequest('/superadmin/clear-dummy-data', { method: 'POST' }),
  getSuperAdminSettings: () => apiRequest('/superadmin/settings'),
  updateSuperAdminSettings: (data) => apiRequest('/superadmin/settings', { method: 'POST', body: JSON.stringify(data) }),
  uploadLoginLogo: async (formData) => {
    const token = getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/superadmin/upload-login-logo`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload login logo');
    }
    return data;
  },

  // Company Admin Dashboard & Settings
  getCompanyDashboard: () => apiRequest('/company/dashboard'),
  getCompanySettings: () => apiRequest('/company/settings'),
  updateCompanySettings: (data) => apiRequest('/company/settings', { method: 'PUT', body: JSON.stringify(data) }),
  uploadCompanyLogo: async (formData) => {
    const token = getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/company/upload-logo`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload logo');
    }
    return data;
  },

  // Areas
  getAreas: () => apiRequest('/areas'),
  createArea: (data) => apiRequest('/areas', { method: 'POST', body: JSON.stringify(data) }),
  updateArea: (id, data) => apiRequest(`/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArea: (id) => apiRequest(`/areas/${id}`, { method: 'DELETE' }),
  assignCollectorsToArea: (id, collector_ids) => apiRequest(`/areas/${id}/assign-collectors`, { method: 'POST', body: JSON.stringify({ collector_ids }) }),

  // Collectors
  getCollectors: () => apiRequest('/collectors'),
  getCollector: (id) => apiRequest(`/collectors/${id}`),
  createCollector: (data) => apiRequest('/collectors', { method: 'POST', body: JSON.stringify(data) }),
  updateCollector: (id, data) => apiRequest(`/collectors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadCollectorAvatar: async (formData) => {
    const token = getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/collectors/upload-avatar`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload avatar');
    }
    return data;
  },
  resetCollectorPassword: (id, new_password) => apiRequest(`/collectors/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password }) }),
  changeCollectorStatus: (id, status) => apiRequest(`/collectors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteCollector: (id) => apiRequest(`/collectors/${id}`, { method: 'DELETE' }),
  getCollectorHistory: (id, params = '') => apiRequest(`/collectors/${id}/history?${params}`),

  // Packages
  getPackages: () => apiRequest('/packages'),
  createPackage: (data) => apiRequest('/packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id, data) => apiRequest(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePackage: (id) => apiRequest(`/packages/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (query = '') => apiRequest(`/customers?${query}`),
  getCustomer: (id) => apiRequest(`/customers/${id}`),
  getCustomerPayments: (id) => apiRequest(`/customers/${id}/payments`),
  createCustomer: (data) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeCustomerStatus: (id, status, notes = '') => apiRequest(`/customers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  changeCustomerPackage: (id, package_id, monthly_bill) => apiRequest(`/customers/${id}/package`, { method: 'PATCH', body: JSON.stringify({ package_id, monthly_bill }) }),
  deleteCustomer: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
  bulkChangeCustomerStatus: (customer_ids, status, notes = '') =>
    apiRequest('/customers/bulk-status', { method: 'POST', body: JSON.stringify({ customer_ids, status, notes }) }),
  bulkDeleteCustomers: (customer_ids) =>
    apiRequest('/customers/bulk-delete', { method: 'POST', body: JSON.stringify({ customer_ids }) }),
  previewImportCustomers: (rows, default_status = 'Active', default_area_id = null) => 
    apiRequest('/customers/import/preview', { method: 'POST', body: JSON.stringify({ rows, default_status, default_area_id }) }),
  confirmImportCustomers: (rows) => apiRequest('/customers/import/confirm', { method: 'POST', body: JSON.stringify({ rows }) }),

  // Billing
  getBillingPreview: (month) => apiRequest(`/billing/preview?month=${month || ''}`),
  generateBills: (month) => apiRequest('/billing/generate', { method: 'POST', body: JSON.stringify({ month }) }),
  getBillingHistory: (query = '') => apiRequest(`/billing/history?${query}`),
  getAutoBillingStatus: () => apiRequest('/billing/auto-status'),
  triggerAutoBilling: (month) => apiRequest('/billing/trigger-auto', { method: 'POST', body: JSON.stringify({ month }) }),

  // Payments & Receipts
  collectPayment: (data) => apiRequest('/payments/collect', { method: 'POST', body: JSON.stringify(data) }),
  getReceipt: (receiptNumber) => apiRequest(`/payments/receipt/${receiptNumber}`),
  getPayments: (query = '') => apiRequest(`/payments?${query}`),

  // Reports
  getReport: (query = '') => apiRequest(`/reports/run?${query}`),

  // Notices & Marquee Announcements
  getActiveNotices: () => apiRequest('/notices/active'),
  getSuperAdminNotices: () => apiRequest('/notices/superadmin'),
  createSuperAdminNotice: (data) => apiRequest('/notices/superadmin', { method: 'POST', body: JSON.stringify(data) }),
  toggleSuperAdminNoticeStatus: (id, status) => apiRequest(`/notices/superadmin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteSuperAdminNotice: (id) => apiRequest(`/notices/superadmin/${id}`, { method: 'DELETE' }),

  getCompanyNotices: (company_id) => apiRequest(`/notices/company${company_id ? `?company_id=${company_id}` : ''}`),
  createCompanyNotice: (data) => apiRequest('/notices/company', { method: 'POST', body: JSON.stringify(data) }),
  toggleCompanyNoticeStatus: (id, status) => apiRequest(`/notices/company/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteCompanyNotice: (id) => apiRequest(`/notices/company/${id}`, { method: 'DELETE' })
};
