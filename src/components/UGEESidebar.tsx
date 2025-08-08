'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Bookmark, BarChart3, History, ArrowLeft, Users } from 'lucide-react';

interface UGEESidebarProps {
  showSidebar?: boolean;
}

export default function UGEESidebar({ showSidebar = true }: UGEESidebarProps) {
  const pathname = usePathname();

  if (!showSidebar) return null;

  const navItems = [
    { href: '/ugee-tests', label: 'Tests', icon: BookOpen },
    { href: '/ugee-bookmarks', label: 'Bookmarks', icon: Bookmark },
    { href: '/ugee-analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/ugee-history', label: 'Test History', icon: History },
  ];

  return (
    <nav className="w-64 bg-gradient-to-b from-purple-50/50 to-indigo-50/50 dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-40 h-40 bg-purple-200 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob"></div>
        <div className="absolute bottom-0 -right-4 w-40 h-40 bg-indigo-200 dark:bg-indigo-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 p-6">
        <Link 
          href="/" 
          className="group flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <div className="bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 p-2 rounded-lg transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Link>
        
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2 rounded-lg shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">UGEE Section</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">Navigate your preparation</p>
        </div>
        
        <ul className="space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:shadow-md hover:transform hover:scale-102'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/20'
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    }`} />
                  </div>
                  <span className="font-medium">{label}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-8 bg-white/40 rounded-full"></div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* Bottom decoration */}
        <div className="mt-auto pt-8">
          <div className="bg-gradient-to-r from-purple-400/20 to-indigo-400/20 dark:from-purple-600/20 dark:to-indigo-600/20 h-1 rounded-full"></div>
        </div>
      </div>
    </nav>
  );
}
