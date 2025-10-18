import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Building2, CheckSquare, ClipboardList, PlusCircle, List, Briefcase } from 'lucide-react';
import { useUserRole } from '../../hooks/useUserRole';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <Home className="w-5 h-5" />, roles: ['admin', 'work_requestor', 'vendor'] },
  { label: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Vendors', path: '/admin/vendors', icon: <Building2 className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Qualifications', path: '/admin/qualifications', icon: <CheckSquare className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Work Orders', path: '/work-orders', icon: <ClipboardList className="w-5 h-5" />, roles: ['admin', 'work_requestor'] },
  { label: 'Create Work Order', path: '/work-orders/create', icon: <PlusCircle className="w-5 h-5" />, roles: ['admin', 'work_requestor'] },
  { label: 'Available Work', path: '/vendor/available', icon: <List className="w-5 h-5" />, roles: ['vendor'] },
  { label: 'My Work Orders', path: '/vendor/my-orders', icon: <Briefcase className="w-5 h-5" />, roles: ['vendor'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { role } = useUserRole();

  const filteredNavItems = navItems.filter((item) => item.roles.includes(role || ''));

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
