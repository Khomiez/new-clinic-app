// src/components/ui/ErrorScreen.tsx
import React from 'react';

type Props = {
  title: string;
  error: string | null;
  retry?: () => void;
  goBack?: () => void;
}

const ErrorScreen = ({ title, error, retry, goBack }: Props) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md border border-red-100 text-center max-w-md w-full">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-red-600 mb-4">{title}</h2>
        <p className="text-gray-700 mb-6">
          {error || "Something went wrong. Please try again later."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {goBack && (
            <button
              onClick={goBack}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition"
            >
              Go Back
            </button>
          )}
          {retry && (
            <button
              onClick={retry}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;