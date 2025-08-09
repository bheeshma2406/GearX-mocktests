'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import FastImage from '@/components/FastImage';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import SubmitConfirmationModal from '@/components/SubmitConfirmationModal';
import TestSubmissionLoader from '@/components/TestSubmissionLoader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getQuestionsByTestId,
  getTestById,
  saveTestSession,
  updateTestSession,
  saveTestResult,
  getTestSession,
  getPercentileMap
} from '@/lib/firebaseData';
import { Question, TestSession, TestAnswer, TestResult, SubjectResult } from '@/types';
import './test-styles.css';

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { type, id } = params;
  const idStr = Array.isArray(id) ? id[0] : (id as string | undefined) ?? '';
  const typeStr = Array.isArray(type) ? type[0] : (type as string | undefined) ?? '';

  // Get user display name with fallbacks
  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'Student';
  };

  // Format time to H:MM:SS format
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [session, setSession] = useState<TestSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [testName, setTestName] = useState<string>('');
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string>('Physics');
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const timeTrackingInterval = useRef<NodeJS.Timeout | null>(null);
  const [currentTimeSpent, setCurrentTimeSpent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Preload images for faster question switching
  useImagePreloader(questions, currentQuestionIndex, 3);
  
  // Get unique subjects from questions
  const subjects = ['Mathematics', 'Physics', 'Chemistry'];
  
  // Filter questions by current subject
  const getFilteredQuestions = () => {
    return questions.filter(q => q.subject === currentSubject);
  };
  
  // Get current filtered question index based on filtered array
  const filteredQuestionsArray = getFilteredQuestions();
  const currentFilteredIndex = Math.max(0, filteredQuestionsArray.findIndex(q => q.id === questions[currentQuestionIndex]?.id));
  
// Handle subject change
  const handleSubjectChange = (subject: string) => {
    setCurrentSubject(subject);
    // Find first question of selected subject
    const firstQuestionOfSubject = questions.findIndex(q => q.subject === subject);
    if (firstQuestionOfSubject !== -1) {
      setCurrentQuestionIndex(firstQuestionOfSubject);
    }
  };

  // Restore session from Firestore
  const restoreSession = async (sessionId: string): Promise<TestSession | null> => {
    try {
      return await getTestSession(sessionId);
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  };

  const fetchTestDetails = async () => {
    try {
      const test = await getTestById(idStr);
      if (test) {
        setTestName(test.name);
        setTimeRemaining(test.duration * 60); // Convert minutes to seconds
      }
    } catch (err) {
      setError('Failed to fetch test details. Please try again later.');
    }
  };

  const fetchQuestions = async () => {
    try {
      const fetchedQuestions = await getQuestionsByTestId(idStr);
      console.log('Fetched questions:', fetchedQuestions);
      setQuestions(fetchedQuestions);
      
      // Only set answers if we don't have a session with existing answers
      if (!session || !session.answers || session.answers.length === 0) {
        setAnswers(
          fetchedQuestions.map((question) => ({
            questionId: question.id,
            isMarkedForReview: false,
            isAnswered: false,
            timeSpent: 0,
          }))
        );
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to fetch questions. Please try again later.');
      setLoading(false);
    }
  };

  const initializeSession = async () => {
    try {
      const existingSessionId = sessionStorage.getItem(`session-${idStr}`);
      if (existingSessionId) {
        console.log('Found existing session ID:', existingSessionId);
        const restoredSession = await restoreSession(existingSessionId);
        if (restoredSession && !restoredSession.isSubmitted) {
          console.log('Restored session:', restoredSession);
          setSession(restoredSession);
          setAnswers(restoredSession.answers || []);
          setTimeRemaining(restoredSession.timeRemaining || 3600);
          // We'll restore visited questions after questions are loaded
          return;
        }
      }

      // Create new session if none exists or previous was submitted
      const test = await getTestById(idStr);
      // Generate a unique ID without using Date.now() to avoid hydration issues
      const timestamp = new Date().getTime();
      const randomId = Math.random().toString(36).substring(2, 15);
      const initialSession: TestSession = {
        id: `session-${timestamp}-${randomId}`,
        testType: (typeStr && typeStr.toUpperCase() === 'UGEE' ? 'UGEE' : 'JEE') as 'JEE' | 'UGEE',
        startTime: new Date(),
        currentSubject: 'Physics',
        currentQuestionIndex: 0,
        answers: [],
        timeRemaining: test?.duration ? test.duration * 60 : 3600,
        isSubmitted: false,
      };

      console.log('Creating new session:', initialSession);
      const newSessionId = await saveTestSession(initialSession);
      sessionStorage.setItem(`session-${idStr}`, newSessionId);
      const refreshedSession = { ...initialSession, id: newSessionId };
      setSession(refreshedSession);
    } catch (error) {
      console.error('Error initializing session:', error);
      setError('Failed to initialize test session.');
    }
  };

  const handleNavigate = (step: number, skipClearingCurrentAnswer = false) => {
    const newIndex = currentQuestionIndex + step;
    if (newIndex >= 0 && newIndex < questions.length) {
      // Calculate the time spent on the current question
      const endTime = Date.now();
      const elapsedTime = Math.floor((endTime - questionStartTime) / 1000);

      if (!skipClearingCurrentAnswer) {
        // Clear unsaved selections for the current question (NTA JEE behavior)
        const currentAnswerData = answers.find(ans => ans.questionId === questions[currentQuestionIndex].id);
        const wasAnswerSaved = currentAnswerData?.isAnswered || false;
        
        setAnswers(prevAnswers => prevAnswers.map(ans =>
          ans.questionId === questions[currentQuestionIndex].id
            ? { 
                ...ans, 
                timeSpent: (ans.timeSpent || 0) + elapsedTime,
                // Clear selections if they weren't saved
                selectedOption: wasAnswerSaved ? ans.selectedOption : undefined,
                integerAnswer: wasAnswerSaved ? ans.integerAnswer : undefined,
                isAnswered: wasAnswerSaved
              }
            : ans
        ));
      } else {
        // Just update time spent when we're navigating after save
        setAnswers(prevAnswers => prevAnswers.map(ans =>
          ans.questionId === questions[currentQuestionIndex].id
            ? { ...ans, timeSpent: (ans.timeSpent || 0) + elapsedTime }
            : ans
        ));
      }

      // Setup for new question
      setCurrentQuestionIndex(newIndex);
      setSession((prevSession: any) => ({...prevSession, currentQuestionIndex: newIndex}));
      setVisitedQuestions(prev => new Set(prev).add(newIndex));
      setQuestionStartTime(Date.now());
    }
  };
  const autoSaveAnswer = useCallback(async (updatedAnswers: TestAnswer[]) => {
    if (session && session.id) {
      try {
        // Check if session exists first
        const sessionDoc = await getTestSession(session.id);
        if (!sessionDoc) {
          console.warn('No document to update for session:', session.id);
          return;
        }
        
        // Clean the answers by removing undefined fields
        const cleanAnswers = updatedAnswers.map(ans => {
          const cleanAns: any = {
            questionId: ans.questionId,
            isMarkedForReview: ans.isMarkedForReview || false,
            isAnswered: ans.isAnswered || false,
            timeSpent: ans.timeSpent || 0,
          };
          
          // Only include selectedOption if it's defined
          if (ans.selectedOption !== undefined) {
            cleanAns.selectedOption = ans.selectedOption;
          }
          
          // Only include integerAnswer if it's defined
          if (ans.integerAnswer !== undefined) {
            cleanAns.integerAnswer = ans.integerAnswer;
          }
          
          return cleanAns;
        });
        
        await updateTestSession(session.id, { answers: cleanAnswers });
      } catch (error) {
        console.error('Failed to auto-save answers:', error);
      }
    }
  }, [session]);

  const handleSaveAnswer = (selectedOption?: string, integerAnswer?: number) => {
    setAnswers((prev) => {
      const updatedAnswers = prev.map((ans) =>
        ans.questionId === questions[currentQuestionIndex].id
          ? {
              ...ans,
              selectedOption,
              integerAnswer,
              // Don't mark as answered until explicitly saved
              isAnswered: ans.isAnswered || false
            }
          : ans
      );

// Auto-save removed to match NTA JEE Main behavior
      return updatedAnswers;
    });

    // Mark question as visited
    setVisitedQuestions(prev => new Set(prev).add(currentQuestionIndex));
  };

  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const testSummary = {
    totalQuestions: questions.length,
    answered: answers.filter(ans => ans.isAnswered).length,
    notAnswered: answers.filter(ans => !ans.isAnswered).length,
    notVisited: questions.length - visitedQuestions.size,
    markedForReview: answers.filter(ans => ans.isMarkedForReview && !ans.isAnswered).length,
    answeredAndMarkedForReview: answers.filter(ans => ans.isMarkedForReview && ans.isAnswered).length,
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Calculate status counters dynamically
  const getStatusCounters = () => {
    const answered = answers.filter(a => a.isAnswered && !a.isMarkedForReview).length;
    const notAnswered = questions.length - answers.filter(a => a.isAnswered || a.isMarkedForReview).length;
    const notVisited = questions.length - visitedQuestions.size;
    const markedForReview = answers.filter(a => a.isMarkedForReview && !a.isAnswered).length;
    const answeredAndMarked = answers.filter(a => a.isAnswered && a.isMarkedForReview).length;
    
    return {
      answered,
      notAnswered,
      notVisited,
      markedForReview,
      answeredAndMarked
    };
  };

  const statusCounters = getStatusCounters();

  const handleToggleReview = () => {
    setAnswers((prev) =>
      prev.map((ans) =>
        ans.questionId === questions[currentQuestionIndex].id
          ? { ...ans, isMarkedForReview: !ans.isMarkedForReview }
          : ans
      )
    );
    // Mark question as visited
    setVisitedQuestions(prev => new Set(prev).add(currentQuestionIndex));
  };

  const handleSaveAndMarkForReview = () => {
    // Mark current answer as saved and for review
    setAnswers(prev => prev.map(ans => 
      ans.questionId === questions[currentQuestionIndex].id
        ? { ...ans, isAnswered: true, isMarkedForReview: !ans.isMarkedForReview }
        : ans
    ));
    
    // Auto-save the updated answers
    const updatedAnswers = answers.map(ans => 
      ans.questionId === questions[currentQuestionIndex].id
        ? { ...ans, isAnswered: true, isMarkedForReview: !ans.isMarkedForReview }
        : ans
    );
    autoSaveAnswer(updatedAnswers);
  };

  const handleClearAnswer = () => {
    setAnswers((prev) =>
      prev.map((ans) =>
        ans.questionId === questions[currentQuestionIndex].id
          ? {
              ...ans,
              selectedOption: undefined,
              integerAnswer: undefined,
              isAnswered: false,
            }
          : ans
      )
    );
  };

const handleSaveAndNext = () => {
    // Get current question ID
    const currentQuestionId = questions[currentQuestionIndex].id;
    
    // Update answers state
    setAnswers(prev => {
      const updatedAnswers = prev.map(ans => 
        ans.questionId === currentQuestionId
          ? { ...ans, isAnswered: true }
          : ans
      );
      
      // Auto-save the updated answers immediately
      autoSaveAnswer(updatedAnswers);
      return updatedAnswers;
    });
    
    // Navigate with skipClearingCurrentAnswer flag set to true
    setTimeout(() => handleNavigate(1, true), 100);
  };

  const handleMarkForReviewAndNext = () => {
    handleToggleReview();
    const updatedAnswers = answers.map(ans => 
      ans.questionId === questions[currentQuestionIndex].id
        ? { ...ans, isAnswered: true }
        : ans
    );
    autoSaveAnswer(updatedAnswers);
    handleNavigate(1);
  };

    // Calculate and save test result
  const calculateAndSaveTestResult = async (): Promise<TestResult> => {
    if (!session) throw new Error('Session not found');

    // Example calculation for demonstration
    const subjectWiseResults: SubjectResult[] = subjects.map((subject) => {
      const subjectQuestions = questions.filter(q => q.subject === subject);
      const subjectAnswers = answers.filter(ans => 
        subjectQuestions.some(q => q.id === ans.questionId && ans.isAnswered));

      const correct = subjectAnswers.filter(ans => {
        const correctAnswer = subjectQuestions.find(q => q.id === ans.questionId)?.correctAnswer;
        return ans.selectedOption === correctAnswer || ans.integerAnswer === parseFloat(correctAnswer || '');
      }).length;

      const attempted = subjectAnswers.length;
      const score = correct * 4 - (attempted - correct);
      const accuracy = attempted ? (correct / attempted) * 100 : 0;
      
      // Calculate time spent on this subject
      const subjectTimeSpent = answers
        .filter(ans => subjectQuestions.some(q => q.id === ans.questionId))
        .reduce((total, ans) => total + (ans.timeSpent || 0), 0);

      return {
        subject: subject as 'Mathematics' | 'Physics' | 'Chemistry',
        totalQuestions: subjectQuestions.length,
        attempted,
        correct,
        incorrect: attempted - correct,
        score,
        accuracy: Math.round(accuracy * 100) / 100,
        timeTaken: subjectTimeSpent
      }
    });

const correct = subjectWiseResults.reduce((sum, subjResult) => sum + subjResult.correct, 0);
    const incorrect = subjectWiseResults.reduce((sum, subjResult) => sum + subjResult.incorrect, 0);
    const attempted = correct + incorrect;
    const totalScore = subjectWiseResults.reduce((sum, subjResult) => sum + subjResult.score, 0);
    const totalQuestions = questions.length;

    const accuracy = attempted ? (correct / attempted) * 100 : 0;

    // Calculate actual time taken from session start time to current time
    const actualTimeTaken = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
    
    // Calculate percentile from per-test percentile map (fallback to heuristic if missing)
    const maxPossibleScore = totalQuestions * 4;
    let percentileVal = 0;
    try {
      const mapDoc = await getPercentileMap(idStr);
      if (mapDoc && Array.isArray(mapDoc.map) && mapDoc.map.length > 0) {
        const idx = Math.max(0, Math.min(mapDoc.map.length - 1, Math.round(totalScore)));
        percentileVal = Math.max(0, Math.min(100, Number(mapDoc.map[idx]) || 0));
      } else {
        // Fallback heuristic when map is not provided
        const scorePercentage = (totalScore / maxPossibleScore) * 100;
        percentileVal = Math.min(99.99, Math.max(0, Math.round((scorePercentage * 0.85 + Math.random() * 15) * 100) / 100));
      }
    } catch {
      const scorePercentage = (totalScore / maxPossibleScore) * 100;
      percentileVal = Math.min(99.99, Math.max(0, Math.round((scorePercentage * 0.85 + Math.random() * 15) * 100) / 100));
    }
    // Rank estimation with 1.2M candidates
    const ESTIMATED_CANDIDATES = 1200000;
    const rankEstimate = Math.max(1, Math.round(((100 - percentileVal) / 100) * ESTIMATED_CANDIDATES));
    
    const testResult: TestResult = {
      sessionId: session.id,
      testId: idStr,
      testName: testName,
      testType: session.testType,
      totalQuestions,
      totalMarks: totalQuestions * 4,
      timeTaken: actualTimeTaken, // Time in seconds from start to submission
      subjectWiseResults: {
        Mathematics: subjectWiseResults[0],
        Physics: subjectWiseResults[1],
        Chemistry: subjectWiseResults[2],
      },
      overallResult: {
        totalScore,
        percentage: Math.round((totalScore / (totalQuestions * 4)) * 100 * 100) / 100,
        correct,
        incorrect,
        attempted,
        rank: rankEstimate
      },
      submittedAt: new Date(),
      // Additional fields
      accuracy: Math.round(accuracy * 100) / 100,
      percentile: percentileVal,
      status: 'Completed',
    };

    // Save the result to Firestore
    await saveTestResult(testResult);
    return testResult;
  };


  const handleSubmitTest = async () => {
    try {
      // Prevent double submission
      if (!session || session.isSubmitted || isSubmitting) {
        console.warn('Test already submitted or no session found');
        return;
      }

      // Close the modal
      handleCloseModal();
      
      // Show submission loader
      setIsSubmitting(true);

      // Save final time spent on current question
      const endTime = Date.now();
      const elapsedTime = Math.floor((endTime - questionStartTime) / 1000);
      
      const finalAnswers = answers.map(ans => {
        const updatedAns = ans.questionId === questions[currentQuestionIndex].id
          ? { ...ans, timeSpent: (ans.timeSpent || 0) + elapsedTime }
          : ans;
        
        // Clean the answer object to remove undefined values
        const cleanedAns: TestAnswer = {
          questionId: updatedAns.questionId,
          isMarkedForReview: updatedAns.isMarkedForReview || false,
          isAnswered: updatedAns.isAnswered || false,
          timeSpent: updatedAns.timeSpent || 0
        };
        
        // Only add selectedOption if it exists
        if (updatedAns.selectedOption !== undefined && updatedAns.selectedOption !== null) {
          cleanedAns.selectedOption = updatedAns.selectedOption;
        }
        
        // Only add integerAnswer if it exists
        if (updatedAns.integerAnswer !== undefined && updatedAns.integerAnswer !== null && !isNaN(updatedAns.integerAnswer)) {
          cleanedAns.integerAnswer = updatedAns.integerAnswer;
        }
        
        return cleanedAns;
      });
      
      // Update answers before calculating result
      setAnswers(finalAnswers);

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calculate scores and create result
      const testResult = await calculateAndSaveTestResult();
      
      // Mark session as submitted
      await updateTestSession(session.id, {
        isSubmitted: true,
        endTime: new Date(),
        timeRemaining: 0,
        answers: finalAnswers
      });

      // Update local session state to prevent re-submission
      setSession(prev => prev ? { ...prev, isSubmitted: true } : null);


      // Clear session from sessionStorage
      sessionStorage.removeItem(`session-${idStr}`);

      // Small delay to show all submission steps
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to results page
      router.push(`/test/${typeStr}/${idStr}/results?sessionId=${session.id}`);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      setIsSubmitting(false);
      alert('Failed to submit test. Please try again.');
    }
  };

  // Initialize questionStartTime after mount to avoid hydration issues
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, []);

  // Initialize test session and fetch data
  useEffect(() => {
    let mounted = true;
    
    const initializeTest = async () => {
      try {
        if (!mounted) return;
        
        // First fetch test details
        await fetchTestDetails();
        
        if (!mounted) return;
        
        // Then initialize or restore session
        await initializeSession();
        
        if (!mounted) return;
        
        // Finally fetch questions
        await fetchQuestions();
      } catch (error) {
        console.error('Error initializing test:', error);
        if (mounted) {
          setError('Failed to initialize test. Please refresh the page.');
          setLoading(false);
        }
      }
    };

    initializeTest();
    
    return () => {
      mounted = false;
    };
  }, [id, type]);

  // Update current subject based on current question
  useEffect(() => {
    if (questions.length > 0 && questions[currentQuestionIndex]) {
      const questionSubject = questions[currentQuestionIndex].subject;
      if (questionSubject !== currentSubject) {
        setCurrentSubject(questionSubject);
      }
    }
  }, [currentQuestionIndex, questions]);

  // Timer effect - starts immediately when timeRemaining is set
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('Time is up! Test will be submitted.');
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining > 0]); // This will restart timer when timeRemaining is first set

  // Start a timer for the current question
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  // Prevent accidental navigation away from test
  useEffect(() => {
    // Block browser refresh, back button, and tab close
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only block if test is in progress (not submitted and not loading)
      if (!isSubmitting && !loading && session && !session.isSubmitted) {
        const message = 'Are you sure you want to leave this test? Your progress will be lost if you haven\'t submitted the test.';
        event.preventDefault();
        event.returnValue = message; // Standard for most browsers
        return message; // For some older browsers
      }
    };

    // Block browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      if (!isSubmitting && !loading && session && !session.isSubmitted) {
        const confirmLeave = window.confirm(
          'Are you sure you want to leave this test? Your progress will be lost if you haven\'t submitted the test.'
        );
        
        if (!confirmLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        } else {
          // Allow navigation and clean up
          window.removeEventListener('beforeunload', handleBeforeUnload);
          // Navigate to test list
          router.push(`/${(typeStr || '').toLowerCase()}-tests`);
        }
      }
    };

    // Block keyboard shortcuts that could cause navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSubmitting && !loading && session && !session.isSubmitted) {
        // Block Ctrl+R (refresh)
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
          event.preventDefault();
          const confirmRefresh = window.confirm(
            'Are you sure you want to refresh this page? Your progress will be lost if you haven\'t submitted the test.'
          );
          if (confirmRefresh) {
            window.location.reload();
          }
        }
        
        // Block F5 (refresh)
        if (event.key === 'F5') {
          event.preventDefault();
          const confirmRefresh = window.confirm(
            'Are you sure you want to refresh this page? Your progress will be lost if you haven\'t submitted the test.'
          );
          if (confirmRefresh) {
            window.location.reload();
          }
        }
        
        // Block Alt+Left/Right (browser navigation)
        if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault();
          const confirmNavigate = window.confirm(
            'Are you sure you want to leave this test? Your progress will be lost if you haven\'t submitted the test.'
          );
          if (confirmNavigate) {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            router.push(`/${(typeStr || '').toLowerCase()}-tests`);
          }
        }
        
        // Block Ctrl+W (close tab)
        if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
          event.preventDefault();
        }
      }
    };

    // Only add listeners if test is active
    if (!isSubmitting && !loading && session && !session.isSubmitted) {
      // Add browser navigation protection
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      document.addEventListener('keydown', handleKeyDown);
      
      // Push initial state to enable popstate detection
      window.history.pushState(null, '', window.location.href);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, loading, session, router, type]); // Dependencies to re-run when test state changes

  if (loading) return <LoadingSpinner size="large" fullScreen={true} text="Loading test..." />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button 
          onClick={() => router.push(`/${(typeStr || '').toLowerCase()}-tests`)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Tests
        </button>
      </div>
    </div>
  );
  
  if (!session || questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" text="Initializing test session..." />
    </div>
  );
  
  // Show submission loader when submitting
  if (isSubmitting) {
    return (
      <TestSubmissionLoader 
        testName={testName} 
        totalQuestions={questions.length} 
        attempted={answers.filter(ans => ans.isAnswered).length} 
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(ans => ans.questionId === currentQuestion?.id);

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Fixed Header */}
      <header className="flex justify-between items-center px-6 py-2 bg-white border-b border-gray-300 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Profile Avatar */}
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          {/* Candidate Info */}
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-gray-600 font-medium">Candidate Name: </span>
              <span className="text-gray-900 font-semibold">{getUserDisplayName()}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600 font-medium">Test Name: </span>
              <span className="text-gray-900 font-semibold">{testName}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center">
            <div className="text-sm text-gray-600 font-medium mr-2">Remaining Time:</div>
            <div className="bg-[#1447e6] px-4 py-2 rounded-full">
              <span className="text-white font-bold text-base">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side - Question area */}
        <div className="w-3/4 flex flex-col">
          {/* Fixed Subject Navigation */}
          <nav className="flex space-x-1 px-4 py-1 bg-white border-b border-gray-100 flex-shrink-0">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => handleSubjectChange(subject)}
                className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${
                  currentSubject === subject 
                    ? 'bg-[#dee8ff] text-black font-bold' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {subject}
              </button>
            ))}
          </nav>

          {/* Fixed Question Header */}
          <div className="flex items-center gap-4 px-4 py-1 bg-white border-b border-gray-100 flex-shrink-0">
            <h3 className="text-base font-semibold text-black">
              Question {currentQuestion.questionNumber}:
            </h3>
            <div className="flex items-center gap-3">
              <div className="border border-gray-300 rounded-full px-3 py-0.5 bg-gray-50 opacity-85">
                <span className="text-xs">
                  <span className="font-medium" style={{color: '#1b2124'}}>Marks: </span>
                  <span className="text-green-600 font-semibold">+{currentQuestion.marks.correct}</span>
                  <span className="text-gray-500">, </span>
                  <span className="text-red-600 font-semibold">-{Math.abs(currentQuestion.marks.incorrect)}</span>
                </span>
              </div>
              <div className="border border-gray-300 rounded-full px-3 py-0.5 bg-gray-50 opacity-85">
                <span className="text-xs">
                  <span className="font-medium" style={{color: '#1b2124'}}>Type: </span>
                  <span style={{color: '#6b7280'}}>{currentQuestion.type}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Question Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="p-4 bg-gray-100 rounded">
              {/* Question Image - Fixed Standard Size */}
              <div className="flex justify-center mb-4">
                <FastImage 
                  id="question-image"
                  src={currentQuestion.imagePath} 
                  alt={`Question ${currentQuestion.questionNumber}`} 
                  className="question-image"
                  onError={() => {
                    console.error('Failed to load image:', currentQuestion.imagePath);
                  }}
                />
              </div>
              {currentQuestion.type === 'MCQ' && (
                <div className="mt-6 space-y-2">
                  {currentQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="radio"
                        name="mcq"
                        id={`option-${index}`}
                        checked={currentAnswer?.selectedOption === option}
                        onChange={() => handleSaveAnswer(option)}
                        className="mr-2"
                      />
                      <label htmlFor={`option-${index}`} className="text-black">{option}</label>
                    </div>
                  ))}
                </div>
              )}
              {currentQuestion.type === 'Integer' && (
                <div className="mt-4">
                  <input
                    type="number"
                    value={currentAnswer?.integerAnswer || ''}
                    onChange={(e) => handleSaveAnswer(undefined, parseFloat(e.target.value))}
                    className="border rounded p-2 w-full text-black"
                    placeholder="Enter answer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Buttons */}
          <div className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0">
            {/* First row of buttons */}
            <div className="flex justify-between items-center mb-2">
              <button onClick={handleSaveAndNext} className="px-4 py-2 bg-[#0abc67] text-white rounded">SAVE & NEXT</button>
              <button onClick={handleClearAnswer} className="px-4 py-2 bg-gray-300 text-black rounded">CLEAR</button>
              <button onClick={handleSaveAndMarkForReview} className="px-4 py-2 bg-[#4381dd] text-white rounded">SAVE & MARK FOR REVIEW</button>
              <button onClick={handleMarkForReviewAndNext} className="px-4 py-2 bg-[#f19846] text-white rounded">
                MARK FOR REVIEW & NEXT
              </button>
            </div>

            {/* Second row of buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate(-1)} className={`px-3 py-1.5 bg-gray-200 text-black rounded text-sm ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={currentQuestionIndex === 0}>
                  ← BACK
                </button>
                <button onClick={() => handleNavigate(1)} className="px-3 py-1.5 bg-gray-200 text-black rounded text-sm">
                  NEXT →
                </button>
              </div>
              <button onClick={handleOpenModal} className="px-4 py-2 bg-green-600 text-white rounded">
                SUBMIT
              </button>

              <SubmitConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmitTest}
                testSummary={testSummary}
                candidateName={getUserDisplayName()}
                testName={testName}
                remainingTime={formatTime(timeRemaining)}
              />
            </div>
          </div>
        </div>

        {/* Fixed Right Sidebar */}
        <div className="w-1/4 bg-white border-l text-black flex flex-col">
          {/* Legend Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="legend-answered">{statusCounters.answered}</span>
                <span className="text-gray-700 font-medium">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="legend-not-answered">{statusCounters.notAnswered}</span>
                <span className="text-gray-700 font-medium">Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="legend-not-visited">{statusCounters.notVisited}</span>
                <span className="text-gray-700 font-medium">Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="legend-marked">{statusCounters.markedForReview}</span>
                <span className="text-gray-700 font-medium">Mark for review</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="relative">
                  <span className="legend-marked">{statusCounters.answeredAndMarked}</span>
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                </div>
                <span className="text-gray-700 font-medium">Answered & Marked for Revision <span className="text-gray-500">(will be considered for evaluation)</span></span>
              </div>
            </div>
          </div>

          {/* Question Grid */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-3">
              {filteredQuestionsArray.map((question, filteredIndex) => {
                const originalIndex = questions.findIndex(q => q.id === question.id);
                const answer = answers.find(a => a.questionId === question.id);
                const isVisited = visitedQuestions.has(originalIndex);

                let buttonClass = '';
                const isCurrent = originalIndex === currentQuestionIndex;

                if (answer?.isAnswered && answer?.isMarkedForReview) {
                  buttonClass = 'question-answered-marked';
                } else if (answer?.isAnswered) {
                  buttonClass = 'question-answered';
                } else if (answer?.isMarkedForReview) {
                  buttonClass = 'question-marked';
                } else if (isVisited) {
                  buttonClass = 'question-not-answered';
                } else {
                  buttonClass = 'question-not-visited';
                }

                if (isCurrent) {
                  buttonClass += ' current-question';
                }

                return (
                  <button
                    key={question.id}
onClick={() => {
                      // Save the time spent on the current question
                      const endTime = Date.now();
                      const elapsedTime = Math.floor((endTime - questionStartTime) / 1000);
                      
                      // Clear unsaved selections for the current question (NTA JEE behavior)
                      const currentAnswerData = answers.find(ans => ans.questionId === questions[currentQuestionIndex].id);
                      const wasAnswerSaved = currentAnswerData?.isAnswered || false;
                      
                      // Accumulate elapsed time and clear unsaved selections
                      setAnswers(prevAnswers => prevAnswers.map(ans =>
                        ans.questionId === questions[currentQuestionIndex].id
                          ? { 
                              ...ans, 
                              timeSpent: (ans.timeSpent || 0) + elapsedTime,
                              // Clear selections if they weren't saved
                              selectedOption: wasAnswerSaved ? ans.selectedOption : undefined,
                              integerAnswer: wasAnswerSaved ? ans.integerAnswer : undefined,
                              isAnswered: wasAnswerSaved
                            }
                          : ans
                      ));
                      
                      // Setup for new question
                      setCurrentQuestionIndex(originalIndex);
                      setVisitedQuestions(prev => new Set(prev).add(originalIndex));
                      setQuestionStartTime(Date.now());
                    }}
                    className={buttonClass}
                  >
                    {question.questionNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

