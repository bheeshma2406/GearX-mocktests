'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useParams, useRouter } from 'next/navigation';
import { getTestResultBySession, getTestById, getPreviousTestResult } from '@/lib/firebaseData';
import { TestResult } from '@/types';

export default function ResultsPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [testName, setTestName] = useState<string>('');
  const [previousResult, setPreviousResult] = useState<TestResult | null>(null);
  const [scoreComparison, setScoreComparison] = useState<{difference: number, percentage: number, isImprovement: boolean} | null>(null);
  const [testDuration, setTestDuration] = useState<number | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // Get sessionId from URL search params
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        
        if (!sessionId) {
          setError('No session ID provided');
          return;
        }

        const fetchedResult = await getTestResultBySession(sessionId);
        if (!fetchedResult) {
          setError('No result found for this session');
          return;
        }
        
        // If testName is missing from result, fetch it from the tests collection
        if (!fetchedResult.testName && (fetchedResult.testId || params.id)) {
          try {
            const testInfo = await getTestById(fetchedResult.testId || params.id as string);
            if (testInfo) {
              setTestName(testInfo.name);
              setTestDuration(testInfo.duration);
              // Update the result object with the test name
              fetchedResult.testName = testInfo.name;
            }
          } catch (err) {
            console.warn('Could not fetch test name:', err);
          }
        } else {
          setTestName(fetchedResult.testName || '');
        }
        
        setResult(fetchedResult);
        
        // Fetch previous test result for comparison
        try {
          console.log('🔍 Results Page: Fetching previous result for:', {
            sessionId,
            testType: fetchedResult.testType,
            currentScore: fetchedResult.overallResult.totalScore
          });
          
          const previousResult = await getPreviousTestResult(sessionId, fetchedResult.testType);
          console.log('🔍 Results Page: Previous result found:', previousResult ? {
            sessionId: previousResult.sessionId,
            testType: previousResult.testType,
            score: previousResult.overallResult?.totalScore,
            submittedAt: previousResult.submittedAt
          } : null);
          
          if (previousResult) {
            setPreviousResult(previousResult);
            
            // Calculate score comparison
            const currentScore = fetchedResult.overallResult.totalScore || 0;
            const previousScore = previousResult.overallResult.totalScore || 0;
            const difference = currentScore - previousScore;
            const percentage = previousScore > 0 ? Math.round((Math.abs(difference) / previousScore) * 100) : 0;
            const isImprovement = difference > 0;
            
            console.log('🔍 Results Page: Score comparison calculated:', {
              currentScore,
              previousScore,
              difference,
              percentage,
              isImprovement
            });
            
            setScoreComparison({ difference, percentage, isImprovement });
          } else {
            console.log('🔍 Results Page: No previous result found - showing first attempt');
          }
        } catch (err) {
          console.warn('Could not fetch previous result for comparison:', err);
        }
      } catch (error) {
        console.error('Failed to fetch test result:', error);
        setError('Failed to load test results');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-xl">{error || 'No result found.'}</div>
      </div>
    );
  }

  // Derived totals for dynamic counts
  const totalQ = result.totalQuestions || 0;
  const totalMarks = result.totalMarks || (totalQ ? totalQ * 4 : 0);
  const attempted = result.overallResult.attempted || 0;
  const skippedCount = Math.max(0, totalQ - attempted);
  const avgMarks = totalQ ? totalMarks / totalQ : 0;
  const marksSkipped = Math.round(skippedCount * avgMarks);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-30">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>
      
      {/* Content Wrapper */}
      <div className="relative z-10">
        {/* Header */}
        <div className="backdrop-blur-md bg-white/10 border-b border-white/10 shadow-lg">
          <div className="flex justify-between items-center p-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const testType = (params.type as string).toUpperCase();
                  if (testType === 'JEE') {
                    router.push('/jee-tests');
                  } else if (testType === 'UGEE') {
                    router.push('/ugee-tests');
                  } else {
                    router.push('/');
                  }
                }}
                className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-300 backdrop-blur-sm"
              >
                <div className="p-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </div>
                <span className="text-white font-medium group-hover:text-blue-200 transition-colors">
                  Back to {params.type?.toString().toUpperCase()} Tests
                </span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-300 backdrop-blur-sm hover:scale-105"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Test Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 mb-6 shadow-lg`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{result.testName || `${result.testType} Test`} Result</h1>
              <div className="text-sm text-gray-400 flex gap-4">
                <span>📝 {result.totalQuestions || 75} Questions • {result.totalMarks || 300} Marks</span>
                <span>⏰ {(testDuration ?? 180)} mins</span>
                <span>📅 Submitted On: {result.submittedAt ? (typeof result.submittedAt === 'string' ? new Date(result.submittedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : result.submittedAt.toDate ? result.submittedAt.toDate().toLocaleDateString('en-US', {
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A') : 'N/A'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>
                Reattempt
              </button>
              <button
                onClick={() => {
                  try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const sessionId = urlParams.get('sessionId');
                    if (!sessionId) {
                      alert('Session ID missing. Cannot open solutions.');
                      return;
                    }
                    const type = params.type as string;
                    const id = params.id as string;
                    router.push(`/test/${type}/${id}/results/solutions?sessionId=${sessionId}`);
                  } catch (e) {
                    console.error('Failed to navigate to solutions:', e);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View Solutions
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700">
            <button 
              onClick={() => setActiveTab('summary')}
              className={`pb-2 px-1 ${activeTab === 'summary' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
            >
              Result Summary
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-2 px-1 ${activeTab === 'leaderboard' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {/* Results Grid - 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Score Card */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg h-32 relative overflow-hidden`}>
            {/* Background Icon */}
            <div className="absolute top-2 right-2 opacity-10">
              <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-2 text-gray-400 flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  SCORE
                </h3>
                {/* score area moved to card bottom */}
              </div>
            </div>
            {/* Bottom area with score and comparison, anchored to card */}
            <div className="absolute inset-x-4 bottom-3 z-20">
              <div className="flex items-end gap-3">
                <span className="text-[4rem] leading-[1.1] font-normal tracking-tight">
                  {result.overallResult.totalScore}
                </span>
                {scoreComparison && (
                  <div
                    className={`inline-flex items-end gap-1.5 px-2.5 py-0.5 pb-[2px] rounded-full border opacity-75 shadow-sm pointer-events-none
                      ${scoreComparison.isImprovement
                        ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                        : 'text-rose-300 border-rose-400/30 bg-rose-400/10'}`}
                  >
                    {scoreComparison.isImprovement ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 4l-7 7h4v7h6v-7h4l-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 20l7-7h-4V6H9v7H5l7 7z" />
                      </svg>
                    )}
                    <span className="text-[0.75rem] leading-[1.1] font-bold tracking-tight">
                      {scoreComparison.isImprovement ? '+' : '-'}
                      {scoreComparison.percentage}%
                    </span>
                    <span className="text-[10px] text-gray-300/70 leading-none">vs last</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rank Card (replaces Progress) */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg h-32 relative overflow-hidden`}>
            {/* Background Icon */}
            <div className="absolute top-2 right-2 opacity-10">
              <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />
              </svg>
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-semibold mb-2 text-gray-400 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h6l3-4 3 4h6l-4.5 4 1.5 6-6-3.5L5 17l1.5-6L3 7z" />
                  </svg>
                </div>
                RANK
              </h3>
              <div className="text-2xl font-bold mb-1 text-emerald-400">
                {(() => {
                  const r = (result.overallResult as any)?.rank;
                  return typeof r === 'number' ? r.toLocaleString() : '—';
                })()}
              </div>
            </div>
          </div>

          {/* Percentile Card */}
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-lg h-32 relative overflow-hidden`}>
            {/* Background Icon */}
            <div className="absolute top-2 right-2 opacity-10">
              <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-semibold mb-2 text-gray-400 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                PERCENTILE
              </h3>
              <div className="text-2xl font-bold mb-1 text-orange-500 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                {typeof result.percentile === 'number' ? result.percentile.toFixed(2) : '—'}
              </div>
              <div className="text-xs text-gray-400">
                Top {(() => {
                  const p = typeof result.percentile === 'number' ? result.percentile : 0;
                  const top = Math.max(0, Math.min(100, 100 - p));
                  return top.toFixed(2);
                })()}% {typeof result.percentile === 'number' ? '(Based on test mapping)' : '(No mapping)'}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg mb-6`}>
          <h3 className="text-lg font-semibold mb-6">Your Progress</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-green-500 text-2xl mb-2">✓</div>
              <div className="text-sm text-gray-400">Correct</div>
              <div className="font-bold">{result.overallResult.correct || 0}/{totalQ}</div>
              <div className="text-xs text-gray-500">Marks Obtained: {result.overallResult.totalScore || 0}</div>
            </div>
            
            <div className="text-center">
              <div className="text-red-500 text-2xl mb-2">✗</div>
              <div className="text-sm text-gray-400">Incorrect</div>
              <div className="font-bold">{result.overallResult.incorrect || 0}/{totalQ}</div>
              <div className="text-xs text-gray-500">Marks Lost: {(result.overallResult.incorrect || 0) * 1}</div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-500 text-2xl mb-2">⊘</div>
              <div className="text-sm text-gray-400">Skipped</div>
              <div className="font-bold">{skippedCount}/{totalQ}</div>
              <div className="text-xs text-gray-500">Marks Skipped: {marksSkipped}</div>
            </div>
            
            <div className="text-center">
              <div className="text-blue-500 text-2xl mb-2">🎯</div>
              <div className="text-sm text-gray-400">Accuracy</div>
            <div className="font-bold">{result.overallResult.attempted > 0 ? Math.round((result.overallResult.correct / result.overallResult.attempted) * 100) : 0}%</div>
            </div>
            
            <div className="text-center">
              <div className="text-purple-500 text-2xl mb-2">%</div>
              <div className="text-sm text-gray-400">Completed</div>
              <div className="font-bold">{totalQ ? Math.round(((result.overallResult.attempted || 0) / totalQ) * 100) : 0}%</div>
            </div>
            
            <div className="text-center">
              <div className="text-orange-500 text-2xl mb-2">⏱</div>
              <div className="text-sm text-gray-400">Time Taken</div>
            <div className="font-bold">{result.timeTaken ? `${Math.floor(result.timeTaken / 60)}:${String(result.timeTaken % 60).padStart(2, '0')}` : '0:00'}</div>
            </div>
          </div>
        </div>

        {/* Subject Wise Performance */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg mb-6`}>
          <h3 className="text-lg font-semibold mb-4">Section Wise Performance</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} text-sm`}>
                  <th className="text-left p-3">Section</th>
                  <th className="text-right p-3">Score</th>
                  <th className="text-right p-3">Percentile</th>
                  <th className="text-right p-3">Rank</th>
                  <th className="text-right p-3">Correct</th>
                  <th className="text-right p-3">Incorrect</th>
                  <th className="text-right p-3">Skipped</th>
                  <th className="text-right p-3">Accuracy</th>
                  <th className="text-right p-3">Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.subjectWiseResults || {}).map(([subject, subjResult]) => (
                  <tr key={subject} className="border-t border-gray-700">
                    <td className="p-3 font-medium">{subject}</td>
                    <td className="p-3 text-right">{subjResult.score || -1}</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right">{subjResult.correct || 0}</td>
                    <td className="p-3 text-right">{subjResult.incorrect || 0}</td>
                    <td className="p-3 text-right">{Math.max(0, (subjResult.totalQuestions || 0) - (subjResult.attempted || 0))}</td>
                    <td className="p-3 text-right">{subjResult.accuracy ? `${Math.round(subjResult.accuracy)}%` : '0%'}</td>
                    <td className="p-3 text-right">{subjResult.timeTaken ? `${Math.floor(subjResult.timeTaken / 60)}:${String(subjResult.timeTaken % 60).padStart(2, '0')}` : '0:00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Detailed Analysis →
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

