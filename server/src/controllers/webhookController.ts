import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import prisma from '../config/prisma';
import { MeetingStatus } from '@prisma/client';

const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET_TOKEN!;

/**
 * Verifies Zoom's HMAC-SHA256 webhook signature.
 * Message format: v0:<x-zm-request-timestamp>:<raw body>
 */
const verifyZoomSignature = (req: Request): boolean => {
    const timestamp = req.headers['x-zm-request-timestamp'] as string;
    const incomingSig = req.headers['x-zm-signature'] as string;
    if (!timestamp || !incomingSig) return false;

    const rawBody = req.body as Buffer;
    const message = `v0:${timestamp}:${rawBody.toString()}`;
    const expected = `v0=${createHmac('sha256', ZOOM_WEBHOOK_SECRET).update(message).digest('hex')}`;
    return incomingSig === expected;
};

export const handleZoomWebhook = async (req: Request, res: Response) => {
    const rawBody = req.body as Buffer;
    let payload: any;

    try {
        payload = JSON.parse(rawBody.toString());
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    // --- URL validation challenge (one-time Zoom setup) ---
    if (payload.event === 'endpoint.url_validation') {
        const plainToken = payload.payload?.plainToken;
        const encryptedToken = createHmac('sha256', ZOOM_WEBHOOK_SECRET)
            .update(plainToken)
            .digest('hex');
        return res.json({ plainToken, encryptedToken });
    }

    // --- Signature verification for all other events ---
    if (!verifyZoomSignature(req)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    if (payload.event === 'meeting.ended') {
        const zoomMeetingId = String(payload.payload?.object?.id);
        if (zoomMeetingId) {
            try {
                const updated = await prisma.meeting.updateMany({
                    where: {
                        zoomMeetingId,
                        status: MeetingStatus.SCHEDULED,
                    },
                    data: { status: MeetingStatus.COMPLETED },
                });
                console.log(`Zoom meeting.ended: zoomMeetingId=${zoomMeetingId}, updated=${updated.count}`);
            } catch (err) {
                console.error('Failed to mark meeting completed:', err);
            }
        }
    }

    res.status(200).json({ received: true });
};
