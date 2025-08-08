import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';

interface TestSubmissionLoaderProps {
  testName: string;
  totalQuestions: number;
  attempted: number;
}

export default function TestSubmissionLoader({ 
  testName, 
  totalQuestions, 
  attempted 
}: TestSubmissionLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { icon: FileText, text: 'Saving your responses...', color: 'text-blue-600' },
    { icon: Clock, text: 'Calculating time analytics...', color: 'text-purple-600' },
    { icon: TrendingUp, text: 'Generating your results...', color: 'text-green-600' },
    { icon: CheckCircle, text: 'Almost done!', color: 'text-indigo-600' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Animated Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className={`relative ${steps[currentStep].color} animate-bounce`}>
              <CurrentIcon className="h-16 w-16" />
            </div>
          </div>
        </div>

        {/* Test Info */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submitting Your Test</h2>
          <p className="text-gray-600">{testName}</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div 
                key={index} 
                className={`flex items-center space-x-3 transition-all duration-500 ${
                  index <= currentStep ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div className={`flex-shrink-0 ${index <= currentStep ? step.color : 'text-gray-400'}`}>
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Questions Attempted</p>
            <p className="text-xl font-bold text-gray-900">{attempted}/{totalQuestions}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-xl font-bold text-gray-900">
              {Math.round((attempted / totalQuestions) * 100)}%
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Please wait while we process your submission...
        </p>
      </div>
    </div>
  );
}
