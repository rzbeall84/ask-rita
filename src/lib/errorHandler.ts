import { supabase } from "@/integrations/supabase/client";

export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

interface ErrorLogEntry {
  level: ErrorLevel;
  message: string;
  component?: string;
  userId?: string;
  metadata?: any;
  stack?: string;
  timestamp: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  private constructor() {
    // Flush error queue every 5 seconds
    this.flushInterval = setInterval(() => this.flushErrors(), 5000);
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushErrors());
    }
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public logError(
    error: Error | string,
    level: ErrorLevel = 'error',
    component?: string,
    metadata?: any
  ) {
    const errorEntry: ErrorLogEntry = {
      level,
      message: typeof error === 'string' ? error : error.message,
      component,
      metadata,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    // Get current user ID if available
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        errorEntry.userId = data.user.id;
      }
    });

    // Add to queue
    this.errorQueue.push(errorEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${level.toUpperCase()}] ${component || 'App'}:`, error);
      if (metadata) {
        console.error('Metadata:', metadata);
      }
    }

    // Immediately flush if critical
    if (level === 'critical') {
      this.flushErrors();
    }
  }

  private async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const { error } = await supabase
          .from('error_logs')
          .insert(
            errors.map(e => ({
              level: e.level,
              message: e.message,
              component: e.component,
              user_id: e.userId,
              metadata: e.metadata,
              stack_trace: e.stack,
              created_at: e.timestamp,
            }))
          );

        if (error) {
          throw error;
        }

        // Success - break retry loop
        break;
      } catch (error) {
        if (attempt === this.maxRetries) {
          console.error('Failed to log errors to database after max retries:', error);
          // Store in localStorage as fallback
          this.storeErrorsLocally(errors);
        } else {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
  }

  private storeErrorsLocally(errors: ErrorLogEntry[]) {
    try {
      const storedErrors = localStorage.getItem('failed_error_logs') || '[]';
      const existingErrors = JSON.parse(storedErrors);
      const allErrors = [...existingErrors, ...errors];
      
      // Keep only last 100 errors
      const trimmedErrors = allErrors.slice(-100);
      localStorage.setItem('failed_error_logs', JSON.stringify(trimmedErrors));
    } catch (e) {
      console.error('Failed to store errors locally:', e);
    }
  }

  public async retryFailedLogs() {
    try {
      const storedErrors = localStorage.getItem('failed_error_logs');
      if (!storedErrors) return;

      const errors = JSON.parse(storedErrors);
      if (errors.length === 0) return;

      const { error } = await supabase
        .from('error_logs')
        .insert(
          errors.map((e: ErrorLogEntry) => ({
            level: e.level,
            message: e.message,
            component: e.component,
            user_id: e.userId,
            metadata: e.metadata,
            stack_trace: e.stack,
            created_at: e.timestamp,
          }))
        );

      if (!error) {
        // Clear successfully sent logs
        localStorage.removeItem('failed_error_logs');
      }
    } catch (e) {
      console.error('Failed to retry error logs:', e);
    }
  }

  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushErrors();
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility function for easy error logging
export const logError = (
  error: Error | string,
  level: ErrorLevel = 'error',
  component?: string,
  metadata?: any
) => {
  errorHandler.logError(error, level, component, metadata);
};

// Wrap async functions with error handling
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  component: string
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error as Error, 'error', component, { args });
      throw error;
    }
  }) as T;
};

// React error boundary error handler
export const handleBoundaryError = (error: Error, errorInfo: any) => {
  logError(error, 'critical', 'ErrorBoundary', {
    componentStack: errorInfo.componentStack,
  });
};

// User-friendly error messages
export const getUserFriendlyError = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.message) {
    // Map technical errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Network request failed': 'Unable to connect to the server. Please check your internet connection.',
      'Invalid email or password': 'The email or password you entered is incorrect. Please try again.',
      'User already registered': 'An account with this email already exists. Please sign in instead.',
      'Insufficient permissions': 'You don\'t have permission to perform this action.',
      'Payment required': 'Please upgrade your subscription to access this feature.',
      'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
      'Invalid file type': 'The file type you uploaded is not supported.',
      'File too large': 'The file is too large. Please choose a smaller file.',
      'Session expired': 'Your session has expired. Please sign in again.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};