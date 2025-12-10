import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@md-crafter/shared';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary component
 * Catches errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to logger
    logger.error('React component error', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center h-screen w-screen" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="max-w-md mx-4 p-6 border border-tab-border rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-red-400" />
              <h2 className="text-xl font-semibold" style={{ color: 'var(--editor-fg)' }}>
                Something went wrong
              </h2>
            </div>
            
            <p className="text-sm mb-4 opacity-80" style={{ color: 'var(--editor-fg)' }}>
              An unexpected error occurred. Please try reloading the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 p-3 bg-sidebar-hover rounded text-xs font-mono overflow-auto max-h-48">
                <summary className="cursor-pointer mb-2" style={{ color: 'var(--editor-fg)' }}>
                  Error Details (Development Only)
                </summary>
                <div className="text-red-400">
                  <div className="font-semibold mb-1">{this.state.error.name}: {this.state.error.message}</div>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap text-xs opacity-75">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo && (
                    <div className="mt-2 opacity-60">
                      <div className="font-semibold mb-1">Component Stack:</div>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <button
              onClick={this.handleReload}
              className="btn btn-primary flex items-center gap-2 w-full"
            >
              <RefreshCw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

