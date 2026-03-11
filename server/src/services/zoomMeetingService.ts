import axios from 'axios';
import { createHmac } from 'crypto';
import prisma from '../config/prisma';

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI!;
const STATE_SECRET = process.env.JWT_SECRET || 'supersecret';

const zoomBasicAuth = () =>
    Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

// State token: base64url(<teacherId>:<expiry>) + HMAC signature
// Survives server restarts, tamper-proof, no server-side storage needed.
export const generateZoomAuthUrl = (teacherId: number): string => {
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    const payload = `${teacherId}:${expiry}`;
    const sig = createHmac('sha256', STATE_SECRET).update(payload).digest('hex').slice(0, 16);
    const state = `${Buffer.from(payload).toString('base64url')}.${sig}`;

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: ZOOM_CLIENT_ID,
        redirect_uri: ZOOM_REDIRECT_URI,
        state,
    });
    return `https://zoom.us/oauth/authorize?${params.toString()}`;
};

// Verifies the HMAC-signed state token and returns teacherId, or null if invalid/expired
export const resolveZoomState = (state: string): number | null => {
    try {
        const [payloadB64, sig] = state.split('.');
        if (!payloadB64 || !sig) return null;

        const payload = Buffer.from(payloadB64, 'base64url').toString();
        const expectedSig = createHmac('sha256', STATE_SECRET).update(payload).digest('hex').slice(0, 16);
        if (sig !== expectedSig) return null;

        const [teacherIdStr, expiryStr] = payload.split(':');
        if (parseInt(expiryStr) < Date.now()) return null;

        return parseInt(teacherIdStr);
    } catch {
        return null;
    }
};

export const getZoomTokensFromCode = async (code: string) => {
    const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: ZOOM_REDIRECT_URI,
        }),
        {
            headers: {
                Authorization: `Basic ${zoomBasicAuth()}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );
    // { access_token, refresh_token, expires_in, token_type }
    return response.data;
};

const refreshZoomAccessToken = async (teacherId: number, refreshToken: string): Promise<string> => {
    const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
        {
            headers: {
                Authorization: `Basic ${zoomBasicAuth()}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );
    const tokens = response.data;
    await prisma.teacherProviderSetting.update({
        where: { teacherId },
        data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        },
    });
    return tokens.access_token as string;
};

export const createZoomMeeting = async (
    teacherId: number,
    meetingDetails: { summary: string; startAt: Date; endAt: Date }
): Promise<{ joinUrl: string; zoomMeetingId: string }> => {
    const settings = await prisma.teacherProviderSetting.findUnique({
        where: { teacherId },
    });

    if (!settings?.refreshToken) {
        throw new Error('Teacher has not connected Zoom');
    }

    // Refresh token if expired (with 5-minute buffer)
    let accessToken = settings.accessToken!;
    const isExpired = !settings.tokenExpiry || settings.tokenExpiry.getTime() < Date.now() + 5 * 60 * 1000;
    if (isExpired) {
        accessToken = await refreshZoomAccessToken(teacherId, settings.refreshToken);
    }

    const durationMins = Math.round(
        (meetingDetails.endAt.getTime() - meetingDetails.startAt.getTime()) / 60000
    );

    const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
            topic: meetingDetails.summary,
            type: 2, // Scheduled meeting
            start_time: meetingDetails.startAt.toISOString(),
            duration: durationMins,
            timezone: 'Asia/Kolkata',
            settings: {
                join_before_host: true,
                waiting_room: false,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }
    );

    return {
        joinUrl: response.data.join_url as string,
        zoomMeetingId: String(response.data.id),
    };
};
