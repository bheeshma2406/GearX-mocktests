'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JEESidebar from '@/components/JEESidebar';
import { getAllTestResults } from '@/lib/firebaseData';
import { TestResult } from '@/types';
import { ArrowLeft, History, Clock, Trophy, Target, Calendar, TrendingUp, Award, BookOpen, Eye } from 'lucide-react';

export default function JEEHistoryPage() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await getAllTestResults();
        const jeeResults = data
          .filter(result => (result.testType || '').toLowerCase() === 'jee')
          .sort((a, b) => {
            const dateA = (a as any)?.submittedAt?.toDate
              ? (a as any).submittedAt.toDate()
              : a.submittedAt instanceof Date
              ? a.submittedAt
              : new Date(a.submittedAt);
            const dateB = (b as any)?.submittedAt?.toDate
              ? (b as any).submittedAt.toDate()
              : b.submittedAt instanceof Date
              ? b.submittedAt
              : new Date(b.submittedAt);
            return dateB.getTime() - dateA.getTime();
          });
        setResults(jeeResults);
      } catch (error) {
        console.error('❌ JEE History: Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const formatDate = (date: any) => {
    let d;
    if (date && typeof date === 'object' && date.toDate) {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      d = new Date(date);
    } else {
      return 'Invalid Date';
    }
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeTaken = (seconds: number) => {
    if (!seconds || isNaN(seconds)) {
      return '0h 0m';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50';
    if (percentage >= 60) return 'bg-yellow-50';
    if (percentage >= 40) return 'bg-orange-50';
    return 'bg-red-50';
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Animated background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-60">
          <div className="absolute top-0 -left-6 w-80 h-80 bg-blue-300 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-8 -right-10 w-96 h-96 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-12 left-24 w-96 h-96 bg-indigo-300 dark:bg-indigo-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 flex h-full">
        <JEESidebar />

        <main className="flex-1 h-full overflow-y-auto">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <Link
                href="/jee-tests"
                className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <span className="inline-flex items-center justify-center rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-2 shadow-sm">
                  <ArrowLeft className="h-4 w-4" />
                </span>
                <span className="text-sm">Back to JEE Tests</span>
              </Link>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-xl shadow-lg">
                    <History className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      JEE Test History
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      Review your past attempts, performance, and solutions
                    </p>
                  </div>
                </div>

                <Link
                  href="/jee-tests"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  <BookOpen className="h-4 w-4" />
                  Browse Tests
                </Link>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Loading history...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10 blur-3xl animate-gradient-x"></div>
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-gray-100 dark:border-gray-700">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/30 p-8 rounded-full w-28 h-28 mx-auto mb-6 flex items-center justify-center">
                    <History className="h-14 w-14 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No test history yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Start taking tests to build your performance history.
                  </p>
                  <Link
                    href="/jee-tests"
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Tests
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Subtle animated gradient behind cards */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10 blur-3xl animate-gradient-x"></div>

                <div className="relative space-y-5">
                  {results.map((result, index) => {
                    const percentage = Math.round(
                      (result.overallResult.totalScore / (result.totalMarks || 300)) * 100
                    );
                    const scoreColor = getScoreColor(percentage);
                    const scoreBg = getScoreBgColor(percentage);

                    return (
                      <div
                        key={result.sessionId}
                        onClick={() =>
                          router.push(
                            `/test/${(result.testType || '').toLowerCase()}/${result.testId}/results?sessionId=${result.sessionId}`
                          )
                        }
                        className="group cursor-pointer relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 border border-gray-100 dark:border-gray-700 p-6"
                      >
                        {/* Hover glow */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 dark:from-blue-400/0 dark:via-blue-400/10 dark:to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Header row */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 shadow-md">
                                <Trophy className="h-4 w-4" />
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {result.testName}
                              </h3>
                              {index === 0 && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs font-medium rounded-full border border-yellow-200/80 dark:border-yellow-700">
                                  Latest
                                </span>
                              )}
                            </div>

                            {/* Date and time */}
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                              <Calendar className="h-4 w-4 mr-1.5" />
                              {formatDate(result.submittedAt)}
                              <span className="mx-2">•</span>
                              <Clock className="h-4 w-4 mr-1.5" />
                              Duration: {formatTimeTaken(result.timeTaken)}
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {/* Marks */}
                              <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <Trophy className="h-3.5 w-3.5 mr-1" />
                                  Score
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {result.overallResult.totalScore}/{result.totalMarks}
                                </div>
                              </div>

                              {/* Percentage */}
                              <div className={`rounded-lg p-3 ${scoreBg} dark:bg-white/5 border border-gray-200 dark:border-gray-700`}>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                                  Percentage
                                </div>
                                <div className={`font-semibold ${scoreColor}`}>
                                  {percentage}%
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                                    style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Accuracy */}
                              <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <Target className="h-3.5 w-3.5 mr-1" />
                                  Accuracy
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {result.accuracy}%
                                </div>
                              </div>

                              {/* Percentile */}
                              <div className="rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40">
                                <div className="flex items-center text-xs text-gray-600 dark:text-purple-200 mb-1">
                                  <Award className="h-3.5 w-3.5 mr-1 text-purple-600 dark:text-purple-300" />
                                  Percentile
                                </div>
                                <div className="font-semibold text-purple-700 dark:text-purple-300">
                                  {result.percentile || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const type = (result.testType || '').toLowerCase();
                                const id = result.testId;
                                const sid = result.sessionId;
                                if (!id || !sid) return;
                                router.push(`/test/${type}/${id}/results/solutions?sessionId=${sid}`);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 text-sm shadow-md"
                              title="View Solutions"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              View Solutions
                            </button>

                            <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
