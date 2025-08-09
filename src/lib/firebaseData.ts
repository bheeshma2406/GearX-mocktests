import { db, auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { Question, TestInfo, TestSession, TestResult, BookmarkDoc, MistakeNoteDoc, PercentileMapDoc } from '@/types';

// Collection names (renamed for GearX)
const COLLECTIONS = {
  TESTS: 'gearx-tests',
  QUESTIONS: 'gearx-questions',
  SESSIONS: 'gearx-sessions',
  RESULTS: 'gearx-results',
  BOOKMARKS: 'gearx-bookmarks',
  MISTAKES: 'gearx-mistakes',
  PERCENTILES: 'gearx-percentiles'
};

// ===============================
// TEST MANAGEMENT
// ===============================

// Upload a new test with its questions
export async function uploadTest(testInfo: TestInfo, questions: Question[]) {
  try {
    const batch = writeBatch(db);

    // 1. Add test info
    const testRef = doc(collection(db, COLLECTIONS.TESTS));
    const testWithId = { ...testInfo, id: testRef.id };
    batch.set(testRef, testWithId);

    // 2. Add all questions for this test
    questions.forEach(question => {
      const questionRef = doc(collection(db, COLLECTIONS.QUESTIONS));
      const questionWithTestId = { 
        ...question, 
        testId: testRef.id, // Link question to test
        id: questionRef.id 
      };
      batch.set(questionRef, questionWithTestId);
    });

    await batch.commit();
    console.log('Test uploaded successfully with ID:', testRef.id);
    return testRef.id;
  } catch (error) {
    console.error('Error uploading test:', error);
    throw error;
  }
}

// Get all available tests
export async function getAllTests(): Promise<TestInfo[]> {
  try {
    const testsSnapshot = await getDocs(
      query(collection(db, COLLECTIONS.TESTS), orderBy('scheduledDate', 'desc'))
    );
    return testsSnapshot.docs.map(doc => doc.data() as TestInfo);
  } catch (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
}

// Get specific test by ID
export async function getTestById(testId: string): Promise<TestInfo | null> {
  try {
    const testDoc = await getDoc(doc(db, COLLECTIONS.TESTS, testId));
    return testDoc.exists() ? testDoc.data() as TestInfo : null;
  } catch (error) {
    console.error('Error fetching test:', error);
    return null;
  }
}

// Get all questions for a specific test
export async function getQuestionsByTestId(testId: string): Promise<Question[]> {
  try {
    const questionsSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.QUESTIONS), 
        where('testId', '==', testId)
      )
    );
    const questions = questionsSnapshot.docs.map(doc => doc.data() as Question);
    // Sort questions by questionNumber on the client side
    return questions.sort((a, b) => a.questionNumber - b.questionNumber);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

// ===============================
// TEST SESSIONS & RESULTS
// ===============================

/**
 * Save test session; requires signed-in user to satisfy security rules.
 */
export async function saveTestSession(session: TestSession): Promise<string> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');
    const payload = { ...session, userId: uid };
    const sessionRef = await addDoc(collection(db, COLLECTIONS.SESSIONS), payload);
    return sessionRef.id;
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}

// Get test session by ID
export async function getTestSession(sessionId: string): Promise<TestSession | null> {
  try {
    const sessionDoc = await getDoc(doc(db, COLLECTIONS.SESSIONS, sessionId));
    if (sessionDoc.exists()) {
      const raw = sessionDoc.data() as any;

      // Normalize Firestore Timestamp/string -> JS Date for time fields
      const normalizeDate = (v: any): Date | undefined => {
        if (!v) return undefined;
        if (v instanceof Date) return v;
        if (typeof v?.toDate === 'function') return v.toDate();
        if (typeof v === 'string' || typeof v === 'number') {
          const d = new Date(v);
          return isNaN(d.getTime()) ? undefined : d;
        }
        return undefined;
      };

      const data: TestSession = {
        ...(raw as any),
        startTime: normalizeDate(raw.startTime) || new Date(), // fallback to now if missing
        endTime: normalizeDate(raw.endTime),
      } as TestSession;

      // Ensure the ID is set correctly
      return { ...data, id: sessionDoc.id };
    }
    return null;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

// Update test session
export async function updateTestSession(sessionId: string, updates: Partial<TestSession>) {
  try {
    // Deep clean function to remove undefined values from nested objects
    const deepClean = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => deepClean(item));
      } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        const cleaned: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          if (value !== undefined) {
            cleaned[key] = deepClean(value);
          }
        });
        return cleaned;
      }
      return obj;
    };
    
    // Clean the updates object
    const cleanUpdates = deepClean(updates);
    
    if (Object.keys(cleanUpdates).length === 0) {
      console.warn('No valid updates provided to updateTestSession');
      return;
    }
    
    await updateDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), cleanUpdates);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

