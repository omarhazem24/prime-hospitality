import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Home,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { cn } from '../../utils/cn';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/slideshow', label: 'Slideshow', icon: ImageIcon },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPin },
  { to: '/admin/compounds', label: 'Projects', icon: Building2 },
  { to: '/admin/units', label: 'Units', icon: Home },
  { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
];

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-prime-mist text-prime-ink">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-e border-prime-line bg-prime-surface px-3 py-6 sm:w-64 sm:px-4">
          <div className="px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-prime-muted">
              Prime CMS
            </p>
            <p className="mt-1 font-display text-lg font-bold tracking-[-0.02em]">Admin</p>
          </div>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition',
                    isActive
                      ? 'bg-prime-night text-prime-sand'
                      : 'text-prime-muted hover:bg-prime-mist hover:text-prime-ink'
                  )
                }
              >
                <Icon size={15} strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-prime-line pt-4">
            <p className="truncate px-2 text-xs text-prime-muted">{user?.email}</p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-prime-ink transition hover:bg-prime-mist"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
