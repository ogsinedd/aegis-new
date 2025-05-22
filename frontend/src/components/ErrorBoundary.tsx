import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // TODO: Log error to an external service
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Oops! Something went wrong.</h1>
          <p className="text-lg mb-2">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          {this.state.error && (
            <details className="p-2 bg-slate-800 rounded text-sm mt-4 w-full max-w-2xl overflow-auto">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\nStack Trace:\n${this.state.error.stack}`}
                </pre>
            </details>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-accent text-black rounded hover:bg-accent/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
