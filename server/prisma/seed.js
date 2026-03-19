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

    // // clean up in reverse order of dependencies
    // try {
    //     console.log('Cleaning up database...');
    //     await prisma.formAnswer.deleteMany();
    //     await prisma.formSubmission.deleteMany();
    //     await prisma.formQuestion.deleteMany();
    //     await prisma.question.deleteMany();
    //     await prisma.form.deleteMany();
    //     await prisma.questionLookup.deleteMany();
    //     await prisma.meeting.deleteMany();
    //     await prisma.slot.deleteMany();
    //     await prisma.availability.deleteMany();
    //     await prisma.teacherBatch.deleteMany();
    //     await prisma.student.deleteMany();
    //     await prisma.batch.deleteMany();
    //     await prisma.teacherProviderSetting.deleteMany();
    //     await prisma.teacher.deleteMany();
    //     await prisma.course.deleteMany();
    //     await prisma.center.deleteMany();
    //     await prisma.user.deleteMany();
    //     console.log('Cleanup successful');
    // } catch (e) {
    //     console.log("Cleanup failed or empty db", e);
    // }

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
