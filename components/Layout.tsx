import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TableIcon, UsersIcon, CalendarIcon, ClockIcon, ChartBarIcon } from './Icons';

const navItems = [
  { path: '/dashboard', label: 'Dashboard Analis', icon: ChartBarIcon },
  { path: '/', label: 'Rekap Absensi', icon: TableIcon },
  { path: '/teachers', label: 'Data Guru', icon: UsersIcon },
  { path: '/work-schedule', label: 'Jadwal Kerja', icon: ClockIcon },
  { path: '/calendar', label: 'Pengaturan Kalender', icon: CalendarIcon },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const getPageTitle = () => {
    // Handle exact match for root path
    if (location.pathname === '/') {
        return 'Rekap Absensi';
    }
    // Find the nav item that the current path starts with, for nested routes in future
    const currentNav = navItems.find(item => item.path !== '/' && location.pathname.startsWith(item.path));
    return currentNav ? currentNav.label : 'Manajemen Absensi';
  };


  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-gray-200 flex flex-col print:hidden">
        <div className="h-16 flex items-center justify-center px-4 bg-gray-900">
          <h1 className="text-xl font-bold text-white tracking-wider">Aplikasi Absensi</h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'} // Use `end` prop for the root path to avoid it being active for all routes
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 print:hidden">
           <h2 className="text-2xl font-semibold text-gray-800">{getPageTitle()}</h2>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;