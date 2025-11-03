/**
 * Mobile-friendly debug logger
 * Collects all debug logs and displays them in a modal
 */

export type LogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
};

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  log(message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
    };
    
    this.addLog(entry);
    console.log(`🔍 ${message}`, data || '');
  }

  warn(message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
    };
    
    this.addLog(entry);
    console.warn(`⚠️ ${message}`, data || '');
  }

  error(message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data,
    };
    
    this.addLog(entry);
    console.error(`❌ ${message}`, data || '');
  }

  debug(message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      data,
    };
    
    this.addLog(entry);
    console.log(`🔍 ${message}`, data || '');
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  formatForCopy(): string {
    return this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const prefix = {
        info: '🔍',
        warn: '⚠️',
        error: '❌',
        debug: '🐛',
      }[log.level];
      
      let line = `[${time}] ${prefix} ${log.message}`;
      
      if (log.data !== undefined) {
        try {
          line += '\n' + JSON.stringify(log.data, null, 2);
        } catch {
          line += '\n' + String(log.data);
        }
      }
      
      return line;
    }).join('\n\n');
  }
}

export const debugLogger = new DebugLogger();
