import { Loader2 } from 'lucide-react';

export function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 animate-pulse">
      <div className="h-56 bg-slate-700"></div>
      <div className="p-6">
        <div className="h-8 bg-slate-700 rounded mb-4"></div>
        <div className="flex space-x-4 mb-4">
          <div className="h-4 bg-slate-700 rounded w-20"></div>
          <div className="h-4 bg-slate-700 rounded w-24"></div>
        </div>
        <div className="flex space-x-3">
          <div className="flex-1 h-12 bg-slate-700 rounded-lg"></div>
          <div className="flex-1 h-12 bg-slate-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
      <p className="text-gray-400 text-lg">Loading amazing vehicles...</p>
    </div>
  );
}

export function NoVehicles() {
  return (
    <div className="text-center py-20">
      <div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
        <svg
          className="w-12 h-12 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">No Vehicles Found</h3>
      <p className="text-gray-400">Try adjusting your filters or search criteria</p>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-24 h-24 mx-auto mb-6 bg-red-900/20 rounded-full flex items-center justify-center">
        <svg
          className="w-12 h-12 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h3>
      <p className="text-gray-400 mb-4">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
