'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllTests } from '@/lib/firebaseData';
import { TestInfo } from '@/types';
import UGEESidebar from '@/components/UGEESidebar';
import { Clock, Users, BookOpen, Calendar, PlayCircle, Calculator, Atom, FlaskConical, Trophy } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function UGEETestsPage() {
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const allTests = await getAllTests();
        // Filter for UGEE tests only
        const ugeeTests = allTests.filter(test => test.type === 'UGEE');
        setTests(ugeeTests);
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 dark:bg-indigo-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 flex">
        <UGEESidebar />
        
        <main className="flex-1">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-xl shadow-lg">
                  <Users className="h-8 w-8" />
                </div>
                UGEE Tests
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">Choose a test to start practicing</p>
            </div>

            {/* Animated gradient background for cards */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-indigo-400/20 to-blue-400/20 dark:from-purple-600/10 dark:via-indigo-600/10 dark:to-blue-600/10 blur-3xl animate-gradient-x"></div>
              
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 relative">
                  <SkeletonLoader type="card" count={6} />
                </div>
              ) : tests.length === 0 ? (
                <div className="text-center py-16 relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl">
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-800/30 p-8 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">No UGEE tests available</h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">Tests will appear here once they are uploaded to the platform. Check back soon!</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 relative">
                  {tests.map((test) => (
                    <div 
                      key={test.id} 
                      className="group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 dark:border-gray-700"
                      role="article"
                      aria-label={`Test: ${test.name}`}
                    >
                      {/* Card hover glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 dark:from-purple-400/0 dark:via-purple-400/10 dark:to-purple-400/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2.5 rounded-xl shadow-lg group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-110">
                              <Users className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                              {test.type}
                            </span>
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{test.name}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{test.description || "A full mock test based on the latest UGEE pattern."}</p>
                        
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span>{test.duration} minutes</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex space-x-1 mr-2">
                              <Calculator className="h-4 w-4 text-blue-500" />
                              <Atom className="h-4 w-4 text-green-500" />
                              <FlaskConical className="h-4 w-4 text-red-500" />
                            </div>
                            <span>{test.totalQuestions} questions</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                            <span>+4 for correct, -1 for wrong</span>
                          </div>
                        </div>
                        
                        <Link
                          href={`/test/${test.type.toLowerCase()}/${test.id}/instructions`}
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-purple-500/25 group-hover:scale-105"
                          aria-label={`Start ${test.name} test`}
                        >
                          <PlayCircle className="h-5 w-5" aria-hidden="true" />
                          <span>Start Test</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

