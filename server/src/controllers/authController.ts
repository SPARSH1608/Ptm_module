import { Request, Response } from 'express';
import prisma from '../config/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as lambdaService from '../services/lambdaService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const requestOtp = async (req: Request, res: Response) => {
    const { phoneNumber } = req.body;

    try {
        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }

        const sessionId = await lambdaService.requestTeacherOtp(phoneNumber);
        res.json({ message: 'OTP sent successfully', sessionId });
    } catch (error: any) {
        console.error('Request OTP error:', error);
        res.status(500).json({ error: error.message || 'Failed to send OTP' });
    }
};

export const verifyOtp = async (req: Request, res: Response) => {
    const { phoneNumber, sessionId, otp } = req.body;

    try {
        if (!phoneNumber || !sessionId || !otp) {
            res.status(400).json({ error: 'Missing required verification data' });
            return;
        }

        let cognitoUser;
        if (process.env.NODE_ENV === 'development' && otp === '123456') {
            cognitoUser = {
                userId: 'mock-id-' + phoneNumber,
                name: 'Mock Teacher',
                email: `teacher_${phoneNumber}@example.com`,
                mobileNo: phoneNumber
            };
        } else {
            cognitoUser = await lambdaService.verifyTeacherOtp(phoneNumber, sessionId, otp);
        }

        const teacher = await prisma.teacher.upsert({
            where: { email: cognitoUser.email },
            update: {
                name: cognitoUser.name,
                phone: phoneNumber,
                lmsId: cognitoUser.userId
            },
            create: {
                name: cognitoUser.name,
                email: cognitoUser.email,
                phone: phoneNumber,
                lmsId: cognitoUser.userId
            }
        });

        // 4. Generate Token
        const token = jwt.sign({ id: teacher.id, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { ...teacher, role: 'TEACHER' } });
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        res.status(401).json({ error: error.message || 'Verification failed' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        if (email && password) {
            // Admin Login Flow
            const admin = await prisma.user.findUnique({
                where: { email }
            });

            if (!admin || !(await bcrypt.compare(password, admin.password))) {
                res.status(401).json({ error: 'Invalid admin credentials' });
                return;
            }

            const token = jwt.sign({ id: admin.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ token, user: { ...admin, role: 'ADMIN' } });
            return;
        }

        res.status(400).json({ error: 'Missing login credentials' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

export const getMe = async (req: Request, res: Response) => {
    const { id, role } = (req as any).user;

    try {
        if (role === 'ADMIN') {
            const admin = await prisma.user.findUnique({ where: { id } });
            if (!admin) return res.status(404).json({ error: 'Admin not found' });
            res.json({ ...admin, role: 'ADMIN' });
        } else if (role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({ where: { id } });
            if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
            res.json({ ...teacher, role: 'TEACHER' });
        } else if (role === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { id },
                include: { batch: { include: { course: true } } }
            });
            if (!student) return res.status(404).json({ error: 'Student not found' });
            res.json({ ...student, role: 'STUDENT' });
        } else {
            res.status(403).json({ error: 'Invalid role' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};
