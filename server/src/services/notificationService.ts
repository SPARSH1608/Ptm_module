import prisma from '../config/prisma';

export const createBookingNotification = async (
    meetingId: number,
    studentId: number,
    teacherId: number,
    studentName: string,
    teacherName: string,
    slotStartAt: Date,
    joinUrl?: string
): Promise<void> => {
    const dateStr = new Date(slotStartAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    await prisma.notification.create({
        data: {
            meetingId,
            studentId,
            teacherId,
            title: 'Meeting Booked',
            message: `PTM meeting between ${teacherName} and ${studentName} scheduled on ${dateStr}.`,
            joinUrl: joinUrl ?? null,
        },
    });
};