/**
 * Save test result; enforces userId and submittedAt serverTimestamp for ordering.
 */
export async function saveTestResult(result: TestResult): Promise<string> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');
    const payload = {
      ...result,
      userId: uid,
      submittedAt: serverTimestamp(),
    } as any;
    const resultRef = await addDoc(collection(db, COLLECTIONS.RESULTS), payload);
    return resultRef.id;
  } catch (error) {
    console.error('Error saving result:', error);
    throw error;
  }
}

/**
 * Get test result by session ID.
 * If userId is provided (recommended), we include it in the query so reads satisfy security rules.
 */
export async function getTestResultBySession(sessionId: string, userId?: string): Promise<TestResult | null> {
  try {
    const base = collection(db, COLLECTIONS.RESULTS);
    const q = userId
      ? query(base, where('sessionId', '==', sessionId), where('userId', '==', userId))
      : query(base, where('sessionId', '==', sessionId));
    const resultsSnapshot = await getDocs(q);
    if (resultsSnapshot.empty) {
      return null;
    }
    const docData = resultsSnapshot.docs[0].data() as any;
    return { id: resultsSnapshot.docs[0].id, ...(docData as any) } as TestResult;
  } catch (error) {
    console.error('Error fetching result by session:', error);
    return null;
  }
}

// Get user's test results
export async function getUserResults(userId?: string): Promise<TestResult[]> {
  try {
    const uid = userId ?? auth.currentUser?.uid;
    if (!uid) {
      return [];
    }
    const resultsSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.RESULTS),
        where('userId', '==', uid),
        orderBy('submittedAt', 'desc')
      )
    );
    return resultsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TestResult));
  } catch (error) {
    console.error('Error fetching results:', error);
    return [];
  }
}

/**
 * Get all test results for the current user (used by history).
 * Adds userId filter to satisfy security rules.
 */
export async function getAllTestResults(): Promise<TestResult[]> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const q = query(
      collection(db, COLLECTIONS.RESULTS),
      where('userId', '==', uid),
      orderBy('submittedAt', 'desc')
    );
    const resultsSnapshot = await getDocs(q);
    const results = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TestResult));
    return results;
  } catch (error) {
    console.error('❌ Firebase: Error fetching test results:', error);
    return [];
  }
}

// Get previous test result for comparison (same test type, excluding current session)
/**
 * Get the user's previous test result (same testType, excluding current session).
 * Reads are scoped to the signed-in user to satisfy security rules.
 * Requires composite index on gearx-results: userId Asc, submittedAt Desc.
 */
export async function getPreviousTestResult(
  currentSessionId: string,
  testType: string,
  userId?: string
): Promise<TestResult | null> {
  try {
    const uid = userId ?? auth.currentUser?.uid;
    if (!uid) return null;

    // Restrict read to current user; order by submittedAt desc then filter in memory
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.RESULTS),
        where('userId', '==', uid),
        orderBy('submittedAt', 'desc'),
        limit(25)
      )
    );

    const results = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) } as TestResult))
      .filter(r =>
        r.sessionId !== currentSessionId &&
        (r.testType || '').toLowerCase() === (testType || '').toLowerCase()
      );

    return results.length ? results[0] : null;
  } catch (error) {
    console.error('❌ Firebase: Error fetching previous test result:', error);
    return null;
  }
}

/**
 * Get a display name for a testId with fallbacks.
 * 1) Try tests collection
 * 2) Fallback to any result document that has testName
 */
