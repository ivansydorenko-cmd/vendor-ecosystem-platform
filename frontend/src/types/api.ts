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
  sku_id: string;
  category_id: string;
  title: string;
  description?: string;
  location_address: string;
  location_city: string;
  location_state: string;
  location_zipcode: string;
  location_latitude?: string;
  location_longitude?: string;
  priority: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  preferred_date: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  vendor_selection_method?: string;
  special_instructions?: string;
  assigned_vendor_id?: string;
  assigned_at?: string;
  completed_at?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  sku_name?: string;
  sku_code?: string;
  sku_price?: number;
  category_name?: string;
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  line_items?: WorkOrderLineItem[];
  total_amount?: number;
}

export interface WorkOrderLineItem {
  id: string;
  work_order_id: string;
  sku_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_addon: boolean;
  addon_reason?: string;
  approval_status?: string;
  created_at: string;
  // Populated fields
  sku_name?: string;
  sku_code?: string;
  sku_description?: string;
}

export interface Invoice {
  id: string;
  work_order_id: string;
  tenant_id: string;
  vendor_id: string;
  invoice_number: string;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  status: 'pending' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  issued_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Populated fields from joins
  tenant_name?: string;
  vendor_name?: string;
  work_order_title?: string;
  line_items?: InvoiceLineItem[];
  payments?: Payment[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  work_order_line_item_id: string;
  description: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  created_at: string;
  // Populated fields
  sku_id?: string;
  sku_name?: string;
  sku_code?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: string | number;
  payment_method?: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed';
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  work_order_id: string;
  vendor_id: string;
  customer_name?: string;
  customer_email?: string;
  satisfaction_rating: number;
  nps_score?: number;
  quality_rating?: number;
  timeliness_rating?: number;
  professionalism_rating?: number;
  comments?: string;
  would_recommend?: boolean;
  submitted_at?: string;
  created_at: string;
  // Populated fields
  vendor_name?: string;
  work_order_title?: string;
}

export interface FeedbackStatistics {
  avg_satisfaction: string | number;
  avg_nps: string | number;
  avg_quality: string | number;
  avg_timeliness: string | number;
  avg_professionalism: string | number;
  total_feedback: string | number;
  would_recommend_count: string | number;
}

export interface AddonRelationship {
  id: string;
  parent_sku_id: string;
  addon_sku_id: string;
  is_auto_approved: boolean;
  created_at: string;
  // Populated fields
  parent_sku_code?: string;
  parent_sku_name?: string;
  addon_sku_code?: string;
  addon_name?: string;
  addon_description?: string;
  addon_price?: string | number;
  addon_status?: string;
  addon_category?: string;
  parent_sku?: SKU;
  addon_sku?: SKU;
}

export interface DocumentType {
  id: string;
  name: string;
  description?: string;
  category: string;
  validity_period_days?: number;
  is_required: boolean;
  created_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  expiration_date?: string;
  coverage_amount?: string | number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at?: string;
  // Populated fields
  document_type_name?: string;
  category?: string;
}

export interface UpcomingExpiration {
  id: string;
  expiration_date: string;
  document_type: string;
  vendor_id: string;
  company_name: string;
  business_email: string;
}

export interface ExpiringDocument {
  id: string;
  vendor_id: string;
  company_name: string;
  document_type_id: string;
  document_type_name: string;
  file_name: string;
  expiration_date: string;
  status: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'work_requestor' | 'vendor';
  tenant_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}
