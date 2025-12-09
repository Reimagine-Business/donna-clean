'use client';

import { useState } from 'react';
import type { Entry } from '@/lib/entries';

export function DebugPanel({ entries, userId }: { entries: Entry[]; userId: string }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700"
      >
        Show Debug Info
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-gray-900 text-white p-4 rounded-lg shadow-2xl max-w-md max-h-96 overflow-auto border-2 border-purple-500">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-purple-300">🔍 Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="bg-gray-800 p-2 rounded">
          <div className="font-semibold text-green-400">✅ User ID:</div>
          <div className="text-xs text-gray-300 break-all">{userId}</div>
        </div>

        <div className="bg-gray-800 p-2 rounded">
          <div className="font-semibold text-yellow-400">📊 Entries Count:</div>
          <div className="text-2xl font-bold">
            {entries.length > 0 ? (
              <span className="text-green-400">{entries.length}</span>
            ) : (
              <span className="text-red-400">0 (PROBLEM!)</span>
            )}
          </div>
        </div>

        {entries.length === 0 && (
          <div className="bg-red-900/50 p-2 rounded border border-red-500">
            <div className="font-semibold text-red-300">⚠️ NO ENTRIES PASSED FROM SERVER</div>
            <div className="text-xs mt-1">
              This means the parent page did not fetch or pass data correctly.
              Check server logs in Vercel dashboard.
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <>
            <div className="bg-gray-800 p-2 rounded">
              <div className="font-semibold text-blue-400 mb-1">📝 First Entry:</div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(entries[0], null, 2).slice(0, 200)}...
              </pre>
            </div>

            <div className="bg-green-900/50 p-2 rounded border border-green-500">
              <div className="font-semibold text-green-300">✅ DATA RECEIVED SUCCESSFULLY</div>
              <div className="text-xs mt-1">
                Server passed {entries.length} entries to the client component.
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-gray-400 mt-2">
          <div>Check browser console for detailed logs</div>
          <div>Press F12 to open Developer Tools</div>
        </div>
      </div>
    </div>
  );
}
