import prisma from '../config/prisma';

/**
 * Checks if a meeting can still have its form submission edited.
 * Rule: Can edit until 1 hour before the meeting starts.
 * @param meetingId The ID of the meeting
 * @returns Promise<boolean>
 */
export const canEditSubmission = async (meetingId: number): Promise<boolean> => {
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { slot: true }
        });

        if (!meeting) return false;

        const now = new Date();
        const meetingStart = new Date(meeting.slot.startAt);
        const diffInMs = meetingStart.getTime() - now.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        return diffInHours >= 1;
    } catch (error) {
        console.error('Error checking edit permission:', error);
        return false;
    }
};

/**
 * Ensures only one form is active at a time.
 * (Verification of logic already in formController)
 */
export const getActiveForm = async () => {
    return await prisma.form.findFirst({
        where: { status: 'ACTIVE' },
        include: {
            questions: {
                include: { question: true },
                orderBy: { sortOrder: 'asc' }
            }
        }
    });
};
