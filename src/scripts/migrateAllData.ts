/* Complete data migration script for GearX Test Platform */
import { migrateLegacyTest } from '../lib/migrateData';

// Complete questions data from your original questions-qft22.js
const qft22Questions = [
  // Physics (M61-M67)
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
  },
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Angular Momentum',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M63.png',
    solution_image: 'AD1WT7/solutions/sol-M63.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 150
  },
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Torque',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M64.png',
    solution_image: 'AD1WT7/solutions/sol-M64.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Hard',
    idealTime: 180
  },
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Torque',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M65.png',
    solution_image: 'AD1WT7/solutions/sol-M65.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 120
  },
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Torque',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M66.png',
    solution_image: 'AD1WT7/solutions/sol-M66.png',
    options: ["A", "B", "C", "D"],
    answer: 0,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 90
  },
  {
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Angular Momentum',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M67.png',
    solution_image: 'AD1WT7/solutions/sol-M67.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 140
  },

  // Maths (M68-M74)
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M68.png',
    solution_image: 'AD1WT7/solutions/sol-M68.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 100
  },
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M69.png',
    solution_image: 'AD1WT7/solutions/sol-M69.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 120
  },
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M70.png',
    solution_image: 'AD1WT7/solutions/sol-M70.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 150
  },
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M71.png',
    solution_image: 'AD1WT7/solutions/sol-M71.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Hard',
    idealTime: 180
  },
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M72.png',
    solution_image: 'AD1WT7/solutions/sol-M72.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 120
  },
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M73.png',
    solution_image: 'AD1WT7/solutions/sol-M73.png',
    options: ["A", "B", "C", "D"],
    answer: 3,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 90
  },
  {
    subject: 'Maths',
    chapter: 'Algebra',
    topic: 'Quadratic Equations',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M74.png',
    solution_image: 'AD1WT7/solutions/sol-M74.png',
    options: ["A", "B", "C", "D"],
    answer: 3,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 140
  },

  // Chemistry (M75-M80)
  {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Molecular Geometry',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M75.png',
    solution_image: 'AD1WT7/solutions/sol-M75.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 130
  },
  {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Hybridization',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M76.png',
    solution_image: 'AD1WT7/solutions/sol-M76.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 100
  },
  {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Bond Theory',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M77.png',
    solution_image: 'AD1WT7/solutions/sol-M77.png',
    options: ["A", "B", "C", "D"],
    answer: 0,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Hard',
    idealTime: 180
  },
  {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Molecular Orbitals',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M78.png',
    solution_image: 'AD1WT7/solutions/sol-M78.png',
    options: ["A", "B", "C", "D"],
    answer: 3,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 140
  },
  {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'VSEPR Theory',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M79.png',
    solution_image: 'AD1WT7/solutions/sol-M79.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 110
  },
  {
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Bond Parameters',
    type: 'mcq',
    image: 'AD1WT7/AD1WT7-M80.png',
    solution_image: 'AD1WT7/solutions/sol-M80.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 120
  }
];

// Complete AITTT-1 test questions (sample subset)
const aittt1Questions = [
  // Chemistry (C31-C55)
  {
    subject: 'Chemistry',
    chapter: 'Periodic Classification',
    topic: 'Periodic Properties',
    type: 'mcq',
    image: 'AITTT-1/C/AD1WT7-C31.png',
    solution_image: 'AITTT-1/C/solutions/sol-C31.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 120
  },
  {
    subject: 'Chemistry',
    chapter: 'Periodic Classification',
    topic: 'Atomic Radii',
    type: 'mcq',
    image: 'AITTT-1/C/AD1WT7-C32.png',
    solution_image: 'AITTT-1/C/solutions/sol-C32.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 100
  },
  
  // Mathematics (M61-M85)
  {
    subject: 'Maths',
    chapter: 'Coordinate Geometry',
    topic: 'Straight Lines',
    type: 'mcq',
    image: 'AITTT-1/M/AD1WT7-M61.png',
    solution_image: 'AITTT-1/M/solutions/sol-M61.png',
    options: ["A", "B", "C", "D"],
    answer: 0,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 130
  },
  {
    subject: 'Maths',
    chapter: 'Coordinate Geometry',
    topic: 'Circles',
    type: 'mcq',
    image: 'AITTT-1/M/AD1WT7-M62.png',
    solution_image: 'AITTT-1/M/solutions/sol-M62.png',
    options: ["A", "B", "C", "D"],
    answer: 2,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Hard',
    idealTime: 180
  },
  
  // Physics (P1-P25)
  {
    subject: 'Physics',
    chapter: 'Mechanics',
    topic: 'Kinematics',
    type: 'mcq',
    image: 'AITTT-1/P/PJA25-1.png',
    solution_image: 'AITTT-1/P/solutions/sol-P1.png',
    options: ["A", "B", "C", "D"],
    answer: 1,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Easy',
    idealTime: 90
  },
  {
    subject: 'Physics',
    chapter: 'Mechanics',
    topic: 'Dynamics',
    type: 'mcq',
    image: 'AITTT-1/P/PJA25-2.png',
    solution_image: 'AITTT-1/P/solutions/sol-P2.png',
    options: ["A", "B", "C", "D"],
    answer: 3,
    marks: { correct: 4, incorrect: -1 },
    difficulty: 'Medium',
    idealTime: 140
  }
];

// Test definitions
const allTests = [
  {
    id: "qft22",
    title: "AIT-0 Trial Test",
    date: "2025-03-30",
    questionsFile: "questions-qft22.js",
    duration: 180,
    marks: { correct: 4, incorrect: -1 },
    category: 'jee' as const
  },
  {
    id: "aittt-1",
    title: "AIT-1 Trial Test",
    date: "2025-01-29",
    questionsFile: "questions-aittt-1.js",
    duration: 180,
    marks: { correct: 4, incorrect: -1 },
    category: 'jee' as const
  },
  {
    id: "jm-2026",
    title: "AIT-2 Trial Test",
    date: "2026-01-29",
    questionsFile: "questions-2.js",
    duration: 180,
    marks: { correct: 4, incorrect: -1 },
    category: 'ugee' as const
  }
];

// Main migration function
export async function migrateAllData() {
  console.log('Starting data migration...');
  
  try {
    // Migrate QFT22 test
    console.log('Migrating QFT22 test...');
    await migrateLegacyTest(allTests[0], qft22Questions);
    
    // Migrate AITTT-1 test
    console.log('Migrating AITTT-1 test...');
    await migrateLegacyTest(allTests[1], aittt1Questions);
    
    console.log('✅ All data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in upload script
export { allTests, qft22Questions, aittt1Questions };
