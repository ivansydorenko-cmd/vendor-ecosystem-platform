import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

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

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  getVendors(params?: { status?: string }) {
    return this.get('/vendors', params);
  }

  getVendor(id: string) {
    return this.get(`/vendors/${id}`);
  }

  qualifyVendor(data: any) {
    return this.post('/qualifications/qualify', data);
  }

  getPendingQualifications() {
    return this.get('/qualifications/pending');
  }

  getWorkOrders(params?: any) {
    return this.get('/work-orders', params);
  }

  createWorkOrder(data: any) {
    return this.post('/work-orders', data);
  }

  getAvailableWorkOrders() {
    return this.get('/work-orders/available');
  }

  getCategories() {
    return this.get('/categories');
  }

  getSKUs(params?: any) {
    return this.get('/skus', params);
  }
}

const api = new ApiClient();
export default api;
