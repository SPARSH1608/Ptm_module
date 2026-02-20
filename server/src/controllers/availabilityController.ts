import { Request, Response } from 'express';
import { SlotStatus } from '@prisma/client';
import prisma from '../config/prisma';

export const getAvailability = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate required' });
        return;
    }

    try {
        const slots = await prisma.slot.findMany({
            where: {
                teacherId: teacherId,
                deletedAt: null,
                startAt: {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string),
                }
            },
            include: {
                batches: {
                    include: { course: true }
                },
                availability: true, // Also include availability info
                meeting: {
                    include: {
                        student: {
                            include: { batch: true }
                        }
                    }
                }
            },
            orderBy: { startAt: 'asc' }
        });

        res.json(slots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
};

export const createAvailability = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { batchIds, startAt, endAt, slotDuration } = req.body;

    console.log('Creating availability:', { teacherId, batchIds, startAt, endAt, slotDuration });

    if (!Array.isArray(batchIds) || batchIds.length === 0) {
        res.status(400).json({ error: 'batchIds must be a non-empty array' });
        return;
    }

    const duration = parseInt(slotDuration) || 30;
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({ error: 'Invalid dates provided' });
        return;
    }

    if (start < new Date()) {
        res.status(400).json({ error: 'Cannot create availability in the past' });
        return;
    }

    try {
        // 1. Check for overlapping slots
        const overlaps = await prisma.slot.findFirst({
            where: {
                teacherId,
                deletedAt: null,
                OR: [
                    {
                        startAt: { lt: end },
                        endAt: { gt: start }
                    }
                ]
            }
        });

        if (overlaps) {
            res.status(409).json({ error: 'Availability overlaps with an existing slot' });
            return;
        }

        // 2. Verify all batches exist
        const existingBatches = await prisma.batch.findMany({
            where: { id: { in: batchIds.map((id: any) => parseInt(id)) } },
            select: { id: true }
        });

        if (existingBatches.length !== batchIds.length) {
            const existingIds = existingBatches.map(b => b.id);
            const missingIds = batchIds.filter(id => !existingIds.includes(parseInt(id)));
            res.status(400).json({ error: `Some batches do not exist: ${missingIds.join(', ')}` });
            return;
        }

        const validBatchIds = existingBatches.map(b => b.id);

        const result = await prisma.$transaction(async (tx) => {
            // 3. Create the Availability record
            const availability = await tx.availability.create({
                data: {
                    teacherId,
                    startAt: start,
                    endAt: end,
                    slotDuration: duration,
                    batches: {
                        connect: validBatchIds.map(id => ({ id }))
                    }
                }
            });

            // 4. Generate Slots
            let current = new Date(start);
            let slotCount = 0;

            while (current < end) {
                const slotStart = new Date(current);
                const slotEnd = new Date(current.getTime() + duration * 60000);

                if (slotEnd > end) break;

                await tx.slot.create({
                    data: {
                        teacherId,
                        startAt: slotStart,
                        endAt: slotEnd,
                        status: 'AVAILABLE',
                        availabilityId: availability.id, // Link to availability
                        batches: {
                            connect: validBatchIds.map(id => ({ id }))
                        }
                    }
                });

                slotCount++;
                current = slotEnd;
            }

            return { slotCount };
        }, {
            timeout: 15000
        });

        res.json({ message: 'Availability created', slots: result.slotCount });

    } catch (error) {
        console.error('Error creating availability:', error);
        res.status(500).json({
            error: 'Failed to save availability',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const updateAvailabilityStatus = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { id } = req.params;
    const { status } = req.body; // AVAILABLE or UNAVAILABLE

    try {
        const availability = await prisma.availability.findFirst({
            where: {
                id: parseInt(id as string),
                deletedAt: null
            }
        });

        if (!availability || availability.teacherId !== teacherId) {
            res.status(404).json({ error: 'Availability not found' });
            return;
        }

        if (status === 'UNAVAILABLE') {
            const bookedSlots = await prisma.slot.findFirst({
                where: {
                    availabilityId: availability.id,
                    status: 'BOOKED',
                    deletedAt: null
                }
            });

            if (bookedSlots) {
                res.status(400).json({ error: 'Cannot deactivate session: it contains booked meetings. Please cancel the meetings first.' });
                return;
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.availability.update({
                where: { id: availability.id },
                data: { status }
            });

            if (status === 'UNAVAILABLE') {
                // Cancel all associated AVAILABLE slots
                await tx.slot.updateMany({
                    where: {
                        availabilityId: availability.id,
                        status: 'AVAILABLE',
                        deletedAt: null
                    },
                    data: { status: 'CANCELLED' }
                });
            }
        });

        res.json({ message: 'Availability status updated' });
    } catch (error) {
        console.error('Error updating availability status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

export const updateSlotStatus = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { id } = req.params;
    const { status } = req.body; // AVAILABLE or CANCELLED

    try {
        const slot = await prisma.slot.findFirst({
            where: {
                id: parseInt(id as string),
                deletedAt: null
            }
        });

        if (!slot || slot.teacherId !== teacherId) {
            res.status(404).json({ error: 'Slot not found' });
            return;
        }

        if (slot.status === 'BOOKED') {
            res.status(400).json({ error: 'Cannot update status of a booked slot' });
            return;
        }

        if (status === 'AVAILABLE') {
            const availability = await prisma.availability.findUnique({
                where: { id: slot.availabilityId }
            });

            if (availability?.status === 'UNAVAILABLE') {
                res.status(400).json({ error: 'Cannot restore slot: search for the parent session and activate it first.' });
                return;
            }
        }

        await prisma.slot.update({
            where: { id: slot.id },
            data: { status }
        });

        res.json({ message: 'Slot status updated' });
    } catch (error) {
        console.error('Error updating slot status:', error);
        res.status(500).json({ error: 'Failed to update slot status' });
    }
};

export const deleteSlot = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { id } = req.params;

    try {
        const slot = await prisma.slot.findFirst({
            where: {
                id: parseInt(id as string),
                deletedAt: null
            }
        });

        if (!slot || slot.teacherId !== teacherId) {
            res.status(404).json({ error: 'Slot not found' });
            return;
        }

        if (slot.status === 'BOOKED') {
            res.status(400).json({ error: 'Cannot delete a booked slot' });
            return;
        }

        await prisma.slot.update({
            where: { id: slot.id },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
        console.error('Error deleting slot:', error);
        res.status(500).json({ error: 'Failed to delete slot' });
    }
};
