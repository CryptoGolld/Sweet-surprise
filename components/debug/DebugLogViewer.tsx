'use client';

import { useState, useEffect } from 'react';
import { debugLogger, type LogEntry } from '@/lib/utils/debugLogger';

export function DebugLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load initial logs
    setLogs(debugLogger.getLogs());

    // Subscribe to new logs
    const unsubscribe = debugLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, []);

  const handleCopy = () => {
    const text = debugLogger.formatForCopy();
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Debug logs copied to clipboard!');
    }).catch(() => {
      alert('❌ Failed to copy. Please select and copy manually.');
    });
  };

  const handleClear = () => {
    if (confirm('Clear all debug logs?')) {
      debugLogger.clear();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2"
      >
        🐛 Debug ({logs.length})
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-sui-dark border-2 border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">🐛 Debug Logs ({logs.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No logs yet</div>
          ) : (
            logs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              const icon = {
                info: '🔍',
                warn: '⚠️',
                error: '❌',
                debug: '🐛',
              }[log.level];

              const color = {
                info: 'text-blue-400',
                warn: 'text-yellow-400',
                error: 'text-red-400',
                debug: 'text-purple-400',
              }[log.level];

              return (
                <div key={log.id} className="bg-white/5 rounded p-2 border border-white/10">
                  <div className={`${color} font-semibold`}>
                    [{time}] {icon} {log.message}
                  </div>
                  {log.data !== undefined && (
                    <pre className="mt-2 text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Copy Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleCopy}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-bold text-lg transition-all"
          >
            📋 Copy All Logs
          </button>
        </div>
      </div>
    </div>
  );
}
