import { Component } from 'react';
import { analytics } from '../lib/analytics';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('Uncaught error:', error, info.componentStack);
        analytics.trackError('ErrorBoundary', error.message || 'Unknown error');
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            An unexpected error occurred. You can try reloading the
                            page or click the button below to recover.
                        </p>
                        {this.state.error && (
                            <pre className="text-left text-sm bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto max-h-40 text-gray-700 dark:text-gray-300">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-slate-800 transition-colors"
                            >
                                Try again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Reload page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
