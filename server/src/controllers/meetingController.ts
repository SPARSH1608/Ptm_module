import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { SlotStatus, MeetingStatus, Provider } from '@prisma/client';
import { createBookingNotification } from '../services/notificationService';

export const bookSlot = async (req: Request, res: Response) => {
    const { slotId, studentId: lmsUserId, studentName, teacherId: bodyTeacherId, responses } = req.body;

    try {
        // Pre-fetch slot with teacher and batches (batches needed for student auto-creation)
        const slotPrecheck = await prisma.slot.findUnique({
            where: { id: slotId },
            include: { teacher: true, batches: true }
        });

        if (!slotPrecheck || slotPrecheck.deletedAt) {
            return res.status(400).json({ error: "Slot not found" });
        }

        // Past slot check - reject immediately if the slot time has already passed
        if (new Date(slotPrecheck.startAt) <= new Date()) {
            return res.status(400).json({ error: "Cannot book a slot that has already passed" });
        }

        if (slotPrecheck.status !== SlotStatus.AVAILABLE) {
            return res.status(400).json({ error: "Slot is no longer available" });
        }

        const teacherId = bodyTeacherId || slotPrecheck.teacherId;

        // Auto-create student if not exists (upsert by LMS userId).
        // batchId is derived from the slot so we can register the student on first booking.
        const batchId = slotPrecheck.batches[0]?.id;
        if (!batchId) {
            return res.status(400).json({ error: "Slot has no associated batch. Please contact support." });
        }

        const cleanName = (studentName && studentName !== 'null' && studentName !== 'undefined') ? studentName : null;
        const studentRecord = await prisma.student.upsert({
            where: { userId: String(lmsUserId) },
            update: {
                ...(cleanName ? { name: cleanName } : {}),
                rollNumber: String(lmsUserId),
                batchId,
            },
            create: {
                userId: String(lmsUserId),
                rollNumber: String(lmsUserId),
                name: cleanName ?? `Student-${String(lmsUserId)}`,
                batchId,
            }
        });

        const studentId = studentRecord.id;

        // Resolve which provider this teacher uses and create the meeting link BEFORE
        // the DB transaction — network calls must not run inside a Prisma transaction
        // (causes P2028 timeout on the Neon pooler).
        const providerSetting = await prisma.teacherProviderSetting.findUnique({
            where: { teacherId }
        });
        const provider = providerSetting?.defaultProvider ?? Provider.GOOGLE_MEET;

        const meetingMeta = {
            summary: `PTM: ${slotPrecheck.teacher?.name} & ${studentRecord?.name}`,
            startAt: new Date(slotPrecheck.startAt),
            endAt: new Date(slotPrecheck.endAt),
        };

        let joinUrl = "https://meet.google.com/abc-defg-hij"; // fallback mock
        let zoomMeetingId: string | null = null;
        try {
            if (provider === Provider.ZOOM) {
                const { createZoomMeeting } = require("../services/zoomMeetingService");
                const result = await createZoomMeeting(teacherId, meetingMeta);
                if (result) { joinUrl = result.joinUrl; zoomMeetingId = result.zoomMeetingId; }
            } else {
                const { createMeetLink } = require("../services/googleMeetService");
                const link = await createMeetLink(teacherId, meetingMeta);
                if (link) joinUrl = link;
            }
        } catch (err) {
            console.warn(`Failed to create ${provider} link, using fallback:`, err);
        }

        // DB transaction - pure DB operations only, no network calls.
        const result = await prisma.$transaction(async (tx) => {
            // Re-check slot inside transaction (definitive concurrency guard)
            const slot = await tx.slot.findUnique({
                where: { id: slotId },
                include: { availability: true }
            });

            if (!slot || slot.status !== SlotStatus.AVAILABLE || slot.deletedAt) {
                throw new Error("Slot is no longer available");
            }

            // Past slot re-check inside transaction (guards against race conditions)
            if (new Date(slot.startAt) <= new Date()) {
                throw new Error("Cannot book a slot that has already passed");
            }

            // Validation 1: Student cannot book two meetings with same teacher in future
            const existingFutureMeeting = await tx.meeting.findFirst({
                where: {
                    studentId,
                    teacherId,
                    status: MeetingStatus.SCHEDULED,
                    slot: {
                        startAt: { gt: new Date() }
                    }
                }
            });

            if (existingFutureMeeting) {
                throw new Error("You already have an upcoming meeting with this teacher. Please complete it first.");
            }

            // Validation 2: Student cannot book two or more meetings in same time slot
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
                throw new Error("You already have another meeting scheduled during this time slot.");
            }

            // Guard against orphaned meeting records (P2002)
            const existingMeeting = await tx.meeting.findUnique({ where: { slotId } });
            if (existingMeeting) {
                throw new Error("Slot is no longer available");
            }

            // Create Meeting
            const meeting = await tx.meeting.create({
                data: {
                    slotId,
                    studentId,
                    teacherId,
                    status: MeetingStatus.SCHEDULED,
                    providerUsed: provider,
                    joinUrl,
                    zoomMeetingId,
                }
            });

            // Update Slot Status
            await tx.slot.update({
                where: { id: slotId },
                data: { status: SlotStatus.BOOKED }
            });

            // Handle Form Responses
            const activeForm = await tx.form.findFirst({
                where: { status: "ACTIVE" }
            });

            if (activeForm) {
                if (!responses || Object.keys(responses).length === 0) {
                    throw new Error("Please fill out the required form before booking.");
                }

                const submission = await tx.formSubmission.create({
                    data: {
                        meetingId: meeting.id,
                        formId: activeForm.id
                    }
                });

                const answerData = Object.entries(responses as Record<string, any>).map(([formQuestionId, value]) => ({
                    submissionId: submission.id,
                    formQuestionId: parseInt(formQuestionId),
                    answerText: String(value),
                }));

                await tx.formAnswer.createMany({
                    data: answerData
                });
            }

            return meeting;
        }, { timeout: 10000 });

        // Fire notification after successful booking (non-blocking)
        createBookingNotification(
            result.id,
            studentId,
            teacherId,
            studentRecord.name,
            slotPrecheck.teacher?.name ?? 'Teacher',
            slotPrecheck.startAt,
            result.joinUrl ?? undefined
        ).catch(err => console.error('Notification creation failed:', err));

        res.status(201).json(result);
    } catch (error: any) {
        console.error("Booking error:", error);
        res.status(400).json({ error: error.message || "Failed to book slot" });
    }
};

