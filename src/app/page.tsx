'use client';
import Link from 'next/link';
import { BookOpen, Calculator, Atom, FlaskConical, Trophy, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllTests } from '@/lib/firebaseData';
import { TestInfo } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';
import LogoGearX from '@/components/LogoGearX';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="group relative flex items-center space-x-3">
                {/* Soft glow behind the brand */}
                <div className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-fuchsia-500/15 to-cyan-400/15 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                
                {/* Brand icon - custom GearX logo */}
                <div aria-label="GearX logo" className="relative">
                  <LogoGearX size={54} tone="gear5" motion="none" glow />
                </div>

                {/* Wordmark */}
                <div className="flex flex-col">
                  <div className="flex items-end gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                      GearX
                    </h1>
                    <span className="mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-white/70 text-gray-700 ring-1 ring-gray-200 shadow-sm dark:bg-gray-800/70 dark:text-gray-200 dark:ring-white/10">
                      Test Platform
                    </span>
                  </div>
                  {/* Subtle gradient underline */}
                  <span className="mt-1 h-1 w-24 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 opacity-70" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Ready to Excel
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

      {/* Test Categories - Moved Above Hero */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced animated gradient background for cards */}
          <div className="relative">
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -inset-[100%] opacity-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20 blur-3xl animate-gradient-x"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 dark:from-purple-600/20 dark:via-pink-600/20 dark:to-blue-600/20 blur-3xl animate-gradient-y"></div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 relative">
              {/* JEE Section */}
              <div className="group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 transform hover:-translate-y-1 border border-gray-100 dark:border-gray-700">
                {/* Card hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 dark:from-blue-400/0 dark:via-blue-400/10 dark:to-blue-400/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex items-center mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2.5 rounded-xl shadow-lg group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
                    <Calculator className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">JEE Tests</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Joint Entrance Examination</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                    <div className="flex space-x-1 mr-2">
                      <Calculator className="h-4 w-4 text-blue-500" />
                      <Atom className="h-4 w-4 text-green-500" />
                      <FlaskConical className="h-4 w-4 text-red-500" />
                    </div>
                    <span>Math, Physics & Chemistry</span>
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                    <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span>3 Hours • 75 Questions</span>
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                    <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>+4 for correct, -1 for wrong</span>
                  </div>
                </div>
                
                <Link 
                  href="/jee-tests"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25 group-hover:scale-105"
                >
                  <span>Start JEE Tests</span>
                  <BookOpen className="h-4 w-4" />
                </Link>
              </div>

              {/* UGEE Section */}
              <div className="group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 transform hover:-translate-y-1 border border-gray-100 dark:border-gray-700">
                {/* Card hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 dark:from-purple-400/0 dark:via-purple-400/10 dark:to-purple-400/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex items-center mb-4">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2.5 rounded-xl shadow-lg group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-110">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">UGEE Tests</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Undergraduate Entrance Exam</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                    <div className="flex space-x-1 mr-2">
                      <Calculator className="h-4 w-4 text-blue-500" />
                      <Atom className="h-4 w-4 text-green-500" />
                      <FlaskConical className="h-4 w-4 text-red-500" />
                    </div>
                    <span>Math, Physics & Chemistry</span>
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                    <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span>3 Hours • 75 Questions</span>
                  </div>
                  <div className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                    <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>+4 for correct, -1 for wrong</span>
                  </div>
                </div>
                
                <Link 
                  href="/ugee-tests"
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-purple-500/25 group-hover:scale-105"
                >
                  <span>Start UGEE Tests</span>
                  <BookOpen className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-12 bg-white dark:bg-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">Platform Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Timed Tests</h4>
              <p className="text-gray-600 dark:text-gray-300">Experience real exam conditions with accurate timing</p>
            </div>
            <div className="text-center group">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Detailed Analysis</h4>
              <p className="text-gray-600 dark:text-gray-300">Get comprehensive performance reports and insights</p>
            </div>
            <div className="text-center group">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Authentic Questions</h4>
              <p className="text-gray-600 dark:text-gray-300">Practice with real question papers and solutions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <LogoGearX size={24} tone="gear5" motion="none" glow />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              GearX
            </h3>
          </div>
          <p className="text-gray-400">
            Your personalized test platform for JEE and UGEE preparation
          </p>
          <div className="mt-6 text-sm text-gray-500">
            Built with Next.js • Powered by Firebase
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
