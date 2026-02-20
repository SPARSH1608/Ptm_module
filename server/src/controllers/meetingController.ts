import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { SlotStatus, MeetingStatus, Provider } from '@prisma/client';

export const bookSlot = async (req: Request, res: Response) => {
    const { slotId, studentId, teacherId, responses } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if slot is still available
            const slot = await tx.slot.findUnique({
                where: { id: slotId },
                include: { availability: true }
            });

            if (!slot || slot.status !== SlotStatus.AVAILABLE || slot.deletedAt) {
                throw new Error('Slot is no longer available');
            }

            // Validation 1: Student can't book two meetings with same teacher in future
            const existingFutureMeeting = await tx.meeting.findFirst({
                where: {
                    studentId,
                    teacherId,
                    status: MeetingStatus.SCHEDULED,
                }
            });

            if (existingFutureMeeting) {
                throw new Error('You already have an upcoming meeting with this teacher. Please complete it first.');
            }

            // Validation 2: Student can’t book two or more meeting in same time slot
            const overlappingMeeting = await tx.meeting.findFirst({
                where: {
                    studentId,
                    status: MeetingStatus.SCHEDULED,
                    slot: {
                        startAt: { lt: slot.endAt },
                        endAt: { gt: slot.startAt }
                    }
                }
            });

            if (overlappingMeeting) {
                throw new Error('You already have another meeting scheduled during this time slot.');
            }

            // 2. Create Meeting
            const meeting = await tx.meeting.create({
                data: {
                    slotId,
                    studentId,
                    teacherId,
                    status: MeetingStatus.SCHEDULED,
                    providerUsed: Provider.GOOGLE_MEET, // Default
                    joinUrl: 'https://meet.google.com/abc-defg-hij', // Mock
                }
            });

            // 3. Update Slot Status
            await tx.slot.update({
                where: { id: slotId },
                data: { status: SlotStatus.BOOKED }
            });

            // 4. Handle Form Responses if any
            if (responses && Object.keys(responses).length > 0) {
                const activeForm = await tx.form.findFirst({
                    where: { status: 'ACTIVE' }
                });

                if (activeForm) {
                    const submission = await tx.formSubmission.create({
                        data: {
                            meetingId: meeting.id,
                            formId: activeForm.id
                        }
                    });

                    // Create answers
                    // responses is a map: { formQuestionId: value }
                    const answerData = Object.entries(responses as Record<string, any>).map(([formQuestionId, value]) => ({
                        submissionId: submission.id,
                        formQuestionId: parseInt(formQuestionId),
                        answerText: String(value),
                    }));

                    await tx.formAnswer.createMany({
                        data: answerData
                    });
                }
            }

            return meeting;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Booking error:', error);
        res.status(400).json({ error: error.message || 'Failed to book slot' });
    }
};

export const getMeetingResponses = async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    try {
        const responses = await prisma.formSubmission.findUnique({
            where: { meetingId: parseInt(meetingId as string) },
            include: {
                form: true,
                answers: {
                    include: {
                        formQuestion: {
                            include: { question: true }
                        }
                    }
                }
            }
        });
        res.json(responses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
};

export const getMeetingById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                slot: true,
                student: { include: { batch: true } },
                teacher: true,
                submission: {
                    include: {
                        answers: {
                            include: {
                                formQuestion: {
                                    include: { question: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(meeting);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch meeting details' });
    }
};

export const updateMeetingNotes = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notes } = req.body;

    try {
        const meeting = await prisma.meeting.update({
            where: { id: parseInt(id as string) },
            data: { notes }
        });
        res.json(meeting);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update meeting notes' });
    }
};

export const getMyMeetings = async (req: Request, res: Response) => {
    const { id, role } = (req as any).user;
    const { batchId, courseId, centerId, teacherId } = req.query;

    try {
        let where: any = {};

        if (role === 'TEACHER') {
            where.teacherId = id;
        } else if (role === 'STUDENT') {
            where.studentId = id;
        } else if (role === 'ADMIN') {
            if (teacherId) where.teacherId = parseInt(teacherId as string);
        }

        if (batchId) {
            where.student = { batchId: parseInt(batchId as string) };
        } else if (courseId || centerId) {
            where.student = {
                batch: {
                    courseId: courseId ? parseInt(courseId as string) : undefined,
                    centerId: centerId ? parseInt(centerId as string) : undefined,
                }
            };
        }

        const meetings = await prisma.meeting.findMany({
            where,
            include: {
                slot: true,
                student: {
                    include: {
                        batch: {
                            include: {
                                course: true,
                                center: true
                            }
                        }
                    }
                },
                teacher: true
            },
            orderBy: { slot: { startAt: 'desc' } }
        });
        res.json(meetings);
    } catch (error) {
        console.error('Fetch meetings error:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
};


