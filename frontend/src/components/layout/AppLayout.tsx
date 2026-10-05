import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  FileHeart,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  EyeOff,
  BarChart3,
  Shield,
  Sparkles,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiOfflineBanner } from '@/components/layout/ApiOfflineBanner';
import { initials } from '@/utils/format';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Array<'patient' | 'doctor'>;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/records',
    label: 'Medical records',
    icon: <FileHeart className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/timeline',
    label: 'Medical timeline',
    icon: <Activity className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/access-requests',
    label: 'Access requests',
    icon: <Users className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/verification',
    label: 'Verification',
    icon: <Fingerprint className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/audit',
    label: 'Audit trail',
    icon: <ScrollText className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/security',
    label: 'Security center',
    icon: <Shield className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/privacy',
    label: 'Privacy dashboard',
    icon: <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient'],
  },
  {
    to: '/analytics',
    label: 'Health analytics',
    icon: <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/ai',
    label: 'AI assistant',
    icon: <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: <UserCog className="h-[18px] w-[18px]" aria-hidden="true" />,
    roles: ['patient', 'doctor'],
  },
];

const Brand = () => (
  <Link to="/" className="group flex items-center gap-2.5" aria-label="MediChain-AI home">
    <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-signal-400/30 bg-signal-400/10">
      <Activity className="h-4 w-4 text-signal-300" aria-hidden="true" />
      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-signal-400/20 transition group-hover:ring-signal-400/50" />
    </span>
    <span className="leading-tight">
      <span className="block text-sm font-bold tracking-tight text-white">MediChain-AI</span>
      <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Integrity layer</span>
    </span>
  </Link>
);

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Brand />

      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-signal-400/10 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-signal-300' : 'text-slate-500 group-hover:text-slate-300'}>
                  {item.icon}
                </span>
                {item.label}
                {isActive ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-signal-400"
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="divider" />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-signal-200">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
              {user.role === 'doctor' ? <Stethoscope className="h-3 w-3" /> : null}
              {user.role === 'doctor' ? (user.specialty ?? 'Doctor') : 'Patient'}
            </p>
          </div>
        </div>

        <button type="button" onClick={handleLogout} className="btn-ghost btn-sm w-full">
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <ApiOfflineBanner />

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-ink-900/50 backdrop-blur-xl lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-950/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((open) => !open)}
            aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileNavOpen}
            className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-slate-300"
          >
            {isMobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        <AnimatePresence>
          {isMobileNavOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileNavOpen(false)}
                className="fixed inset-0 z-30 bg-ink-950/70 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                className="fixed inset-y-0 left-0 z-40 w-72 border-r border-white/[0.10] bg-ink-900/95 backdrop-blur-xl lg:hidden"
              >
                <SidebarContent onNavigate={() => setIsMobileNavOpen(false)} />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <main className="flex-1">
          <div className="page-shell">{children}</div>
        </main>

        <footer className="border-t border-white/[0.06] px-6 py-4 text-center text-[11px] text-slate-600">
          MediChain-AI · production-style portfolio MVP · not a certified clinical system
          {user ? <span className="ml-2">· signed in as {user.role}</span> : null}
        </footer>
      </div>
    </div>
  );
};
