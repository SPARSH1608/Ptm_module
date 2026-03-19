import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getNotifications = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { userId } = req.query;

    try {
        if (user?.role === 'TEACHER') {
            const notifications = await prisma.notification.findMany({
                where: { teacherId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            return res.json(notifications);
        }

        if (userId) {
            const student = await prisma.student.findUnique({
                where: { userId: String(userId) },
            });
            if (!student) return res.json([]);

            const notifications = await prisma.notification.findMany({
                where: { studentId: student.id },
                orderBy: { createdAt: 'desc' },
            });
            return res.json(notifications);
        }

        return res.status(400).json({ error: 'Missing userId or auth token' });
    } catch (err) {
        console.error('getNotifications error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const markSeen = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { userId } = req.query;
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification id' });

    try {
        if (user?.role === 'TEACHER') {
            await prisma.notification.update({
                where: { id },
                data: { teacherSeen: true },
            });
            return res.json({ success: true });
        }

        if (userId) {
            await prisma.notification.update({
                where: { id },
                data: { studentSeen: true },
            });
            return res.json({ success: true });
        }

        return res.status(400).json({ error: 'Missing userId or auth token' });
    } catch (err) {
        console.error('markSeen error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
