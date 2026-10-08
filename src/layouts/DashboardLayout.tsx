import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  Calendar,
  Layers,
  LogOut,
  Menu,
  X,
  Activity,
  History,
  Clock,
  User,
  Bell,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfigBanner } from '../components/common/ConfigBanner';
import { AIAssistantWidget } from '../components/ai/AIAssistantWidget';
import { APP_CONFIG } from '../config/appConfig';
import { NotificationDrawer } from '../components/notifications/NotificationDrawer';
import { AlertBannerToast } from '../components/notifications/AlertBannerToast';
import { notificationService } from '../services/notificationService';

export const DashboardLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const all = notificationService.getNotifications();
      const unread = all.filter(n => !n.read).length;
      setUnreadCount(unread);
    };
    updateCount();
    window.addEventListener('carequeue_notifications_updated', updateCount);
    window.addEventListener('carequeue_new_alert', updateCount);
    return () => {
      window.removeEventListener('carequeue_notifications_updated', updateCount);
      window.removeEventListener('carequeue_new_alert', updateCount);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = {
    admin: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
      { to: '/admin/patients', label: 'Patients', icon: Users },
      { to: '/admin/appointments', label: 'Appointments', icon: Calendar },
      { to: '/admin/queue', label: 'Live Queue Monitor', icon: Layers },
    ],
    doctor: [
      { to: '/doctor', label: 'Doctor Queue', icon: LayoutDashboard, end: true },
      { to: '/doctor/appointments', label: 'My Appointments', icon: Calendar },
    ],
    patient: [
      { to: '/patient', label: 'My Dashboard & Token', icon: LayoutDashboard, end: true },
      { to: '/patient/book', label: 'Book Appointment', icon: Calendar },
      { to: '/patient/history', label: 'Appointment History', icon: History },
    ],
  };

  const currentLinks = role ? navLinks[role] || [] : [];

  const roleLabels: Record<string, { title: string; color: string }> = {
    admin: { title: 'Admin / Receptionist', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    doctor: { title: 'Doctor Portal', color: 'bg-brand-100 text-brand-700 border-brand-200' },
    patient: { title: 'Patient Portal', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ConfigBanner />

      <div className="flex flex-1 min-h-0">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
          {/* Brand Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <img
                src="/hospital-logo.png"
                alt="Hospital Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800 tracking-tight leading-tight block">
                {APP_CONFIG.hospitalName}
              </span>
              <span className="block text-[10px] font-semibold uppercase text-brand-600 tracking-wider">
                {APP_CONFIG.systemName}
              </span>
            </div>
          </div>

          {/* User info snippet */}
          <div className="p-4 mx-3 my-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-brand-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                <img
                  src="/hospital-logo.png"
                  alt="Avatar"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</p>
                <span
                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border mt-0.5 ${
                    role ? roleLabels[role]?.color : ''
                  }`}
                >
                  {role ? roleLabels[role]?.title : 'User'}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
            {currentLinks.map(link => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 bg-white h-full flex flex-col shadow-2xl z-10">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src="/hospital-logo.png"
                      alt="Hospital Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-bold text-slate-800 text-sm leading-tight">{APP_CONFIG.hospitalName}</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {currentLinks.map(link => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-rose-600 rounded-xl hover:bg-rose-50"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-base md:text-lg font-bold text-slate-800">
                {role ? roleLabels[role]?.title : `${APP_CONFIG.hospitalName} Dashboard`}
              </h1>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* SMS & WhatsApp Queue Alerts Center Button */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 bg-white shadow-2xs flex items-center gap-1.5"
                title="SMS & WhatsApp Queue Alerts"
              >
                <div className="relative">
                  <Bell className="w-4 h-4 text-slate-700" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white font-extrabold text-[9px] flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-slate-700">
                  Alerts
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </button>

              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-white border border-brand-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                  <img
                    src="/hospital-logo.png"
                    alt="Avatar"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-700 leading-none truncate max-w-[120px]">
                    {user?.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-none mt-1 capitalize">{role}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Outlet with Dashboard Background */}
          <main
            className="flex-1 p-4 md:p-8 overflow-y-auto relative"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(248, 250, 252, 0.88) 0%, rgba(241, 245, 249, 0.94) 100%), url('/hospital-logo.png')`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center',
              backgroundAttachment: 'fixed',
              backgroundSize: 'min(500px, 60vw) auto',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Floating 24/7 AI Hospital Assistant */}
      <AIAssistantWidget />

      {/* SMS & WhatsApp Notification Drawer and Toast */}
      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <AlertBannerToast onOpenDrawer={() => setDrawerOpen(true)} />
    </div>
  );
};
