import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getForms = async (req: Request, res: Response) => {
    try {
        const forms = await prisma.form.findMany({
            include: {
                _count: {
                    select: { questions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(forms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
};

export const getFormById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const form = await prisma.form.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                questions: {
                    include: {
                        question: true
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });
        if (!form) {
            res.status(404).json({ error: 'Form not found' });
            return;
        }
        res.json(form);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch form' });
    }
};

export const getActiveForm = async (req: Request, res: Response) => {
    try {
        const form = await prisma.form.findFirst({
            where: { status: 'ACTIVE' },
            include: {
                questions: {
                    include: {
                        question: true
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });
        res.json(form);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active form' });
    }
};

export const createForm = async (req: Request, res: Response) => {
    const { name } = req.body;
    try {
        const form = await prisma.form.create({
            data: { name },
            include: {
                _count: {
                    select: { questions: true }
                }
            }
        });
        res.status(201).json(form);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create form' });
    }
};

export const toggleFormStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE or INACTIVE
    const formId = parseInt(id as string);

    try {
        const form = await prisma.$transaction(async (tx) => {
            if (status === 'ACTIVE') {
                // Deactivate all other forms
                await tx.form.updateMany({
                    where: {
                        id: { not: formId },
                        status: 'ACTIVE'
                    },
                    data: { status: 'INACTIVE' }
                });
            }

            return await tx.form.update({
                where: { id: formId },
                data: { status }
            });
        });

        res.json(form);
    } catch (error) {
        console.error('Error toggling form status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

export const addQuestionToForm = async (req: Request, res: Response) => {
    const { id } = req.params; // formId
    const { questionId, sortOrder, newQuestion } = req.body;

    try {
        let qId = questionId;

        // If admin wants to create a new question at the same time
        if (newQuestion) {
            const question = await prisma.question.create({
                data: {
                    title: newQuestion.title,
                    type: newQuestion.type,
                    options: newQuestion.options
                }
            });
            qId = question.id;
        }

        // Check if question is already in the form
        const existing = await prisma.formQuestion.findUnique({
            where: {
                formId_questionId: {
                    formId: parseInt(id as string),
                    questionId: qId
                }
            }
        });

        if (existing) {
            return res.json(existing);
        }

        const formQuestion = await prisma.formQuestion.create({
            data: {
                formId: parseInt(id as string),
                questionId: qId,
                sortOrder: sortOrder || 0
            },
            include: { question: true }
        });
        res.json(formQuestion);
    } catch (error) {
        console.error('Error adding question to form:', error);
        res.status(500).json({ error: 'Failed to add question to form' });
    }
};

export const removeQuestionFromForm = async (req: Request, res: Response) => {
    const { id, qId } = req.params;
    try {
        await prisma.formQuestion.delete({
            where: {
                formId_questionId: {
                    formId: parseInt(id as string),
                    questionId: parseInt(qId as string)
                }
            }
        });
        res.json({ message: 'Question removed from form' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove question' });
    }
};

export const updateQuestionsOrder = async (req: Request, res: Response) => {
    const { id } = req.params; // formId
    const { orders } = req.body; // Array of { questionId, sortOrder }

    try {
        await prisma.$transaction(
            orders.map((item: any) =>
                prisma.formQuestion.update({
                    where: {
                        formId_questionId: {
                            formId: parseInt(id as string),
                            questionId: item.questionId
                        }
                    },
                    data: { sortOrder: item.sortOrder }
                })
            )
        );

        res.json({ message: 'Question order updated' });
    } catch (error) {
        console.error('Error updating question order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
};

