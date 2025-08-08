'use client';

import { useState } from 'react';
import { migrateAllData } from '@/scripts/migrateAllData';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function MigrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleMigration = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('Starting migration...');

    try {
      await migrateAllData();
      setStatus('success');
      setMessage('✅ All data migrated successfully! You can now view the tests in the JEE Tests section.');
    } catch (error) {
      console.error('Migration failed:', error);
      setStatus('error');
      setMessage(`❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Migration</h1>
          <p className="text-gray-600">
            Migrate your existing test data to the new Next.js platform
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Migration includes:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• AIT-0 Trial Test (20 questions)</li>
              <li>• AIT-1 Trial Test (6 questions)</li>
              <li>• All question images and solutions</li>
              <li>• Test configurations and metadata</li>
            </ul>
          </div>

          {message && (
            <div className={`p-4 rounded-lg flex items-center space-x-2 ${
              status === 'success' ? 'bg-green-50 text-green-700' :
              status === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {status === 'success' && <CheckCircle className="h-5 w-5" />}
              {status === 'error' && <AlertCircle className="h-5 w-5" />}
              {status === 'idle' && isLoading && <Loader className="h-5 w-5 animate-spin" />}
              <p className="text-sm">{message}</p>
            </div>
          )}

          <button
            onClick={handleMigration}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="h-5 w-5 animate-spin" />
                <span>Migrating...</span>
              </div>
            ) : (
              'Start Migration'
            )}
          </button>

          {status === 'success' && (
            <div className="text-center">
              <a
                href="/jee-tests"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View Migrated Tests →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
