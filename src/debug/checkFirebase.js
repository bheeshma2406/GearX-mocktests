const admin = require('firebase-admin');
const serviceAccount = require('../lib/firebase-admin-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Prefix-based collection names to support brand/namespace changes
const PREFIX = process.env.FS_PREFIX || 'gearx';
const collections = {
  results: `${PREFIX}-results`,
  sessions: `${PREFIX}-sessions`,
  bookmarks: `${PREFIX}-bookmarks`,
  mistakes: `${PREFIX}-mistakes`,
  tests: `${PREFIX}-tests`,
  questions: `${PREFIX}-questions`,
};

async function checkCollections() {
  try {
    console.log(`Checking Firebase collections for prefix "${PREFIX}" ...`);

    const [
      resultsSnapshot,
      sessionsSnapshot,
      bookmarksSnapshot,
      mistakesSnapshot,
      testsSnapshot,
      questionsSnapshot,
    ] = await Promise.all([
      db.collection(collections.results).get(),
      db.collection(collections.sessions).get(),
      db.collection(collections.bookmarks).get(),
      db.collection(collections.mistakes).get(),
      db.collection(collections.tests).get(),
      db.collection(collections.questions).get(),
    ]);

    console.log(`${collections.results} has ${resultsSnapshot.size} documents`);
    if (resultsSnapshot.size > 0) {
      console.log('\nSample results data:');
      resultsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`Document ${index + 1}:`, {
          id: doc.id,
          testType: data.testType,
          testName: data.testName,
          submittedAt: data.submittedAt,
          totalScore: data.overallResult?.totalScore,
          sessionId: data.sessionId,
        });
      });
    }

    console.log(`\n${collections.sessions} has ${sessionsSnapshot.size} documents`);
    console.log(`${collections.bookmarks} has ${bookmarksSnapshot.size} documents`);
    console.log(`${collections.mistakes} has ${mistakesSnapshot.size} documents`);
    console.log(`${collections.tests} has ${testsSnapshot.size} documents`);
    console.log(`${collections.questions} has ${questionsSnapshot.size} documents`);
  } catch (error) {
    console.error('Error checking collections:', error);
  }
}

checkCollections().then(() => {
  console.log('Check completed');
  process.exit(0);
});
