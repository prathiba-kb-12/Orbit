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
        <div className="min-h-dvh flex items-center justify-center px-4 bg-[#111318] text-[#F3F4F6]">
          <div className="max-w-md w-full bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 text-center">
            <h2 className="text-lg font-semibold text-[#F3F4F6]">
              Orbit hit a quick pause
            </h2>
            <p className="mt-2 text-sm text-[#9CA3AF] leading-relaxed">
              Nothing in your local data was lost. Click below to reload the workspace cleanly.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
              className="mt-5 min-h-[42px] rounded-xl bg-[#D6A04A] text-[#111318] font-semibold px-5 py-2 text-sm hover:bg-[#E0AD5B] transition-colors"
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
