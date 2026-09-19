import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 text-red-600 mb-6">
              <AlertTriangle size={32} />
              <h1 className="text-2xl font-bold">Beklenmeyen Bir Hata Oluştu</h1>
            </div>
            
            <p className="text-slate-600 mb-6">
              Uygulama çalışırken kritik bir hata ile karşılaştı. Bu durum genellikle geçicidir.
            </p>

            <div className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-64 mb-6">
              <pre className="text-xs text-red-500 font-mono">
                {this.state.error?.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={20} />
              Uygulamayı Yeniden Yükle
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
