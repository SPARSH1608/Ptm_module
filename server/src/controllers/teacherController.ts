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
        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: { providerSetting: true }
        });
        res.json(teacher);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

export const getGoogleAuthUrl = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const { generateAuthUrl } = require('../services/googleMeetService');
        const url = generateAuthUrl(teacherId);
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate Auth URL' });
    }
};

export const saveGoogleTokens = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    const { code } = req.body;

    try {
        const { getTokensFromCode } = require('../services/googleMeetService');
        const tokens = await getTokensFromCode(code);

        await prisma.teacherProviderSetting.upsert({
            where: { teacherId },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                defaultProvider: 'GOOGLE_MEET'
            },
            create: {
                teacherId,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                defaultProvider: 'GOOGLE_MEET'
            }
        });

        res.json({ message: 'Google Calendar connected successfully' });
    } catch (error) {
        console.error('Save Google Tokens Error:', error);
        res.status(500).json({ error: 'Failed to connect Google Calendar' });
    }
};

export const getZoomAuthUrl = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;
    try {
        const { generateZoomAuthUrl } = require('../services/zoomMeetingService');
        const url = generateZoomAuthUrl(teacherId);
        // Cookie fallback: Zoom sometimes doesn't echo back state param
        res.cookie('zoom_oauth_teacher', String(teacherId), {
            httpOnly: true,
            maxAge: 10 * 60 * 1000, // 10 minutes
            sameSite: 'lax',
        });
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate Zoom Auth URL' });
    }
};

// Public GET handler — called by Zoom's browser redirect (no JWT available)
// teacherId comes from the `state` param we set in generateZoomAuthUrl
export const disconnectProvider = async (req: Request, res: Response) => {
    const teacherId = (req as any).user.id;

    try {
        await prisma.teacherProviderSetting.deleteMany({ where: { teacherId } });
        res.json({ success: true });
    } catch (error) {
        console.error('Disconnect provider error:', error);
        res.status(500).json({ error: 'Failed to disconnect provider' });
    }
};

export const handleZoomOAuthCallback = async (req: Request, res: Response) => {
    const { code, state, error: zoomError } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    console.log('Zoom callback received. Query params:', req.query);

    if (zoomError) {
        console.error('Zoom returned an error:', zoomError);
        return res.redirect(`${frontendUrl}/dashboard/settings?zoom=error`);
    }

    if (!code) {
        console.error('Zoom callback missing code. Received:', { code, state });
        return res.redirect(`${frontendUrl}/dashboard/settings?zoom=error`);
    }

    let teacherId: number | null = null;

    // Primary: resolve from state param
    if (state) {
        const { resolveZoomState } = require('../services/zoomMeetingService');
        teacherId = resolveZoomState(state as string);
    }

    // Fallback: read from cookie (Zoom sometimes doesn't echo state)
    if (!teacherId && req.cookies?.zoom_oauth_teacher) {
        const parsed = parseInt(req.cookies.zoom_oauth_teacher);
        if (!isNaN(parsed)) teacherId = parsed;
    }

    if (!teacherId) {
        console.error('Zoom callback: could not resolve teacherId from state or cookie');
        return res.redirect(`${frontendUrl}/dashboard/settings?zoom=error`);
    }

    res.clearCookie('zoom_oauth_teacher');

    try {
        const { getZoomTokensFromCode } = require('../services/zoomMeetingService');
        const tokens = await getZoomTokensFromCode(code as string);

        await prisma.teacherProviderSetting.upsert({
            where: { teacherId },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
                defaultProvider: 'ZOOM'
            },
            create: {
                teacherId,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
                defaultProvider: 'ZOOM'
            }
        });

        res.redirect(`${frontendUrl}/dashboard/settings?zoom=connected`);
    } catch (error) {
        console.error('Zoom OAuth callback error:', error);
        res.redirect(`${frontendUrl}/dashboard/settings?zoom=error`);
    }
};