export const getMeetingResponses = async (req: Request, res: Response) => {
    const { id: meetingId } = req.params;
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
        res.status(500).json({ error: "Failed to fetch responses" });
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
            return res.status(404).json({ error: "Meeting not found" });
        }

        res.json(meeting);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch meeting details" });
    }
};

export const getMeetingNotes = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: parseInt(id as string) },
            select: { notes: true }
        });
        if (!meeting) return res.status(404).json({ error: "Meeting not found" });
        res.json(meeting.notes ?? null);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
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
        res.status(500).json({ error: "Failed to update meeting notes" });
    }
};

export const getMyMeetings = async (req: Request, res: Response) => {
    const jwtUser = (req as any).user;
    const role = jwtUser?.role ?? "STUDENT";

    // For teachers/admins: numeric id from JWT. For students: raw header string (no parseInt).
    const rawHeaderUserId = req.headers["userid"] as string | undefined;
    const numericId = jwtUser?.id ?? (rawHeaderUserId ? parseInt(rawHeaderUserId) : null);
    // Student identifier — keep as raw string to preserve IDs like '00011' or UUIDs.
    const studentLmsId = jwtUser ? null : (rawHeaderUserId && rawHeaderUserId !== 'null' && rawHeaderUserId !== 'undefined' ? rawHeaderUserId : null);

    if (role === "STUDENT" && !studentLmsId) {
        res.status(400).json({ error: "User identity required" });
        return;
    }
    if ((role === "TEACHER" || role === "ADMIN") && (!numericId || isNaN(numericId as number))) {
        res.status(400).json({ error: "User identity required" });
        return;
    }

    const { batchId, courseId, centerId, teacherId } = req.query;

    try {
        let where: any = {};

        if (role === "TEACHER") {
            where.teacherId = numericId;
        } else if (role === "STUDENT") {
            where.student = { userId: studentLmsId };
        } else if (role === "ADMIN") {
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
            orderBy: { slot: { startAt: "desc" } }
        });
        res.json(meetings);
    } catch (error) {
        console.error("Fetch meetings error:", error);
        res.status(500).json({ error: "Failed to fetch meetings" });
    }
};

