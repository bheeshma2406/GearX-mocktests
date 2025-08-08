/**
 * Smoke script to verify:
 * 1) Cloudinary upload to gearx/* folders
 * 2) Firestore writes recreate gearx-* collections (tests/questions)
 *
 * Usage:
 *   npm run smoke
 *
 * Notes:
 * - Loads .env.local manually (no dotenv dependency).
 * - Uses client Firestore SDK; ensure your Firestore rules allow temporary writes.
 */

import fs from 'fs';
import path from 'path';

// Lightweight .env.local loader (no dotenv dep)
function loadEnvFromFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[smoke] .env file not found at ${filePath}. Cloudinary may fail if env not present.`);
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      // Strip surrounding quotes if any
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
    console.log('[smoke] Loaded environment from', filePath);
  } catch (e) {
    console.warn('[smoke] Failed to load env file:', e);
  }
}

(async () => {
  // 1) Load environment for Cloudinary keys
  const envPath = path.resolve(process.cwd(), '.env.local');
  loadEnvFromFile(envPath);

  // 2) Init Cloudinary (server-side)
  const { initCloudinary } = await import('../lib/cloudinary');
  const cloudinary = initCloudinary();

  // 3) Pick a local sample image and upload into gearx/* paths
  const localCandidates = [
    path.resolve(process.cwd(), 'public', 'questions', 'sample-test', 'physics', 'PJA25-1.png'),
    path.resolve(process.cwd(), 'public', 'questions', 'sample-test', 'physics', 'PJA25-10.png'),
  ];
  const localFile = localCandidates.find((p) => fs.existsSync(p));
  if (!localFile) {
    console.error('[smoke] Could not find sample image under public/questions/sample-test/physics');
    process.exit(1);
  }

  const testSlug = `smoke-${Date.now()}`;
  const baseFolder = `gearx/${testSlug}/Physics`;

  // Upload to smoke folder (generic)
  const smokeFolder = `gearx/smoke/${Date.now()}`;
  console.log('[smoke] Uploading Cloudinary asset (smoke folder):', { localFile, folder: smokeFolder });

  const smokeUpload = await cloudinary.uploader.upload(localFile, {
    folder: smokeFolder,
    public_id: 'test-image',
    resource_type: 'image',
    overwrite: true,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  console.log('[smoke] Cloudinary upload (smoke) success:', {
    secure_url: smokeUpload.secure_url,
    public_id: smokeUpload.public_id,
    folder: smokeFolder,
  });

  // Upload to gearx/questions
  const questionsFolder = `gearx/questions/${testSlug}/Physics`;
  console.log('[smoke] Uploading Cloudinary asset (questions folder):', { localFile, folder: questionsFolder });

  const qUpload = await cloudinary.uploader.upload(localFile, {
    folder: questionsFolder,
    public_id: 'q1',
    resource_type: 'image',
    overwrite: true,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  console.log('[smoke] Cloudinary upload (questions) success:', {
    secure_url: qUpload.secure_url,
    public_id: qUpload.public_id,
    folder: questionsFolder,
  });

  // Upload to gearx/solutions
  const solutionsFolder = `gearx/solutions/${testSlug}/Physics`;
  console.log('[smoke] Uploading Cloudinary asset (solutions folder):', { localFile, folder: solutionsFolder });

  const sUpload = await cloudinary.uploader.upload(localFile, {
    folder: solutionsFolder,
    public_id: 'q1-solution',
    resource_type: 'image',
    overwrite: true,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  console.log('[smoke] Cloudinary upload (solutions) success:', {
    secure_url: sUpload.secure_url,
    public_id: sUpload.public_id,
    folder: solutionsFolder,
  });

  // 4) Firestore writes via our data layer (avoids duplicate SDK instances)
  const { uploadTest } = await import('../lib/firebaseData');

  const testInfo: any = {
    id: '',
    name: `Smoke Test ${testSlug}`,
    type: 'JEE',
    testType: 'Full Test',
    scheduledDate: new Date(),
    duration: 1,
    totalQuestions: 1,
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
    maxMarks: 4,
    status: 'Live',
    attempts: 0,
    description: 'Smoke seeded test for GearX project setup validation',
    createdAt: new Date(),
  };

  const questions: any[] = [
    {
      id: '',
      subject: 'Physics',
      chapter: 'Smoke',
      topic: 'Upload',
      type: 'MCQ',
      questionNumber: 1,
      imagePath: qUpload.secure_url,
      solutionPath: sUpload.secure_url,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      marks: { correct: 4, incorrect: -1 },
      difficulty: 'Easy',
      idealTime: 30,
    },
  ];

  const testId = await uploadTest(testInfo, questions);
  console.log('[smoke] Wrote test and question via uploadTest. Test ID:', testId);

  console.log('[smoke] SUCCESS. Cloudinary and Firestore smoke operations completed.');
  console.log('[smoke] Verify in Cloudinary and Firestore console:');
  console.log('  - Cloudinary folders:');
  console.log(`      ${smokeFolder}`);
  console.log(`      ${questionsFolder}`);
  console.log(`      ${solutionsFolder}`);
  console.log('  - Firestore collections: gearx-tests, gearx-questions');

  process.exit(0);
})().catch((err) => {
  console.error('[smoke] FAILED:', err);
  process.exit(1);
});