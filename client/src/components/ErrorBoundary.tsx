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
    // Optionally log to console for dev diagnostics
    // console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    // Render children; if an error occurs, React will call getDerivedStateFromError -> componentDidCatch
    // We could render a fallback here, but since the alert is outside the boundary, just render null on error.
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
