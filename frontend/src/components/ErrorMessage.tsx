interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-red-600 text-xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">出错了</h3>
          <p className="text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
            >
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
