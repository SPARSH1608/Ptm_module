import api from './api';

export interface Notification {
    id: number;
    meetingId: number;
    title: string;
    message: string;
    joinUrl: string | null;
    studentId: number;
    teacherId: number;
    studentSeen: boolean;
    teacherSeen: boolean;
    createdAt: string;
}

export const fetchNotifications = async (): Promise<Notification[]> => {
    const res = await api.get('/notifications');
    return res.data;
};

export const markNotificationSeen = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/seen`);
};
