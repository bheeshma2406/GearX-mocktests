'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import '../start/test-styles.css';

export default function InstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const { type, id } = params;
  const [agreed, setAgreed] = useState(false);

  const handleStart = () => {
    if (agreed) {
      router.push(`/test/${type}/${id}/start`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GENERAL INSTRUCTIONS</h1>
          <div className="flex items-center justify-end mb-4">
            <span className="text-sm text-gray-600 mr-2">View instructions in:</span>
            <select className="border border-gray-300 rounded px-3 py-1 text-sm">
              <option>English</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            Please read the instructions carefully
          </h2>

          <div className="space-y-4 text-gray-700">
            <div className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <p>The timer will countdown automatically and the test will submit when time ends.</p>
            </div>
            
            <div className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <p>Question palette shows your progress with different colored indicators.</p>
            </div>

            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <span className="legend-not-visited mr-3">19</span>
                  <span>Not visited</span>
                </div>
                <div className="flex items-center">
                  <span className="legend-not-answered mr-3">1</span>
                  <span>Not answered</span>
                </div>
                <div className="flex items-center">
                  <span className="legend-answered mr-3">0</span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center">
                  <span className="legend-marked mr-3">0</span>
                  <span>Marked for review</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="agree" className="ml-2 text-sm font-medium text-gray-900">
                I have read all the instructions
              </label>
            </div>
            
            <button
              onClick={handleStart}
              disabled={!agreed}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                agreed 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
