import React from 'react';

type Props = {
  onError?: (message: string) => void;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const msg = `Runtime error: ${error.message}`;
    // Forward to alert via callback
    if (this.props.onError) {
      this.props.onError(msg);
    }
    // Log to console for diagnostics
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    // Render children; if an error occurs, React will call getDerivedStateFromError -> componentDidCatch
    // Show minimal fallback UI so user isn't left with blank area
    if (this.state.hasError) {
      return (
        <div role="alert" className="alert alert-danger p-2 rounded">
          An unexpected error occurred while displaying this content.
        </div>
      );
    }
    return this.props.children;
  }
}
