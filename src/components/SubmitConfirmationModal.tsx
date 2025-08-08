'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { AlertTriangle, Clock, User, FileText } from 'lucide-react';

interface TestSummary {
  totalQuestions: number;
  answered: number;
  notAnswered: number;
  notVisited: number;
  markedForReview: number;
  answeredAndMarkedForReview: number;
}

interface SubmitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  testSummary: TestSummary;
  candidateName: string;
  testName: string;
  remainingTime: string;
}

export default function SubmitConfirmationModal({
  isOpen,
  onClose,
  onSubmit,
  testSummary,
  candidateName,
  testName,
  remainingTime
}: SubmitConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-10 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  <span className="text-gray-600">Candidate Name:</span> {candidateName}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Test Name:</span> {testName}
                  <span className="ml-4 font-medium">Remaining Time:</span>
                  <span className="ml-2 bg-blue-100 px-2 py-1 rounded text-blue-700 font-semibold">
                    {remainingTime}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Summary */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-center mb-6 text-gray-800">Test Summary</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Total Questions */}
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-1">Total Question</div>
              <div className="text-2xl font-bold text-gray-800">{testSummary.totalQuestions}</div>
            </div>

            {/* Answered */}
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-1">Answered</div>
              <div className="text-2xl font-bold text-green-600">{testSummary.answered}</div>
            </div>

            {/* Not Answered */}
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-1">Not Answered</div>
              <div className="text-2xl font-bold text-red-600">{testSummary.notAnswered}</div>
            </div>

            {/* Not Visited */}
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-1">Not Visited</div>
              <div className="text-2xl font-bold text-gray-600">{testSummary.notVisited}</div>
            </div>

            {/* Mark for review */}
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-1">Mark for review</div>
              <div className="text-2xl font-bold text-yellow-600">{testSummary.markedForReview}</div>
            </div>

            {/* Answered & Marked for Review */}
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-1">
                Answered & Marked for Revision
                <div className="text-xs text-gray-500 mt-1">(will be considered for evaluation)</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{testSummary.answeredAndMarkedForReview}</div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">
              Are you sure you want to submit for final marking?
            </h3>
            <p className="text-center text-gray-700">
              No changes will be allowed after submission.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={onClose}
              className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Resume
            </button>
            <button
              onClick={onSubmit}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
