# GearX NextJS Codebase & UI Audit

## 📋 Project Overview
- **Platform**: GearX Test Platform for JEE & UGEE Preparation
- **Framework**: Next.js 15.4.5 with React 19.1.0
- **Styling**: Tailwind CSS v4 with inline theme configuration
- **Database**: Firebase Firestore
- **Language**: TypeScript

## 🗂️ File Structure Analysis

### Core Files Examined
1. `src/app/test/[type]/[id]/start/page.tsx` - Main test interface
2. `src/lib/firebaseData.ts` - Database operations
3. `src/types/index.ts` - Type definitions
4. `src/app/layout.tsx` - Root layout
5. `src/app/page.tsx` - Homepage
6. `src/app/globals.css` - Global styles

## 🎨 UI Styling Analysis

### Current Color Palette
- **Primary Blues**: `#2563eb` (blue-600), `#1d4ed8` (blue-700)
- **Secondary Indigo**: `#4f46e5` (indigo-600), `#4338ca` (indigo-700)
- **Background**: `#ffffff` (white), `#f8fafc` (gray-50)
- **Text Colors**: `#171717` (gray-900), `#6b7280` (gray-500)
- **Status Colors**:
  - Green (Answered): `#059669` (green-600)
  - Red (Not Answered): `#dc2626` (red-600)
  - Gray (Not Visited): `#6b7280` (gray-500)
  - Purple (Review): `#7c3aed` (purple-600)
  - Blue (Answered & Review): `#2563eb` (blue-600)

### Font Configuration
- **Primary Font**: Geist Sans (Google Fonts)
- **Mono Font**: Geist Mono (Google Fonts)
- **Fallback**: Arial, Helvetica, sans-serif

### Layout Structure
- **Main Container**: `min-h-screen bg-white flex`
- **Question Area**: `w-3/4 p-4` (75% width)
- **Sidebar**: `w-1/4 bg-gray-100 p-4 border-l` (25% width)

### Component Spacing & Sizing
- **Header Padding**: `py-2`
- **Main Content Padding**: `p-4`
- **Button Padding**: `px-4 py-2` (standard), `px-3 py-1` (small)
- **Grid Gaps**: `gap-4` (standard), `gap-2` (tight)

## 🔧 State Management & Props

### Primary State Hooks
```typescript
const [questions, setQuestions] = useState<Question[]>([]);
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [session, setSession] = useState<TestSession | null>(null);
const [timeRemaining, setTimeRemaining] = useState<number>(0);
const [testName, setTestName] = useState<string>('');
const [answers, setAnswers] = useState<TestAnswer[]>([]);
const [currentSubject, setCurrentSubject] = useState<string>('Mathematics');
const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set());
```

### URL Parameters
- `type`: Test type (JEE/UGEE)
- `id`: Test ID from Firestore

### Firebase Integration
- **Collections Used**:
  - `gearx-tests`: Test metadata
  - `gearx-questions`: Question data
  - `gearx-sessions`: Test sessions
  - `gearx-results`: Test results
  - `gearx-attempts`: Test attempts history

## 🚨 Missing Functionality Checklist

### ❌ Critical Missing Features
1. **Timer Persistence**: Timer doesn't persist across page refreshes
2. **Session Management**: No session recovery mechanism
3. **Answer Persistence**: Answers not saved to Firestore during test
4. **Submit Functionality**: `handleSubmitTest()` is empty
5. **Question Status Calculation**: Status counters are hardcoded (0, 15, 8, 1)
6. **Navigation Validation**: No validation for subject switching
7. **Error Handling**: Limited error handling for failed API calls

### ⚠️ UI/UX Issues
1. **Responsive Design**: Not optimized for mobile/tablet
2. **Loading States**: Basic "Loading..." text only
3. **Accessibility**: Missing ARIA labels and keyboard navigation
4. **Image Handling**: Basic error handling for question images
5. **Modal Implementation**: "View Instructions" button not functional

### 🔧 Missing Firebase Operations
1. **Real-time Session Updates**: `updateTestSession()` not implemented
2. **Result Calculation**: No automatic score calculation
3. **Time Tracking**: No per-question time tracking
4. **Progress Saving**: No periodic progress saves

### 📊 Missing Analytics & Tracking
1. **Question Visit Tracking**: `visitedQuestions` state not utilized
2. **Time Per Question**: Not tracked or saved
3. **Subject-wise Performance**: Not calculated in real-time
4. **Attempt Statistics**: No attempt counting mechanism

## 📁 Asset Organization

### Question Images Structure
```
public/questions/
├── AD1WT7/                    # Math questions (M61-M90)
├── AITTT-0/                   # Mixed test images
├── AITTT-1/
│   ├── C/                     # Chemistry (C31-C55)
│   ├── M/                     # Mathematics (M61-M85)
│   └── P/                     # Physics (PJA25-1 to PJA25-25)
└── sample-test/
    ├── chemistry/
    ├── mathematics/
    └── physics/
```

### Image Naming Convention
- **Mathematics**: `AD1WT7-M##.png`
- **Physics**: `PJA25-##.png`
- **Chemistry**: `AD1WT7-C##.png`

## 🎯 Component Hierarchy

### Test Page Structure
```
TestPage
├── Header (Candidate info, timer, instructions)
├── Subject Navigation (Math, Physics, Chemistry)
├── Main Content
│   ├── Question Display
│   ├── Answer Options (MCQ/Integer)
│   └── Action Buttons
│       ├── Row 1: SAVE & NEXT, CLEAR, SAVE & MARK FOR REVIEW, MARK FOR REVIEW & NEXT
│       └── Row 2: BACK, NEXT, SUBMIT
└── Sidebar
    ├── Status Counters
    └── Question Index Grid
```

## 🔍 Type Definitions Analysis

### Core Types Implemented
- ✅ `Question`: Complete with all properties
- ✅ `TestAnswer`: Proper answer tracking structure
- ✅ `TestSession`: Session management structure
- ✅ `TestResult`: Result calculation structure
- ✅ `TestInfo`: Test metadata structure

### Missing Type Extensions
- ❌ Real-time session updates interface
- ❌ Question status calculation helpers
- ❌ Timer persistence interface

## 📝 Recommendations

### Immediate Fixes Needed
1. **Implement Session Persistence**: Save progress to Firestore
2. **Fix Status Counters**: Calculate dynamically from answers state
3. **Complete Submit Logic**: Implement full test submission
4. **Add Error Boundaries**: Wrap components in error boundaries
5. **Implement Timer Persistence**: Save/restore timer state

### Performance Optimizations
1. **Image Lazy Loading**: Implement for question images
2. **State Optimization**: Use useCallback for handlers
3. **Memoization**: Implement React.memo for heavy components

### Accessibility Improvements
1. **Keyboard Navigation**: Add keyboard shortcuts
2. **Screen Reader Support**: Add ARIA labels
3. **Focus Management**: Proper focus handling

---

## 📊 Current Implementation Status: 60% Complete

**Completed**: Basic UI, routing, Firebase setup, type definitions
**Missing**: Session management, persistence, calculations, error handling

