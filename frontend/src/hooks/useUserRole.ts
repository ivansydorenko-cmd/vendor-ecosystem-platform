import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

export interface UserRole {
  role: string | null;
  tenantId: string | null;
  isLoadingRole: boolean;
}

export function useUserRole(): UserRole {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isAuthenticated || !user) {
        setIsLoadingRole(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const userRole = user[`${import.meta.env.VITE_AUTH0_AUDIENCE}/roles`]?.[0] || null;
        const userTenantId = user[`${import.meta.env.VITE_AUTH0_AUDIENCE}/tenant_id`] || null;

        setRole(userRole);
        setTenantId(userTenantId);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setTenantId(null);
      } finally {
        setIsLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  return { role, tenantId, isLoadingRole };
}
