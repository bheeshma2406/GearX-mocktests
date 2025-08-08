'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Bookmark, BarChart3, History, ArrowLeft, Calculator, NotebookPen } from 'lucide-react';

interface JEESidebarProps {
  showSidebar?: boolean;
}

export default function JEESidebar({ showSidebar = true }: JEESidebarProps) {
  const pathname = usePathname();

  // Collapsible sidebar: icons-only or icons + labels
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('jeeSidebarCollapsed') : null;
      setCollapsed(saved === '1');
    } catch {}
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') localStorage.setItem('jeeSidebarCollapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  if (!showSidebar) return null;

  const navItems = [
    { href: '/jee-tests', label: 'Tests', icon: BookOpen },
    { href: '/jee-mistakes', label: 'Mistake Notebook', icon: NotebookPen },
    { href: '/jee-bookmarks', label: 'Bookmarks', icon: Bookmark },
    { href: '/jee-analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/jee-history', label: 'Test History', icon: History },
  ];

  return (
    <nav className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-blue-50/50 to-purple-50/50 dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen overflow-y-auto relative transition-[width] duration-300`}>
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-40 h-40 bg-blue-200 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob"></div>
        <div className="absolute bottom-0 -right-4 w-40 h-40 bg-purple-200 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className={`relative z-10 ${collapsed ? 'p-3' : 'p-6'} flex flex-col h-full`}>
        <Link
          href="/"
          className={`group flex items-center ${collapsed ? 'justify-center' : 'space-x-2'} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors`}
          title="Back to Dashboard"
        >
          <div className="bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 p-2 rounded-lg transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          {!collapsed && <span className="text-sm font-medium">Back to Dashboard</span>}
        </Link>
        
        <div className="mb-8">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} mb-2`}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 rounded-lg shadow-lg">
              <Calculator className="h-6 w-6" />
            </div>
            {!collapsed && <h2 className="text-xl font-bold text-gray-900 dark:text-white">JEE Section</h2>}
          </div>
          {!collapsed && <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">Navigate your preparation</p>}
        </div>
        
        <ul className="space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={label}
                  className={`group flex items-center ${collapsed ? 'justify-center px-3' : 'space-x-3 px-4'} py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:shadow-md hover:transform hover:scale-102'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white/20'
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`} />
                  </div>
                  {!collapsed && <span className="font-medium">{label}</span>}
                  {isActive && (
                    collapsed ? (
                      <div className="ml-2 h-2 w-2 rounded-full bg-white/70"></div>
                    ) : (
                      <div className="ml-auto w-1 h-8 bg-white/40 rounded-full"></div>
                    )
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* Bottom controls */}
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-full inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ArrowLeft className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </button>
          <div className="mt-4 bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-600/20 dark:to-purple-600/20 h-1 rounded-full"></div>
        </div>
      </div>
    </nav>
  );
}
