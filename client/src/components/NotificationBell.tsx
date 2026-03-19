import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { fetchNotifications, markNotificationSeen } from '../services/notificationService';
import type { Notification } from '../services/notificationService';

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const load = async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data);
        } catch {
            // silently ignore
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = notifications.filter(n => !n.teacherSeen).length;

    const handleClick = async (n: Notification) => {
        if (!n.teacherSeen) {
            await markNotificationSeen(n.id).catch(() => {});
            setNotifications(prev =>
                prev.map(item => item.id === n.id ? { ...item, teacherSeen: true } : item)
            );
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(prev => !prev)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-800">Notifications</span>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications</div>
                    ) : (
                        <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                            {notifications.map(n => (
                                <li
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.teacherSeen ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.teacherSeen && (
                                            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                        <div className={!n.teacherSeen ? '' : 'pl-4'}>
                                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
