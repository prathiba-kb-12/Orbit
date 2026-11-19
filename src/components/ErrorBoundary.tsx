import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Prevent blank screen crashes silently
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center px-4 bg-[#040511] text-slate-100">
          <div className="max-w-md w-full aurora-glass-card rounded-[28px] p-7 text-center">
            <h2 className="text-xl font-extrabold text-slate-50">
              Orbit hit a quick pause
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Nothing in your local data was lost. Tap below to reload the view cleanly.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
              className="mt-5 min-h-[48px] rounded-2xl bg-violet-400 text-slate-950 font-extrabold px-6 py-2.5 text-sm hover:bg-violet-300 transition-colors"
            >
              Return to Orbit
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
