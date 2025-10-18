import { useUserRole } from '../hooks/useUserRole';

export default function DashboardPage() {
  const { role } = useUserRole();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Welcome! Your role: <span className="font-semibold">{role}</span>
        </p>
        <p className="mt-4 text-sm text-gray-500">This is a placeholder dashboard. We'll add role-specific content here.</p>
      </div>
    </div>
  );
}
