'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UGEESidebar from '@/components/UGEESidebar';
import { getAllTestResults } from '@/lib/firebaseData';
import { TestResult } from '@/types';
import { ArrowLeft, History, Clock, Trophy, Target, Calendar, TrendingUp, Award, BookOpen } from 'lucide-react';

export default function UGEEHistoryPage() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log('🔄 UGEE History: Starting to fetch test results...');
        const data = await getAllTestResults(); // Fetch results from Firebase
        console.log('📊 UGEE History: Raw data from getAllTestResults:', data);
        console.log('📊 UGEE History: Total results found:', data.length);
        
        // Log each result to see what's there
        data.forEach((result, index) => {
          console.log(`📋 Result ${index + 1}:`, {
            testType: result.testType,
            testName: result.testName,
            sessionId: result.sessionId,
            submittedAt: result.submittedAt,
            submittedAtType: typeof result.submittedAt,
            timeTaken: result.timeTaken,
            timeTakenType: typeof result.timeTaken,
            totalScore: result.overallResult?.totalScore,
            percentile: result.percentile
          });
        });
        
        // Filter for UGEE results only and sort by date (most recent first)
        const ugeeResults = data
          .filter(result => {
            console.log('🔍 Filtering result:', result.testType, 'Is UGEE?', result.testType.toLowerCase() === 'ugee');
            return result.testType.toLowerCase() === 'ugee';
          })
          .sort((a, b) => {
            const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
            const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
            return dateB.getTime() - dateA.getTime();
          });
          
        console.log('✅ UGEE History: Filtered UGEE results:', ugeeResults);
        console.log('✅ UGEE History: Total UGEE results found:', ugeeResults.length);
        setResults(ugeeResults);
      } catch (error) {
        console.error('❌ UGEE History: Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const formatDate = (date: any) => {
    let d;
    if (date && typeof date === 'object' && date.toDate) {
      // Firebase Timestamp
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      d = new Date(date);
    } else {
      console.warn('Invalid date format:', date);
      return 'Invalid Date';
    }
    
    if (isNaN(d.getTime())) {
      console.warn('Invalid date value:', date);
      return 'Invalid Date';
    }
    
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <UGEESidebar />

        <main className="flex-1">
          <div className="p-8">
            <div className="mb-8">
              <Link 
                href="/ugee-tests" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to UGEE Tests</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">UGEE Test History</h1>
              <p className="text-gray-600">Review your past test attempts</p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600">Loading history...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No test history yet</h3>
                <p className="text-gray-500 mb-6">Start taking tests to build your performance history</p>
                <Link href="/ugee-tests" className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Tests
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => {
                  const percentage = Math.round((result.overallResult.totalScore / result.totalMarks) * 100);
                  const scoreColor = getScoreColor(percentage);
                  const scoreBg = getScoreBgColor(percentage);
                  
                  return (
                    <div 
                      key={result.sessionId} 
                      onClick={() => router.push(`/test/${result.testType.toLowerCase()}/${result.testId}/results?sessionId=${result.sessionId}`)}
                      className="group cursor-pointer bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100 hover:border-purple-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Test Name and Rank */}
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">
                              {result.testName}
                            </h3>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                          
                          {/* Date and Time */}
                          <div className="flex items-center text-sm text-gray-500 mb-4">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            {formatDate(result.submittedAt)}
                            <span className="mx-2">•</span>
                            <Clock className="h-4 w-4 mr-1.5" />
                            Duration: {formatTimeTaken(result.timeTaken)}
                          </div>
                          
                          {/* Score Cards */}
                          <div className="grid grid-cols-4 gap-4">
                            {/* Marks */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <Trophy className="h-3.5 w-3.5 mr-1" />
                                Score
                              </div>
                              <div className="font-semibold text-gray-900">
                                {result.overallResult.totalScore}/{result.totalMarks}
                              </div>
                            </div>
                            
                            {/* Percentage */}
                            <div className={`${scoreBg} rounded-lg p-3`}>
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                                Percentage
                              </div>
                              <div className={`font-semibold ${scoreColor}`}>
                                {percentage}%
                              </div>
                            </div>
                            
                            {/* Accuracy */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <Target className="h-3.5 w-3.5 mr-1" />
                                Accuracy
                              </div>
                              <div className="font-semibold text-gray-900">
                                {result.accuracy}%
                              </div>
                            </div>
                            
                            {/* Percentile */}
                            <div className="bg-purple-50 rounded-lg p-3">
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <Award className="h-3.5 w-3.5 mr-1" />
                                Percentile
                              </div>
                              <div className="font-semibold text-purple-600">
                                {result.percentile || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow Icon */}
                        <div className="ml-4 text-gray-400 group-hover:text-purple-600 transition-colors">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
