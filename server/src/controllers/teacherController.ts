import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Get batches for logged-in teacher
export const getBatches = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;

    try {
        const teacherBatches = await prisma.teacherBatch.findMany({
            where: { teacherId },
            include: {
                batch: {
                    include: {
                        course: true,
                        center: true
                    }
                }
            }
        });

        const batches = teacherBatches.map(tb => tb.batch);
        res.json(batches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
};

export const getCourses = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const teacherBatches = await prisma.teacherBatch.findMany({
            where: { teacherId },
            include: {
                batch: { include: { course: true } }
            }
        });

        const courses = Array.from(new Set(teacherBatches.map(tb => tb.batch.course.id)))
            .map(id => teacherBatches.find(tb => tb.batch.course.id === id)?.batch.course);

        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};


export const getProfile = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        res.json(teacher);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}
