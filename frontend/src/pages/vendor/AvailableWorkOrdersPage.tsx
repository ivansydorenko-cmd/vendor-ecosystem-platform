import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import type { WorkOrder, ServiceCategory } from '../../types/api';
import { Search, Filter, MapPin, Calendar, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AvailableWorkOrdersResponse {
  work_orders: WorkOrder[];
}

export default function AvailableWorkOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available work orders
  const { data, isLoading, error } = useQuery<AvailableWorkOrdersResponse>({
    queryKey: ['available-work-orders'],
    queryFn: () => api.getAvailableWorkOrders(),
    refetchInterval: 30000, // Refetch every 30 seconds for new opportunities
  });

  // Fetch categories for filtering
  const { data: categories } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  // Accept work order mutation
  const acceptMutation = useMutation({
    mutationFn: (workOrderId: string) => api.acceptWorkOrder(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-work-orders'] });
    },
  });

  const workOrders = data?.work_orders || [];

  // Filter work orders
  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesCategory = !categoryFilter || wo.category_id === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.location_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.location_zipcode?.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleAcceptWorkOrder = async (workOrderId: string) => {
    if (window.confirm('Are you sure you want to accept this work order?')) {
      acceptMutation.mutate(workOrderId);
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
        <h1 className="text-3xl font-bold text-gray-900">Available Work Orders</h1>
        <p className="mt-2 text-sm text-gray-600">
          Browse and accept work opportunities in your service area
        </p>
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
                  placeholder="Search by title, city, or ZIP code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Categories</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {acceptMutation.isSuccess && (
        <div className="mb-6 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Work order accepted successfully!</h3>
              <p className="mt-1 text-sm text-green-700">
                You can view it in your{' '}
                <button
                  onClick={() => navigate('/vendor/my-work-orders')}
                  className="font-medium underline hover:text-green-900"
                >
                  assigned work orders
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {acceptMutation.isError && (
        <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error accepting work order</h3>
              <p className="mt-1 text-sm text-red-700">
                {(acceptMutation.error as Error)?.message ||
                  'The work order may have already been assigned to another vendor.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Work Orders Grid */}
      <div className="bg-white rounded-lg shadow">
        {isLoading && (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Loading available work orders...</p>
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders available</h3>
            <p className="mt-1 text-sm text-gray-500">
              {categoryFilter || searchQuery
                ? 'Try adjusting your filters to see more opportunities'
                : 'Check back later for new work opportunities in your service area'}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredWorkOrders.length > 0 && (
          <div className="divide-y divide-gray-200">
            {filteredWorkOrders.map((workOrder) => (
              <div key={workOrder.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{workOrder.title}</h3>
                      {workOrder.priority === 'high' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          High Priority
                        </span>
                      )}
                    </div>

                    {workOrder.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workOrder.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                          <p className="text-gray-500 text-xs">Preferred Date</p>
                          <p className="text-gray-900 font-medium">{formatDate(workOrder.preferred_date)}</p>
                          {workOrder.preferred_time_start && (
                            <p className="text-gray-500 text-xs">
                              {formatTime(workOrder.preferred_time_start)}
                              {workOrder.preferred_time_end && ` - ${formatTime(workOrder.preferred_time_end)}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      {workOrder.total_amount && (
                        <div className="flex items-start">
                          <DollarSign className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-500 text-xs">Estimated Value</p>
                            <p className="text-gray-900 font-medium">${Number(workOrder.total_amount).toFixed(2)}</p>
                            {workOrder.sku_name && (
                              <p className="text-gray-500 text-xs">{workOrder.sku_name}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptWorkOrder(workOrder.id)}
                      disabled={acceptMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptMutation.isPending ? 'Accepting...' : 'Accept Work Order'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      {!isLoading && filteredWorkOrders.length > 0 && (
        <div className="mt-6 rounded-md bg-blue-50 p-4 border border-blue-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>First-come-first-served:</strong> The first vendor to accept a work order will be assigned the job.
                Work orders are automatically refreshed every 30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
