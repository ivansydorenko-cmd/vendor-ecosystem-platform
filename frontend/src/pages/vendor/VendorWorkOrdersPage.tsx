import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import type { WorkOrder } from '../../types/api';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Phone,
} from 'lucide-react';

interface VendorWorkOrdersResponse {
  work_orders: WorkOrder[];
}

const STATUS_CONFIG = {
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

export default function VendorWorkOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [completingWorkOrderId, setCompletingWorkOrderId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Fetch vendor's assigned work orders
  const { data, isLoading, error } = useQuery<VendorWorkOrdersResponse>({
    queryKey: ['vendor-work-orders'],
    queryFn: () => api.getWorkOrders({ vendor_assigned: true }),
    refetchInterval: 60000, // Refetch every minute
  });

  // Complete work order mutation
  const completeMutation = useMutation({
    mutationFn: ({ workOrderId, notes }: { workOrderId: string; notes: string }) =>
      api.completeWorkOrder(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order'] });
      setCompletingWorkOrderId(null);
      setCompletionNotes('');
    },
  });

  const workOrders = data?.work_orders || [];

  // Filter work orders
  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesStatus = !statusFilter || wo.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.location_city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCompleteWorkOrder = (workOrderId: string) => {
    if (window.confirm('Are you sure you want to mark this work order as completed?')) {
      completeMutation.mutate({ workOrderId, notes: completionNotes });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Work Orders</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your assigned work orders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-3">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by title, customer, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {completeMutation.isSuccess && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Work order completed successfully!</h3>
              <p className="mt-1 text-sm text-green-700">The work order has been marked as completed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {completeMutation.isError && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error completing work order</h3>
              <p className="mt-1 text-sm text-red-700">{(completeMutation.error as Error)?.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      <div className="bg-white rounded-lg shadow">
        {isLoading && (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading your work orders...</p>
          </div>
        )}

        {error && (
          <div className="p-8">
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading work orders</h3>
                  <p className="mt-1 text-sm text-red-700">{(error as Error)?.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && filteredWorkOrders.length === 0 && (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter || searchQuery
                ? 'Try adjusting your filters'
                : 'You have no assigned work orders at the moment'}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredWorkOrders.length > 0 && (
          <div className="divide-y divide-gray-200">
            {filteredWorkOrders.map((workOrder) => {
              const statusConfig = STATUS_CONFIG[workOrder.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = statusConfig?.icon || Clock;
              const isCompleting = completingWorkOrderId === workOrder.id;

              return (
                <div key={workOrder.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{workOrder.title}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig?.label || workOrder.status}
                        </span>
                      </div>
                      {workOrder.description && (
                        <p className="text-sm text-gray-600 mb-3">{workOrder.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/work-orders/${workOrder.id}`)}
                      className="ml-4 text-sm text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View Details
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    {/* Customer */}
                    <div className="flex items-start">
                      <User className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Customer</p>
                        <p className="text-gray-900 font-medium">{workOrder.customer_name}</p>
                        {workOrder.customer_phone && (
                          <p className="text-gray-500 text-xs flex items-center mt-0.5">
                            <Phone className="h-3 w-3 mr-1" />
                            {workOrder.customer_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Location</p>
                        <p className="text-gray-900 font-medium">
                          {workOrder.location_city}, {workOrder.location_state}
                        </p>
                        <p className="text-gray-500 text-xs">{workOrder.location_zipcode}</p>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Schedule</p>
                        <p className="text-gray-900 font-medium">{formatDate(workOrder.preferred_date)}</p>
                        {workOrder.preferred_time_start && (
                          <p className="text-gray-500 text-xs">
                            {formatTime(workOrder.preferred_time_start)}
                            {workOrder.preferred_time_end && ` - ${formatTime(workOrder.preferred_time_end)}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    {workOrder.total_amount && (
                      <div className="flex items-start">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-500 text-xs">Value</p>
                          <p className="text-gray-900 font-medium">${Number(workOrder.total_amount).toFixed(2)}</p>
                          {workOrder.sku_name && (
                            <p className="text-gray-500 text-xs">{workOrder.sku_name}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Complete Work Order Section */}
                  {workOrder.status !== 'completed' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {!isCompleting ? (
                        <button
                          onClick={() => setCompletingWorkOrderId(workOrder.id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label htmlFor={`notes-${workOrder.id}`} className="block text-sm font-medium text-gray-700">
                              Completion Notes (Optional)
                            </label>
                            <textarea
                              id={`notes-${workOrder.id}`}
                              rows={3}
                              value={completionNotes}
                              onChange={(e) => setCompletionNotes(e.target.value)}
                              placeholder="Add any notes about the work completed..."
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCompleteWorkOrder(workOrder.id)}
                              disabled={completeMutation.isPending}
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {completeMutation.isPending ? 'Completing...' : 'Confirm Completion'}
                            </button>
                            <button
                              onClick={() => {
                                setCompletingWorkOrderId(null);
                                setCompletionNotes('');
                              }}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
