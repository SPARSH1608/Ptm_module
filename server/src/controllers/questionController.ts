import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getQuestions = async (req: Request, res: Response) => {
    try {
        const questions = await prisma.question.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
};

export const createQuestion = async (req: Request, res: Response) => {
    const { title, type, options } = req.body;
    try {
        const question = await prisma.question.create({
            data: {
                title,
                type,
                options
            }
        });
        res.status(201).json(question);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create question' });
    }
};

export const updateQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, type, options } = req.body;
    try {
        const question = await prisma.question.update({
            where: { id: parseInt(id as string) },
            data: {
                title,
                type,
                options
            }
        });
        res.json(question);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update question' });
    }
};

export const deleteQuestion = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.question.update({
            where: { id: parseInt(id as string) },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'Question moved to trash' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete question' });
    }
};
