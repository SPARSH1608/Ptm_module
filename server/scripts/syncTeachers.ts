import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../src/config/prisma';
dotenv.config();

const LAMBDA_URL = process.env.LAMBDA_URL;
console.log(LAMBDA_URL);
async function syncAllData() {
    try {
        if (!LAMBDA_URL) {
            throw new Error('LAMBDA_URL is not defined in environment variables');
        }

        console.log('Fetching enriched data from AWS Lambda sync-data endpoint...');
        const url = `${LAMBDA_URL}/sync-data`;
        console.log(url);
        const response = await axios.get(url);
        // console.log(response.data);
        const { teachers, batches, centers, courses } = response.data;
        console.log('teachers', JSON.stringify(teachers))
        console.log('batches', JSON.stringify(batches))
        console.log('centers', JSON.stringify(centers))
        console.log('courses', JSON.stringify(courses))
        if (!teachers || !batches || !centers || !courses) {
            throw new Error('Invalid data format received from Lambda');
        }

        console.log(`Received: ${courses.length} courses, ${centers.length} centers, ${batches.length} batches, ${teachers.length} teachers.`);

        // 1. Sync Courses
        console.log(`Syncing ${courses.length} Courses...`);
        let courseCount = 0;
        for (const course of courses) {
            await prisma.course.upsert({
                where: { lmsId: course.courseId },
                update: { name: course.name, code: course.courseCode || course.courseId },
                create: { name: course.name, code: course.courseCode || course.courseId, lmsId: course.courseId }
            });
            courseCount++;
            if (courseCount % 50 === 0 || courseCount === courses.length) {
                console.log(`Progress: ${courseCount}/${courses.length} courses synced.`);
            }
        }

        // 2. Sync Centers
        console.log(`Syncing ${centers.length} Centers...`);
        let centerCount = 0;
        for (const center of centers) {
            await prisma.center.upsert({
                where: { lmsId: center.centerId },
                update: { name: center.name },
                create: { name: center.name, lmsId: center.centerId }
            });
            centerCount++;
            if (centerCount % 50 === 0 || centerCount === centers.length) {
                console.log(`Progress: ${centerCount}/${centers.length} centers synced.`);
            }
        }

        // 3. Sync Batches
        console.log(`Syncing ${batches.length} Batches...`);

        // Optimize: Pre-fetch centers and courses to avoid redundant lookups
        const centersMap = new Map((await prisma.center.findMany()).map(c => [c.lmsId, c.id]));
        const coursesMap = new Map((await prisma.course.findMany()).map(c => [c.lmsId, c.id]));

        let batchCount = 0;
        for (const batch of batches) {
            const centerId = centersMap.get(batch.centerId);
            const courseId = coursesMap.get(batch.courseId);

            if (!centerId || !courseId) {
                console.warn(`Skipping batch ${batch.name} due to missing center/course relation (Center: ${batch.centerId}, Course: ${batch.courseId}).`);
                batchCount++;
                continue;
            }

            await prisma.batch.upsert({
                where: { lmsId: batch.batchId },
                update: {
                    name: batch.name,
                    code: batch.batchCode || batch.batchId,
                    centerId: centerId,
                    courseId: courseId
                },
                create: {
                    name: batch.name,
                    code: batch.batchCode || batch.batchId,
                    lmsId: batch.batchId,
                    centerId: centerId,
                    courseId: courseId
                }
            });
            batchCount++;
            if (batchCount % 100 === 0 || batchCount === batches.length) {
                console.log(`Progress: ${batchCount}/${batches.length} batches synced.`);
            }
        }

        // 4. Sync Teachers
        console.log('Syncing Teachers...');
        let syncedCount = 0;
        for (const extTeacher of teachers) {
            const { name, email, mobileNo, userId, centers: extCenters, batches: extBatches } = extTeacher;

            if (!email) {
                console.warn(`Skipping teacher without email: ${name || 'Unknown'}`);
                continue;
            }

            // Find center reference (pick first one from Lambda if multiple)
            let centerId: number | undefined = undefined;
            if (extCenters && extCenters.length > 0) {
                const center = await prisma.center.findUnique({ where: { lmsId: extCenters[0] } });
                if (center) centerId = center.id;
            }

            const teacher = await prisma.teacher.upsert({
                where: { email },
                update: { name, phone: mobileNo || null, centerId: centerId || null },
                create: { name, email, phone: mobileNo || null, centerId: centerId || null }
            });

            // Sync Teacher-Batch relations
            if (extBatches && Array.isArray(extBatches)) {
                for (const extBatchId of extBatches) {
                    const batch = await prisma.batch.findUnique({ where: { lmsId: extBatchId } });
                    if (batch) {
                        await prisma.teacherBatch.upsert({
                            where: { teacherId_batchId: { teacherId: teacher.id, batchId: batch.id } },
                            update: {},
                            create: { teacherId: teacher.id, batchId: batch.id }
                        });
                    }
                }
            }

            syncedCount++;
            if (syncedCount % 10 === 0 || syncedCount === teachers.length) {
                console.log(`Progress: ${syncedCount}/${teachers.length} teachers synced.`);
            }
        }

        console.log('All data synced successfully.');
    } catch (error: any) {
        console.error('Error during sync:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

syncAllData();