export const getStudentMeetings = async (req: Request, res: Response) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string' || userId === 'null' || userId === 'undefined') {
        return res.status(400).json({ error: 'userId query param required' });
    }

    try {
        const meetings = await prisma.meeting.findMany({
            where: { student: { userId } },
            include: {
                slot: true,
                student: { include: { batch: { include: { course: true, center: true } } } },
                teacher: true,
            },
            orderBy: { slot: { startAt: 'desc' } },
        });
        res.json(meetings);
    } catch (error) {
        console.error('getStudentMeetings error:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
};

export const getStudentTeachers = async (req: Request, res: Response) => {
    const { id: studentId } = (req as any).user;
    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                batch: {
                    include: {
                        teacherBatches: {
                            include: { teacher: true }
                        }
                    }
                }
            }
        });

        if (!student) return res.status(404).json({ error: "Student not found" });

        const teachers = student.batch.teacherBatches.map(tb => tb.teacher);
        res.json(teachers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch teachers" });
    }
};

export const cancelMeeting = async (req: Request, res: Response) => {
    const { id } = req.params;
    const meetingId = parseInt(id as string);

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId }
        });

        if (!meeting) {
            return res.status(404).json({ error: "Meeting not found" });
        }

        if (meeting.status === MeetingStatus.CANCELLED) {
            return res.status(400).json({ error: "Meeting is already cancelled" });
        }

        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: MeetingStatus.CANCELLED }
        });

        await prisma.slot.update({
            where: { id: meeting.slotId },
            data: { status: SlotStatus.AVAILABLE }
        });

        res.json({ message: "Meeting cancelled successfully" });
    } catch (error: any) {
        console.error("Cancel meeting error:", error);
        res.status(400).json({ error: error.message || "Failed to cancel meeting" });
    }
};

export const updateFormSubmission = async (req: Request, res: Response) => {
    const { meetingId } = req.params;
    const { responses } = req.body;
    const mId = parseInt(meetingId as string);

    try {
        const { canEditSubmission } = require("../services/meetingService");
        const allowed = await canEditSubmission(mId);

        if (!allowed) {
            return res.status(403).json({ error: "Form cannot be edited within 1 hour of the meeting" });
        }

        await prisma.$transaction(async (tx) => {
            const submission = await tx.formSubmission.findUnique({
                where: { meetingId: mId }
            });

            if (!submission) throw new Error("Submission not found");

            await tx.formAnswer.deleteMany({
                where: { submissionId: submission.id }
            });

            const answerData = Object.entries(responses as Record<string, any>).map(([formQuestionId, value]) => ({
                submissionId: submission.id,
                formQuestionId: parseInt(formQuestionId),
                answerText: String(value),
            }));

            await tx.formAnswer.createMany({
                data: answerData
            });
        });

        res.json({ message: "Form submission updated successfully" });
    } catch (error: any) {
        console.error("Update submission error:", error);
        res.status(400).json({ error: error.message || "Failed to update submission" });
    }
};
