// src/components/ui/LoadingScreen.tsx
import React from 'react';

type Props = {
    pageName: string;
    message?: string;
}

const LoadingScreen = ({ pageName, message }: Props) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md border border-blue-100 text-center animate-pulse">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-blue-800">Loading...</h2>
        <p className="text-blue-400 mt-2">
          {message || `Please wait while we prepare your ${pageName}`}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;