export async function getTestNameById(testId: string): Promise<string | null> {
  try {
    const info = await getTestById(testId);
    if (info?.name) return info.name;

    const resultsSnap = await getDocs(
      query(collection(db, COLLECTIONS.RESULTS), where('testId', '==', testId), limit(1))
    );
    if (!resultsSnap.empty) {
      const data = resultsSnap.docs[0].data() as any;
      if (data?.testName && typeof data.testName === 'string') return data.testName;
    }
    return null;
  } catch (err) {
    console.warn('getTestNameById fallback failed:', err);
    return null;
  }
}


// ===============================
// BOOKMARKS & MISTAKE NOTES
// ===============================

/**
 * Toggle bookmark for a question. Returns true if bookmarked after operation, false if removed.
 * If userId is not passed, it will be taken from the current auth user.
 */
export async function toggleBookmark(
  userId: string | undefined,
  payload: { testId: string; questionId: string; subject: 'Mathematics' | 'Physics' | 'Chemistry' }
): Promise<boolean> {
  try {
    const uid = userId ?? auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');
    
    const bookmarkId = `${uid}_${payload.questionId}`;
    const ref = doc(db, COLLECTIONS.BOOKMARKS, bookmarkId);
    
    try {
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const existingData = snap.data();
        
        // Check if we own this bookmark
        if (existingData.userId !== uid) {
          throw new Error('Cannot delete bookmark owned by another user');
        }
        
        await deleteDoc(ref);
        return false;
      } else {
        const bookmarkData = {
          userId: uid,
          testId: payload.testId,
          questionId: payload.questionId,
          subject: payload.subject,
          createdAt: serverTimestamp()
        };
        
        await setDoc(ref, bookmarkData);
        return true;
      }
    } catch (innerError: any) {
      // If we get a permission error on getDoc, the document might exist but we can't read it
      // This happens when the bookmark was created before proper userId was set
      if (innerError?.code === 'permission-denied') {
        // Try to create it anyway - if it exists, this will fail
        const bookmarkData = {
          userId: uid,
          testId: payload.testId,
          questionId: payload.questionId,
          subject: payload.subject,
          createdAt: serverTimestamp()
        };
        
        try {
          await setDoc(ref, bookmarkData);
          return true;
        } catch (createError: any) {
          // If create also fails, try to delete (in case we own it but can't read)
          if (createError?.code === 'permission-denied') {
            await deleteDoc(ref);
            return false;
          }
          throw createError;
        }
      }
      throw innerError;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
}

/**
 * Get bookmarks for a user (optionally for a specific test)
 * If userId is not provided, uses the current auth user.
 */
export async function getBookmarksForUser(userId?: string, testId?: string): Promise<BookmarkDoc[]> {
  try {
    const uid = userId ?? auth.currentUser?.uid;
    if (!uid) return [];
    const q = query(collection(db, COLLECTIONS.BOOKMARKS), where('userId', '==', uid));
    const snap = await getDocs(q);
    let items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as BookmarkDoc[];
    if (testId) items = items.filter(b => b.testId === testId);
    return items;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
}

/**
 * Convenience: Get set of bookmarked questionIds for quick lookup
 */
export async function getBookmarkedQuestionIdSet(userId: string, testId?: string): Promise<Set<string>> {
  const items = await getBookmarksForUser(userId, testId);
  return new Set(items.map(b => b.questionId));
}

/**
 * Add a mistake note for a question
 * Enforces userId from the current auth session if available.
 */
export async function addMistakeNote(note: Omit<MistakeNoteDoc, 'id' | 'createdAt'>): Promise<string> {
  try {
    const uid = note.userId ?? auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');
    const ref = await addDoc(collection(db, COLLECTIONS.MISTAKES), {
      ...note,
      userId: uid,
      createdAt: serverTimestamp()
    });
    return ref.id;
  } catch (error) {
    console.error('Error adding mistake note:', error);
    throw error;
  }
}

/**
 * Delete a mistake note by its document id
 */
export async function deleteMistakeNote(noteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.MISTAKES, noteId));
  } catch (error) {
    console.error('Error deleting mistake note:', error);
    throw error;
  }
}

/**
 * Get all mistake notes for a user
 */
