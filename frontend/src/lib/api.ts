import axios from 'axios';
import type { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private getAccessToken: (() => Promise<string>) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        if (this.getAccessToken) {
          try {
            const token = await this.getAccessToken();
            config.headers.Authorization = `Bearer ${token}`;
          } catch (error) {
            console.error('Error getting access token:', error);
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          console.error('Network Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  setTokenGetter(getter: () => Promise<string>) {
    this.getAccessToken = getter;
  }

  async get<T>(url: string, params?: unknown): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // Auth
  login(data: unknown) {
    return this.post('/auth/login', data);
  }

  // Vendors
  registerVendor(data: unknown) {
    return this.post('/vendors/register', data);
  }

  getVendors(params?: { status?: string }) {
    return this.get('/vendors', params);
  }

  getVendor(id: string) {
    return this.get(`/vendors/${id}`);
  }

  updateVendorProfile(id: string, data: unknown) {
    return this.patch(`/vendors/${id}`, data);
  }

  // Qualifications
  qualifyVendor(data: unknown) {
    return this.post('/qualifications/qualify', data);
  }

  disqualifyVendor(data: unknown) {
    return this.post('/qualifications/disqualify', data);
  }

  getVendorQualifications(vendorId: string) {
    return this.get(`/qualifications/vendor/${vendorId}`);
  }

  getTenantQualifiedVendors(tenantId: string) {
    return this.get(`/qualifications/tenant/${tenantId}`);
  }

  getPendingQualifications() {
    return this.get('/qualifications/pending');
  }

  // Work Orders
  getWorkOrders(params?: unknown) {
    return this.get('/work-orders', params);
  }

  createWorkOrder(data: unknown) {
    return this.post('/work-orders', data);
  }

  getAvailableWorkOrders() {
    return this.get('/work-orders/available');
  }

  getWorkOrderById(id: string) {
    return this.get(`/work-orders/${id}`);
  }

  acceptWorkOrder(id: string) {
    return this.post(`/work-orders/${id}/accept`);
  }

  completeWorkOrder(id: string) {
    return this.post(`/work-orders/${id}/complete`);
  }

  // Categories
  getCategories() {
    return this.get('/categories');
  }

  getCategoryById(id: string) {
    return this.get(`/categories/${id}`);
  }

  // SKUs
  getSKUs(params?: unknown) {
    return this.get('/skus', params);
  }

  getSkuById(id: string) {
    return this.get(`/skus/${id}`);
  }

  createSku(data: unknown) {
    return this.post('/skus', data);
  }

  updateSku(id: string, data: unknown) {
    return this.patch(`/skus/${id}`, data);
  }

  getSkuPriceHistory(id: string) {
    return this.get(`/skus/${id}/price-history`);
  }

  // Invoices
  getInvoices() {
    return this.get('/invoices');
  }

  getInvoiceById(id: string) {
    return this.get(`/invoices/${id}`);
  }

  createInvoiceFromWorkOrder(data: unknown) {
    return this.post('/invoices', data);
  }

  recordPayment(data: unknown) {
    return this.post('/invoices/payments', data);
  }

  updateInvoiceStatus(id: string, data: unknown) {
    return this.patch(`/invoices/${id}/status`, data);
  }

  // Feedback
  submitFeedback(data: unknown) {
    return this.post('/feedback', data);
  }

  getAllFeedback() {
    return this.get('/feedback');
  }

  getFeedbackByWorkOrder(workOrderId: string) {
    return this.get(`/feedback/work-order/${workOrderId}`);
  }

  getVendorFeedback(vendorId: string) {
    return this.get(`/feedback/vendor/${vendorId}`);
  }

  // Addons
  getAllAddonRelationships(params?: unknown) {
    return this.get('/addons', params);
  }

  getAddonsForSku(skuId: string) {
    return this.get(`/addons/sku/${skuId}`);
  }

  createAddonRelationship(data: unknown) {
    return this.post('/addons', data);
  }

  toggleAddonAutoApproval(id: string, data: unknown) {
    return this.patch(`/addons/${id}/approval`, data);
  }

  deleteAddonRelationship(id: string) {
    return this.delete(`/addons/${id}`);
  }

  // Documents
  getDocumentTypes() {
    return this.get('/documents/types');
  }

  uploadVendorDocument(data: unknown, config?: AxiosRequestConfig) {
    return this.post('/documents/upload', data, config);
  }

  getVendorDocuments(vendorId: string) {
    return this.get(`/documents/vendor/${vendorId}`);
  }

  reviewDocument(id: string, data: unknown) {
    return this.patch(`/documents/${id}/review`, data);
  }

  getExpiringDocuments() {
    return this.get('/documents/expiring');
  }

  // Reminders
  runExpirationCheck() {
    return this.post('/reminders/check');
  }

  getUpcomingExpirations() {
    return this.get('/reminders/upcoming');
  }

  // Admin - Users
  getUsers() {
    return this.get('/admin/users');
  }

  // Admin - Tenants
  getTenants() {
    return this.get('/admin/tenants');
  }
}

const api = new ApiClient();
export default api;
