// Type definitions for GearX Test Platform

export interface Question {
  id: string;
  subject: 'Mathematics' | 'Physics' | 'Chemistry';
  chapter: string;
  topic: string;
  type: 'MCQ' | 'Integer';
  questionNumber: number;
  imagePath: string; // Path to the question image
  solutionPath: string; // Path to the solution image
  options?: string[]; // For MCQ questions ["A", "B", "C", "D"]
  correctAnswer: string; // Correct answer (A/B/C/D for MCQ, number for Integer)
  explanation?: string; // Solution explanation text
  marks: {
    correct: number; // +4
    incorrect: number; // -1
  };
  difficulty: 'Easy' | 'Medium' | 'Hard';
  idealTime: number; // in seconds
}

export interface TestAnswer {
  questionId: string;
  selectedOption?: string; // A, B, C, D for MCQ
  integerAnswer?: number; // For integer type questions
  isMarkedForReview: boolean;
  isAnswered: boolean;
  timeSpent: number; // in seconds
}

export interface TestSession {
  id: string;
  testType: 'JEE' | 'UGEE';
  startTime: Date;
  endTime?: Date;
  currentSubject: 'Mathematics' | 'Physics' | 'Chemistry';
  currentQuestionIndex: number;
  answers: TestAnswer[];
  timeRemaining: number; // in seconds
  isSubmitted: boolean;
}

export interface TestResult {
  sessionId: string;
  testId: string;
  testName: string;
  testType: 'JEE' | 'UGEE';
  totalQuestions: number;
  totalMarks: number;
  timeTaken: number; // in seconds
  subjectWiseResults: {
    Mathematics: SubjectResult;
    Physics: SubjectResult;
    Chemistry: SubjectResult;
  };
  overallResult: {
    totalScore: number;
    percentage: number;
    rank?: number;
    correct: number;
    incorrect: number;
    attempted: number;
  };
  submittedAt: any;
  // Additional fields for history
  accuracy: number;
  percentile: number;
  status: 'Completed' | 'Partial';
}

export interface SubjectResult {
  subject: 'Mathematics' | 'Physics' | 'Chemistry';
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  accuracy: number;
  timeTaken: number; // in seconds
}

export interface QuestionStatus {
  answered: number;
  notAnswered: number;
  notVisited: number;
  markedForReview: number;
  answeredAndMarked: number;
}

// Test Management Types
export interface TestInfo {
  id: string;
  name: string;
  type: 'JEE' | 'UGEE'; // Test type - JEE or UGEE
  testType: 'Part Test' | 'Full Test';
  scheduledDate: Date;
  duration: number; // in minutes
  totalQuestions: number;
  subjects: ('Mathematics' | 'Physics' | 'Chemistry')[];
  maxMarks: number;
  status: 'Upcoming' | 'Live' | 'Completed';
  attempts?: number;
  bestScore?: number;
  description: string;
  createdAt: Date;
}

// Test Attempt Type for History
export interface TestAttempt {
  id: string;
  testId: string;
  testName: string;
  testType: 'JEE' | 'UGEE';
  date: Date;
  marksObtained: number;
  percentile: number;
  totalMarks: number;
  accuracy: number;
  timeTaken: number; // in minutes
  status: 'Completed' | 'Partial';
}

// Solution Review Types
export interface QuestionAnalysis {
  questionId: string;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  isBookmarked: boolean;
  mistakeType?: 'Conceptual' | 'Calculation' | 'Careless' | 'Time Management' | 'Not Attempted';
  userNotes?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isOvertime: boolean; // if timeSpent > idealTime
  timeCategory: 'Perfect' | 'Good' | 'Overtime' | 'Too Fast';
}

// Bookmark Types
export interface BookmarkedQuestion {
  questionId: string;
  question: Question;
  bookmarkedAt: Date;
  tags?: string[];
  userNotes?: string;
  priority: 'High' | 'Medium' | 'Low';
}

// Filter Types for Solution Review
export interface SolutionFilters {
  subjects: ('Mathematics' | 'Physics' | 'Chemistry')[];
  chapters: string[];
  topics: string[];
  difficulty: ('Easy' | 'Medium' | 'Hard')[];
  status: ('Correct' | 'Incorrect' | 'Not Attempted')[];
  timeCategory: ('Perfect' | 'Good' | 'Overtime' | 'Too Fast')[];
  mistakeType: ('Conceptual' | 'Calculation' | 'Careless' | 'Time Management' | 'Not Attempted')[];
  bookmarked: boolean | null;
}

// --- Added for View Solutions feature ---
// Firestore documents for bookmarks and mistake notes, plus a view model

export interface BookmarkDoc {
  id?: string;
  userId: string; // 'guest' for now
  testId: string;
  questionId: string;
  subject: 'Mathematics' | 'Physics' | 'Chemistry';
  createdAt: any; // Firestore serverTimestamp
}

export interface MistakeNoteDoc {
  id?: string;
  userId: string; // 'guest' for now
  attemptId: string; // sessionId
  testId: string;
  questionId: string;
  note: string;
  tags?: string[];
  createdAt: any; // Firestore serverTimestamp
}

/**
 * Joined data for a single solution item on the Solutions page
 */
export interface SolutionItem {
  question: Question;
  userAnswer?: string | number;
  isAnswered: boolean;
  isMarkedForReview: boolean;
  isCorrect: boolean;
  timeSpent: number;
  status: 'Correct' | 'Incorrect' | 'Skipped' | 'Review';
  isBookmarked: boolean;
}

// Percentile map document for per-test percentile lookup
export interface PercentileMapDoc {
  testId: string;        // Same as tests collection doc id
  maxMarks: number;      // Maximum total marks for the test (e.g., 300)
  map: number[];         // Array indexed by integer marks -> percentile (0..100)
  updatedAt: any;        // Firestore serverTimestamp
}
