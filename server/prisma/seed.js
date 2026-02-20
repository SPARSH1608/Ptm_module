const { PrismaClient, SlotStatus, MeetingStatus, Provider } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Start seeding ...');

    // clean up in reverse order of dependencies
    try {
        console.log('Cleaning up database...');
        await prisma.formAnswer.deleteMany();
        await prisma.formSubmission.deleteMany();
        await prisma.formQuestion.deleteMany();
        await prisma.question.deleteMany();
        await prisma.form.deleteMany();
        await prisma.questionLookup.deleteMany();
        await prisma.meeting.deleteMany();
        await prisma.slot.deleteMany();
        await prisma.availability.deleteMany();
        await prisma.teacherBatch.deleteMany();
        await prisma.student.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.teacherProviderSetting.deleteMany();
        await prisma.teacher.deleteMany();
        await prisma.course.deleteMany();
        await prisma.center.deleteMany();
        await prisma.user.deleteMany();
        console.log('Cleanup successful');
    } catch (e) {
        console.log("Cleanup failed or empty db", e);
    }

    // 0. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
        data: {
            name: 'System Admin',
            email: 'admin@ptm.com',
            password: adminPassword
        }
    });
    console.log('Created Admin User');

    // 1. Create Main Center
    const center = await prisma.center.create({
        data: {
            name: 'Main Campus',
            location: 'New York',
            lmsId: 'CENTER-001',
        },
    });
    console.log('Created Center');

    // 2. Create Courses
    const coursesData = [
        { name: 'Mathematics', code: 'MATH', lmsId: 'COURSE-MATH' },
        { name: 'Physics', code: 'PHYS', lmsId: 'COURSE-PHYS' },
        { name: 'Chemistry', code: 'CHEM', lmsId: 'COURSE-CHEM' },
        { name: 'Biology', code: 'BIO', lmsId: 'COURSE-BIO' },
        { name: 'English', code: 'ENG', lmsId: 'COURSE-ENG' },
        { name: 'History', code: 'HIST', lmsId: 'COURSE-HIST' },
        { name: 'Computer Science', code: 'CS', lmsId: 'COURSE-CS' },
    ];

    const courses = [];
    for (const c of coursesData) {
        const course = await prisma.course.create({ data: c });
        courses.push(course);
    }

    // 3. Create Teacher
    const teacher = await prisma.teacher.create({
        data: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@example.com',
            phone: '9876543210',
            centerId: center.id,
            providerSetting: {
                create: {
                    defaultProvider: Provider.GOOGLE_MEET,
                }
            }
        },
    });

    // 4. Create Batches & Assign to Teacher
    const batches = [];
    for (const course of courses) {
        // Create 1 batch per course for seeding
        const batch = await prisma.batch.create({
            data: {
                name: `${course.name} - Batch A`,
                code: `${course.code}-101`,
                lmsId: `BATCH-${course.code}-1`,
                centerId: center.id,
                courseId: course.id,
            }
        });
        batches.push(batch);

        // Assign teacher to batch
        await prisma.teacherBatch.create({
            data: {
                teacherId: teacher.id,
                batchId: batch.id,
            }
        });
    }

    // 5. Create Students
    const studentsData = [
        { name: 'Alice Smith', roll: 'R001', user: 'U001' },
        { name: 'Bob Jones', roll: 'R002', user: 'U002' },
    ];

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        await prisma.student.create({
            data: {
                name: s.name,
                rollNumber: s.roll,
                userId: s.user,
                batchId: batches[i % batches.length].id,
            }
        });
    }

    // 6. Create Questions Library
    const q1 = await prisma.question.create({
        data: {
            title: 'How would you rate your progress?',
            type: 'DROPDOWN',
            options: ['Excellent', 'Good', 'Average', 'Poor']
        }
    });

    const q2 = await prisma.question.create({
        data: {
            title: 'Any specific topics you want to discuss?',
            type: 'TEXT'
        }
    });

    // 7. Create a Form and link questions
    const form = await prisma.form.create({
        data: {
            name: 'PTM Feedback Form',
            status: 'ACTIVE',
            questions: {
                create: [
                    { questionId: q1.id, sortOrder: 1 },
                    { questionId: q2.id, sortOrder: 2 }
                ]
            }
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
