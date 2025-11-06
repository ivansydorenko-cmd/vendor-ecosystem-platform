import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { WorkOrder } from '../../types/api';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle,
  Package,
} from 'lucide-react';

const STATUS_CONFIG = {
  created: { label: 'Created', color: 'bg-blue-100 text-blue-800' },
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  high: { label: 'High', color: 'text-red-600' },
};

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workOrder, isLoading, error } = useQuery<WorkOrder>({
    queryKey: ['work-order', id],
    queryFn: () => api.getWorkOrderById(id!),
    enabled: !!id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-sm text-gray-600">Loading work order...</p>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/work-orders')}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Work Orders
        </button>
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading work order</h3>
              <p className="mt-1 text-sm text-red-700">
                {(error as Error)?.message || 'Work order not found'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[workOrder.status as keyof typeof STATUS_CONFIG];
  const priorityConfig = PRIORITY_CONFIG[workOrder.priority as keyof typeof PRIORITY_CONFIG];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/work-orders')}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Work Orders
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{workOrder.title}</h1>
            <p className="mt-1 text-sm text-gray-500">Work Order ID: {workOrder.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${priorityConfig?.color}`}>
              {priorityConfig?.label} Priority
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig?.color}`}
            >
              {statusConfig?.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {workOrder.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
            </div>
          )}

          {/* Service Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Package className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
            </div>
            <dl className="grid grid-cols-1 gap-4">
              {workOrder.category_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{workOrder.category_name}</dd>
                </div>
              )}
              {workOrder.sku_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {workOrder.sku_name}
                    {workOrder.sku_code && <span className="text-gray-500"> ({workOrder.sku_code})</span>}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Line Items */}
          {workOrder.line_items && workOrder.line_items.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workOrder.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.sku_name || 'Service'}</div>
                          {item.is_addon && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              Add-on
                            </span>
                          )}
                          {item.addon_reason && (
                            <div className="text-xs text-gray-500 mt-1">{item.addon_reason}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${Number(item.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        ${workOrder.total_amount ? Number(workOrder.total_amount).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {workOrder.special_instructions && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Special Instructions</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{workOrder.special_instructions}</p>
            </div>
          )}

          {/* Completion Notes */}
          {workOrder.completion_notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Completion Notes</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{workOrder.completion_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
            </div>
            <dl className="space-y-3">
              <div className="flex items-start">
                <User className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                <div className="flex-1">
                  <dt className="text-xs text-gray-500">Name</dt>
                  <dd className="text-sm font-medium text-gray-900">{workOrder.customer_name}</dd>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                <div className="flex-1">
                  <dt className="text-xs text-gray-500">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900">{workOrder.customer_phone}</dd>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                <div className="flex-1">
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="text-sm font-medium text-gray-900">{workOrder.customer_email}</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Location</h2>
            </div>
            <address className="not-italic text-sm text-gray-700">
              {workOrder.location_address}
              <br />
              {workOrder.location_city}, {workOrder.location_state} {workOrder.location_zipcode}
            </address>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Preferred Date</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(workOrder.preferred_date)}</dd>
              </div>
              {workOrder.preferred_time_start && (
                <div>
                  <dt className="text-xs text-gray-500">Preferred Time</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {formatTime(workOrder.preferred_time_start)}
                    {workOrder.preferred_time_end && ` - ${formatTime(workOrder.preferred_time_end)}`}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Assigned Vendor */}
          {workOrder.assigned_vendor_id && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Assigned Vendor</h2>
              </div>
              <dl className="space-y-3">
                {workOrder.vendor_name && (
                  <div>
                    <dt className="text-xs text-gray-500">Company</dt>
                    <dd className="text-sm font-medium text-gray-900">{workOrder.vendor_name}</dd>
                  </div>
                )}
                {workOrder.vendor_email && (
                  <div>
                    <dt className="text-xs text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">{workOrder.vendor_email}</dd>
                  </div>
                )}
                {workOrder.vendor_phone && (
                  <div>
                    <dt className="text-xs text-gray-500">Phone</dt>
                    <dd className="text-sm font-medium text-gray-900">{workOrder.vendor_phone}</dd>
                  </div>
                )}
                {workOrder.assigned_at && (
                  <div>
                    <dt className="text-xs text-gray-500">Assigned On</dt>
                    <dd className="text-sm font-medium text-gray-900">{formatDateTime(workOrder.assigned_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(workOrder.created_at)}</dd>
              </div>
              {workOrder.assigned_at && (
                <div>
                  <dt className="text-xs text-gray-500">Assigned</dt>
                  <dd className="font-medium text-gray-900">{formatDateTime(workOrder.assigned_at)}</dd>
                </div>
              )}
              {workOrder.completed_at && (
                <div>
                  <dt className="text-xs text-gray-500">Completed</dt>
                  <dd className="font-medium text-gray-900">{formatDateTime(workOrder.completed_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500">Last Updated</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(workOrder.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
