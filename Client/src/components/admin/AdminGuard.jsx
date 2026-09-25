import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminGuard() {
  const { isAdmin, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-prime-sand text-sm text-prime-muted">
        Checking admin session…
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
