import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const LAMBDA_URL = process.env.OTP_LAMBDA_URL

export const requestTeacherOtp = async (phoneNumber: string) => {
    try {
        if (!LAMBDA_URL) {
            throw new Error('LAMBDA_URL is not defined');
        }
        console.log(`${LAMBDA_URL}/teacher/sendOtp`)
        const response = await axios.post(`${LAMBDA_URL}/teacher/sendOtp`, {
            mobileNumber: phoneNumber
        });

        return response.data.Details; // This is the sessionId (otpSessionId)
    } catch (error: any) {
        console.error("Lambda requestTeacherOtp error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to send OTP via Lambda');
    }
};

export const verifyTeacherOtp = async (phoneNumber: string, sessionId: string, otp: string) => {
    try {
        if (!LAMBDA_URL) {
            throw new Error('LAMBDA_URL is not defined');
        }

        const response = await axios.post(`${LAMBDA_URL}/teacher/verifyOtp`, {
            mobileNumber: phoneNumber,
            otp_id: sessionId,
            otp: otp
        });

        return response.data.teacher; // Returns { userId, name, email, mobileNo }
    } catch (error: any) {
        console.error("Lambda verifyTeacherOtp error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'OTP verification failed via Lambda');
    }
};
