'use client';

import { useState, useRef, useEffect } from 'react';
import Message from './Message';
import LoadingDots from './LoadingDots';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente meteorológico de Chile. Puedo ayudarte con el clima actual, pronósticos para días específicos o el pronóstico semanal. ¿Qué ciudad te interesa?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();

      setMessages([
        ...newMessages,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: '❌ Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-slate-900">
      {/* Header mejorado con gradiente */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white p-4 sm:p-6 shadow-2xl border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse-slow">
            <span className="text-2xl">🌤️</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Chatbot del Clima
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Tu asistente meteorológico de Chile
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container con patrón de fondo */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-900 relative">
        {/* Patrón de fondo sutil */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(148, 163, 184) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10">
          {messages.map((msg, index) => (
            <Message key={index} role={msg.role} content={msg.content} />
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form mejorado */}
      <div className="border-t border-slate-700 p-4 bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre el clima..."
            className="flex-1 px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 transition-all text-sm sm:text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-medium hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-sm sm:text-base active:scale-95"
          >
            <span className="hidden sm:inline">Enviar</span>
            <span className="sm:hidden">📨</span>
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Prueba: "¿Clima en Talca?" o "Pronóstico semanal Santiago"
        </p>
      </div>
    </div>
  );
}