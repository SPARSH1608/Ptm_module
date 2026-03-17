import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import teacherRoutes from './routes/teacher';
import availabilityRoutes from './routes/availability';
import formRoutes from './routes/form';
import meetingRoutes from './routes/meeting';
import masterRoutes from './routes/master';
import webhookRoutes from './routes/webhook';



dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'userid', 'deviceid', 'token', 'organizationid', 'appflavour', 'appversion', 'domainid'],
    credentials: true,
    optionsSuccessStatus: 200
}));
// Webhook must use raw body BEFORE express.json() for HMAC signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/admin', formRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/master', masterRoutes);



app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
