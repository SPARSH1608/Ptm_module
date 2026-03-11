import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getCenters = async (req: Request, res: Response) => {
    try {
        const centers = await prisma.center.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(centers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch centers' });
    }
};

export const getCourses = async (req: Request, res: Response) => {
    const { centerId } = req.query;
    try {
        const where: any = {};
        if (centerId) {
            where.batches = {
                some: { centerId: parseInt(centerId as string) }
            };
        }
        const courses = await prisma.course.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

export const getBatches = async (req: Request, res: Response) => {
    const { centerId, courseId } = req.query;
    try {
        const where: any = {};
        if (centerId) where.centerId = parseInt(centerId as string);
        if (courseId) where.courseId = parseInt(courseId as string);

        const batches = await prisma.batch.findMany({
            where,
            include: {
                course: true,
                center: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(batches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
};

export const getTeachers = async (req: Request, res: Response) => {
    const { centerLmsId, batchLmsId, courseLmsId } = req.query;
    try {
        const where: any = {};
        const conditions: any[] = [];

        // Fetch Batch IDs if filtering by batch or course
        if (batchLmsId || courseLmsId) {
            const batchWhere: any = {};
            if (batchLmsId) batchWhere.lmsId = batchLmsId as string;
            if (courseLmsId) batchWhere.course = { lmsId: courseLmsId as string };

            const batches = await prisma.batch.findMany({
                where: batchWhere,
                select: { id: true }
            });

            const batchIds = batches.map(b => b.id);
            conditions.push({
                teacherBatches: {
                    some: {
                        batchId: { in: batchIds }
                    }
                }
            });
        }

        // Fetch Center ID if filtering by center
        if (centerLmsId) {
            const center = await prisma.center.findUnique({
                where: { lmsId: centerLmsId as string },
                select: { id: true }
            });
            if (center) {
                conditions.push({
                    centerId: center.id
                });
            } else {
                // If center doesn't exist, return empty list
                return res.json([]);
            }
        }

        if (conditions.length > 0) {
            where.AND = conditions;
        }

        const teachers = await prisma.teacher.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        res.json(teachers);
    } catch (error: any) {
        console.error('Error in getTeachers:', error);
        res.status(500).json({
            error: 'Failed to fetch teachers',
            message: error.message,
            code: error.code,
            meta: error.meta
        });
    }
};
