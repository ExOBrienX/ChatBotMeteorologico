// ============================================
// 3. components/LoadingDots.tsx
// ============================================
export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-4 animate-slideIn">
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md border border-slate-600">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}