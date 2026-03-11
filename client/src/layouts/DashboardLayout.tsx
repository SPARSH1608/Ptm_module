import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Calendar, Users, FileText, Settings, Search, ChevronDown, LogOut, LayoutDashboard, Menu, X, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, logout, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <div className="h-8 w-8 border-4 border-gray-900/10 border-t-gray-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    const allNavItems = [
        { icon: Calendar, label: 'Availability', path: '/dashboard/calendar', roles: ['TEACHER'] },
        { icon: Users, label: 'Meets', path: '/dashboard/meets', roles: ['ADMIN', 'TEACHER'] },
        { icon: FileText, label: 'Student Forms', path: '/dashboard/forms', roles: ['TEACHER'] },
        { icon: ClipboardList, label: 'Manage Forms', path: '/dashboard/admin/forms', roles: ['ADMIN'] },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings', roles: ['TEACHER'] },
    ];

    const navItems = allNavItems.filter(item => item.roles.includes(user.role));

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const getPageTitle = () => {
        const currentItem = allNavItems.find(item => item.path === location.pathname);
        return currentItem ? currentItem.label : 'Dashboard';
    }

    const SidebarContent = () => (
        <>
            <div className="p-6 flex items-center gap-3 mb-2">
                <div className="bg-gray-900 p-2 rounded-lg shadow-sm">
                    <LayoutDashboard className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold text-gray-900 tracking-tight font-display">PTM Module</span>
            </div>

            <nav className="flex-1 px-4 space-y-0.5">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-4">Workspace</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }: { isActive: boolean }) => clsx(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative text-sm",
                            isActive
                                ? "bg-gray-100/80 text-gray-900 font-medium"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
                        )}
                    >
                        {({ isActive }: { isActive: boolean }) => (
                            <>
                                <item.icon className={clsx("w-4.5 h-4.5 stroke-[1.5]", isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")} />
                                <span>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100 mt-auto">
                <div className="mb-4 px-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Role</div>
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">
                        {user.role}
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full text-left text-gray-500 hover:bg-gray-50 hover:text-red-500 rounded-lg transition-colors text-sm font-medium group"
                >
                    <LogOut className="w-4.5 h-4.5 stroke-[1.5] group-hover:stroke-red-500" />
                    Sign Out
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-50/50 font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <aside className="hidden md:flex flex-col w-64 bg-transparent border-r border-gray-200/50 fixed inset-y-0 z-30">
                <SidebarContent />
            </aside>

            <div className="hidden md:block w-64 flex-shrink-0"></div>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-xl"
                        >
                            <div className="absolute top-4 right-4">
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="sticky top-0 z-20 px-8 py-5 flex justify-between items-center bg-gray-50/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-medium text-gray-900 tracking-tight font-display">{getPageTitle()}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 w-64 focus-within:ring-2 focus-within:ring-gray-100 focus-within:border-gray-300 transition-all shadow-xs">
                            <Search className="w-4 h-4 text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search (⌘K)"
                                className="bg-transparent border-none text-sm w-full focus:outline-none placeholder-gray-400 text-gray-700"
                            />
                            <div className="flex items-center gap-1">
                                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded">⌘K</kbd>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>

                        <button className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-200 hover:shadow-xs group">
                            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
