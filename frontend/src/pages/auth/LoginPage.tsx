import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Ecosystem Platform</h1>
          <p className="text-gray-600">Manage your vendor ecosystem with ease</p>
        </div>
        <button
          onClick={() => loginWithRedirect()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <LogIn className="w-5 h-5" />
          Sign In with Auth0
        </button>
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Secure authentication powered by Auth0</p>
        </div>
      </div>
    </div>
  );
}
