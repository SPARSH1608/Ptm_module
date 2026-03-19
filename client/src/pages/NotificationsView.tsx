import React, { useEffect, useState } from 'react';
import { fetchNotifications, markNotificationSeen } from '../services/notificationService';
import type { Notification } from '../services/notificationService';
import { Bell } from 'lucide-react';

const NotificationsView: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications()
            .then(data => setNotifications(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleClick = async (n: Notification) => {
        if (!n.teacherSeen) {
            await markNotificationSeen(n.id).catch(() => {});
            setNotifications(prev =>
                prev.map(item => item.id === n.id ? { ...item, teacherSeen: true } : item)
            );
            // Dispatch event so the sidebar badge re-fetches immediately
            window.dispatchEvent(new Event('notifications-updated'));
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-8 py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display tracking-tight mb-2">Notifications</h1>
                <p className="text-gray-500">Stay updated on meeting activity</p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                            <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                            <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center text-center">
                    <Bell className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">You'll see updates about your meetings here</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
                    {notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => handleClick(n)}
                            className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.teacherSeen ? 'bg-blue-50/40' : ''}`}
                        >
                            <div className="mt-1 flex-shrink-0">
                                {!n.teacherSeen
                                    ? <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                                    : <span className="w-2 h-2 rounded-full bg-transparent block" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                {n.joinUrl && (
                                    <a
                                        href={n.joinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                        Join Meeting
                                    </a>
                                )}
                                <p className="text-[11px] text-gray-400 mt-1.5">
                                    {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsView;
