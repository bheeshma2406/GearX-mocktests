'use client';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, BookOpen } from 'lucide-react';

export default function UGEEAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-8">
          <Link 
            href="/ugee-tests" 
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to UGEE Tests</span>
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UGEE Analytics</h1>
          <p className="text-gray-600">Track your performance and progress</p>
        </div>

        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
          <p className="text-gray-500 mb-4">Complete some tests to see your performance analytics and insights.</p>
          <Link
            href="/ugee-tests"
            className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Take a Test</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
