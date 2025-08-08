// Data migration utility to convert old format to new format
import { Question, TestInfo } from '@/types';
import { uploadTest } from './firebaseData';

// Legacy question interface from old format
interface LegacyQuestion {
  subject: string;
  chapter: string;
  topic: string;
  type: string;
  image: string;
  solution_image?: string;
  options?: string[];
  answer: number | string;
  marks: { correct: number; incorrect: number };
  difficulty: string;
  idealTime: number;
}

// Legacy test interface
interface LegacyTest {
  id: string;
  title: string;
  date: string;
  questionsFile: string;
  duration: number;
  marks: { correct: number; incorrect: number };
  category: 'jee' | 'ugee';
}

// Convert legacy question to new format
export function convertLegacyQuestion(
  legacyQuestion: LegacyQuestion, 
  questionNumber: number, 
  testId: string
): Question {
  // Map subject names
  const subjectMap: { [key: string]: 'Mathematics' | 'Physics' | 'Chemistry' } = {
    'Maths': 'Mathematics',
    'Math': 'Mathematics',
    'Mathematics': 'Mathematics',
    'Physics': 'Physics',
    'Chemistry': 'Chemistry'
  };

  // Convert answer format
  let correctAnswer: string;
  if (legacyQuestion.type === 'mcq') {
    // Convert number to letter (0 -> A, 1 -> B, etc.)
    correctAnswer = String.fromCharCode(65 + Number(legacyQuestion.answer));
  } else {
    correctAnswer = String(legacyQuestion.answer);
  }

  return {
    id: `${testId}_q${questionNumber}`,
    subject: subjectMap[legacyQuestion.subject] || 'Mathematics',
    chapter: legacyQuestion.chapter,
    topic: legacyQuestion.topic,
    type: legacyQuestion.type.toUpperCase() as 'MCQ' | 'Integer',
    questionNumber,
    imagePath: legacyQuestion.image ? `/questions/${legacyQuestion.image}` : '',
    solutionPath: legacyQuestion.solution_image ? `/questions/${legacyQuestion.solution_image}` : '',
    options: legacyQuestion.options || [],
    correctAnswer,
    marks: legacyQuestion.marks,
    difficulty: legacyQuestion.difficulty as 'Easy' | 'Medium' | 'Hard',
    idealTime: legacyQuestion.idealTime
  };
}

// Convert legacy test to new format
export function convertLegacyTest(legacyTest: LegacyTest): TestInfo {
  return {
    id: legacyTest.id,
    name: legacyTest.title,
    type: legacyTest.category.toUpperCase() as 'JEE' | 'UGEE',
    testType: 'Full Test',
    scheduledDate: new Date(legacyTest.date),
    duration: legacyTest.duration,
    totalQuestions: 0, // Will be set when questions are loaded
    subjects: ['Mathematics', 'Physics', 'Chemistry'],
    maxMarks: 0, // Will be calculated from questions
    status: 'Live',
    description: `Complete ${legacyTest.category.toUpperCase()} test with Physics, Chemistry, and Mathematics questions`,
    createdAt: new Date()
  };
}

// Helper function to load questions from old format
export async function loadLegacyQuestions(questionsFile: string): Promise<LegacyQuestion[]> {
  // Since we can't directly import files in the browser, 
  // you'll need to copy the questions data here or load it differently
  console.log(`Loading questions from ${questionsFile}`);
  
  // For now, return empty array - you'll need to manually paste the question data
  // or implement file reading logic specific to your setup
  return [];
}

// Main migration function
export async function migrateLegacyTest(
  legacyTest: LegacyTest, 
  legacyQuestions: LegacyQuestion[]
): Promise<string> {
  try {
    // Convert test info
    const testInfo = convertLegacyTest(legacyTest);
    testInfo.totalQuestions = legacyQuestions.length;
    testInfo.maxMarks = legacyQuestions.reduce((total, q) => total + q.marks.correct, 0);

    // Convert questions
    const questions = legacyQuestions.map((q, index) => 
      convertLegacyQuestion(q, index + 1, testInfo.id)
    );

    // Upload to Firebase
    const testId = await uploadTest(testInfo, questions);
    console.log(`Successfully migrated test: ${testInfo.name} with ID: ${testId}`);
    
    return testId;
  } catch (error) {
    console.error('Error migrating test:', error);
    throw error;
  }
}

// Sample data from your original questions-qft22.js
export const sampleQFT22Questions: LegacyQuestion[] = [
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Moment of Inertia',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M61.png',
    solution_image: 'AD1WT7/solutions/sol-M61.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 120
  },
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Angular Momentum',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M62.png',
    solution_image: 'AD1WT7/solutions/sol-M62.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 90
  }
  // Add more questions as needed...
];

export const sampleTests: LegacyTest[] = [
  {
    id: "qft22",
    title: "AIT-0 Trial Test",
    date: "30 Mar 2025",
    questionsFile: "questions-qft22.js",
    duration: 180,
    marks: { correct: 4, incorrect: -1 },
    category: 'jee'
  },
  {
    id: "aittt-1",
    title: "AIT-1 Trial Test",
    date: "29 Jan 2025",
    questionsFile: "questions-aittt-1.js",
    duration: 180,
    marks: { correct: 4, incorrect: -1 },
    category: 'jee'
  }
];
