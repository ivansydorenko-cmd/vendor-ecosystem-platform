export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Vendor {
  id: string;
  company_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  website?: string;
  registration_status: string;
  created_at: string;
  updated_at: string;
}

export interface VendorQualification {
  id: string;
  vendor_id: string;
  tenant_id: string;
  status: 'pending' | 'qualified' | 'disqualified';
  qualified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface SKU {
  id: string;
  tenant_id?: string;
  category_id: string;
  sku_code: string;
  name: string;
  description?: string;
  current_price: number;
  estimated_duration_minutes?: number;
  status: string;
  is_addon_allowed: boolean;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  tenant_id: string;
  category_id: string;
  title: string;
  description?: string;
  location_address: string;
  location_city: string;
  location_state: string;
  location_zipcode: string;
  priority: string;
  status: string;
  assigned_vendor_id?: string;
  created_at: string;
  updated_at: string;
}
