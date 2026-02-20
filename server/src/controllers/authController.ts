import { Request, Response } from 'express';
import prisma from '../config/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const login = async (req: Request, res: Response) => {
    const { email, password, phoneNumber, otp } = req.body;

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

            const token = jwt.sign({ id: admin.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { ...admin, role: 'ADMIN' } });
            return;
        }

        if (phoneNumber && otp) {
            // Teacher Login Flow (Mock OTP '123456')
            if (otp !== '123456') {
                res.status(401).json({ error: 'Invalid OTP' });
                return;
            }

            const teacher = await prisma.teacher.findFirst({
                where: { phone: phoneNumber }
            });

            if (!teacher) {
                res.status(401).json({ error: 'Teacher not found' });
                return;
            }

            const token = jwt.sign({ id: teacher.id, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { ...teacher, role: 'TEACHER' } });
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
        } else {
            res.status(403).json({ error: 'Invalid role' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};
