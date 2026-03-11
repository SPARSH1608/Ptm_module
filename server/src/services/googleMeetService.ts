import { google } from 'googleapis';
import prisma from '../config/prisma';
import { Provider } from '@prisma/client';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

export const generateAuthUrl = (teacherId: number) => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state: teacherId.toString(),
        prompt: 'consent' // Force to get refresh token
    });
};

export const getTokensFromCode = async (code: string) => {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};

export const createMeetLink = async (teacherId: number, meetingDetails: { summary: string, startAt: Date, endAt: Date }) => {
    const settings = await prisma.teacherProviderSetting.findUnique({
        where: { teacherId }
    });

    if (!settings || !settings.refreshToken) {
        throw new Error('Teacher has not connected Google Calendar');
    }

    const client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
        refresh_token: settings.refreshToken,
        access_token: settings.accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: client });

    const event = {
        summary: meetingDetails.summary,
        description: 'PTM Meeting',
        start: {
            dateTime: meetingDetails.startAt.toISOString(),
            timeZone: 'Asia/Kolkata',
        },
        end: {
            dateTime: meetingDetails.endAt.toISOString(),
            timeZone: 'Asia/Kolkata',
        },
        conferenceData: {
            createRequest: {
                requestId: `meet-${Date.now()}-${teacherId}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    };

    const res = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: event,
    });

    // Update tokens in DB if they were refreshed
    if (client.credentials.access_token && client.credentials.access_token !== settings.accessToken) {
        await prisma.teacherProviderSetting.update({
            where: { teacherId },
            data: {
                accessToken: client.credentials.access_token,
                tokenExpiry: client.credentials.expiry_date ? new Date(client.credentials.expiry_date) : null
            }
        });
    }

    return res.data.hangoutLink;
};
