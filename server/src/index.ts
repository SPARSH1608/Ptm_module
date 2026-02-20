import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import teacherRoutes from './routes/teacher';
import availabilityRoutes from './routes/availability';
import formRoutes from './routes/form';
import meetingRoutes from './routes/meeting';



dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/admin', formRoutes);
app.use('/api/meetings', meetingRoutes);



app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