export async function getMistakeNotesForUser(userId: string): Promise<MistakeNoteDoc[]> {
  try {
    // If 'guest' is passed, use actual auth user
    const uid = userId === 'guest' ? (auth.currentUser?.uid ?? userId) : userId;
    const q = query(collection(db, COLLECTIONS.MISTAKES), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MistakeNoteDoc[];
  } catch (error) {
    console.error('Error fetching mistake notes:', error);
    return [];
  }
}

/**
 * Get a single user's mistake note for a specific attempt + question
 */
export async function getMistakeNote(
  userId: string,
  attemptId: string,
  questionId: string
): Promise<MistakeNoteDoc | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.MISTAKES),
      where('userId', '==', userId),
      where('attemptId', '==', attemptId),
      where('questionId', '==', questionId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as MistakeNoteDoc;
  } catch (error) {
    console.error('Error fetching mistake note:', error);
    return null;
  }
}

/**
 * Get all mistake notes for a specific attempt (user + attemptId)
 */
export async function getMistakeNotesForAttempt(
  userId: string,
  attemptId: string
): Promise<MistakeNoteDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.MISTAKES),
      where('userId', '==', userId),
      where('attemptId', '==', attemptId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MistakeNoteDoc[];
  } catch (error) {
    console.error('Error fetching attempt mistake notes:', error);
    return [];
  }
}

/**
 * Upsert a mistake note for a user+attempt+question: creates if missing, updates if exists
 * Enforces userId from the current auth session if available.
 */
export async function upsertMistakeNote(
  note: Omit<MistakeNoteDoc, 'id' | 'createdAt'>
): Promise<{ id: string; updated: boolean }> {
  try {
    const uid = note.userId ?? auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');

    const existing = await getMistakeNote(uid, note.attemptId, note.questionId);
    if (existing?.id) {
      await updateDoc(doc(db, COLLECTIONS.MISTAKES, existing.id), {
        note: note.note,
        tags: note.tags || [],
        // keep original createdAt; we could add updatedAt later if needed
      });
      return { id: existing.id, updated: true };
    }
    const ref = await addDoc(collection(db, COLLECTIONS.MISTAKES), {
      ...note,
      userId: uid,
      createdAt: serverTimestamp()
    });
    return { id: ref.id, updated: false };
  } catch (error) {
    console.error('Error upserting mistake note:', error);
    throw error;
  }
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

// Delete a test and all its questions
export async function deleteTest(testId: string) {
  try {
    const batch = writeBatch(db);

    // Delete test
    batch.delete(doc(db, COLLECTIONS.TESTS, testId));

    // Delete all questions for this test
    const questionsSnapshot = await getDocs(
      query(collection(db, COLLECTIONS.QUESTIONS), where('testId', '==', testId))
    );
    
    questionsSnapshot.docs.forEach(questionDoc => {
      batch.delete(questionDoc.ref);
    });

    await batch.commit();
    console.log('Test deleted successfully');
  } catch (error) {
    console.error('Error deleting test:', error);
    throw error;
  }
}

// ===============================
// PERCENTILE MAPS
// ===============================

/**
 * Save or update percentile map for a test.
 * Document id = testId for O(1) lookup.
 */
export async function savePercentileMap(
  testId: string,
  map: number[],
  maxMarks: number
): Promise<string> {
  try {
    if (!Array.isArray(map) || map.length === 0) {
      throw new Error('Percentile map is empty');
    }
    const payload: PercentileMapDoc = {
      testId,
      maxMarks,
      map,
      updatedAt: serverTimestamp(),
    } as any;

    await setDoc(doc(db, COLLECTIONS.PERCENTILES, testId), payload, { merge: true });
    return testId;
  } catch (error) {
    console.error('Error saving percentile map:', error);
    throw error;
  }
}

/**
 * Fetch percentile map for a test.
 */
export async function getPercentileMap(testId: string): Promise<PercentileMapDoc | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.PERCENTILES, testId));
    if (!snap.exists()) return null;
    const data = snap.data() as PercentileMapDoc;
    // Defensive normalization
    if (!Array.isArray(data.map)) return null;
    return {
      ...data,
      testId: data.testId || testId,
    };
  } catch (error) {
    console.error('Error fetching percentile map:', error);
    return null;
  }
}
