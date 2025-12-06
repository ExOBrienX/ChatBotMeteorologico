// ============================================
// 2. components/Message.tsx
// ============================================
interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slideIn`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
            : 'bg-gradient-to-br from-slate-700 to-slate-800 text-gray-100 rounded-bl-sm border border-slate-600'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}