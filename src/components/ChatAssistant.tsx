import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  ExternalLink,
  ChevronDown,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  isOpen,
  onToggle,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: '¡Hola! 🐾 Soy **JuaquiBot**, tu asesor de La Juaquina Pet Shop. ¿En qué te puedo ayudar hoy? Podés preguntarme sobre nutrición para tu perro o gato, piedras sanitarias, compras directas o en Mercado Libre.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    '🐶 ¿Qué alimento le doy a un cachorro?',
    '🐱 ¿Alimento para gato castrado?',
    '🧼 ¿Qué piedras controlan mejor el olor?',
    '🚚 ¿Cómo son los envíos a mi zona?',
    '⚡ ¿Cómo compro por Mercado Libre?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const historyContext = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply || '¡Con gusto te asesoro! ¿Querés ver alguna marca en especial?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botReply]);
      } else {
        throw new Error('Error en chat');
      }
    } catch {
      const fallbackReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '¡Entendido! Tenemos excelentes opciones en la tienda. También podés escribirnos directo por WhatsApp para asesoramiento personalizado al instante.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const renderFormattedText = (text: string) => {
    // Basic markdown parsing for bold tags
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-[#1B4E43]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
          {hasUnread && (
            <div 
              onClick={onToggle}
              className="hidden sm:flex bg-[#FFFDF9] text-[#1B4E43] text-xs font-bold px-3.5 py-2 rounded-2xl shadow-lg border border-[#E8DFC9] items-center gap-1.5 cursor-pointer animate-bounce"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EFA332]" />
              <span>¿Dudas con tu mascota? Chateá acá</span>
            </div>
          )}

          <button
            onClick={onToggle}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1B4E43] to-[#2B6D5E] hover:from-[#153D34] hover:to-[#22574A] text-white shadow-xl flex items-center justify-center relative cursor-pointer transform hover:scale-105 active:scale-95 transition-all"
            aria-label="Abrir chat de asesoramiento"
          >
            <Bot className="w-7 h-7 text-[#EFA332]" />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#DE5D4E] rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      )}

      {/* Expanded chat window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-sm h-[540px] max-h-[85vh] bg-[#FFFDF9] rounded-3xl border border-[#E5D7BF] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B4E43] to-[#256B5C] p-3.5 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#EFA332] text-[#1B4E43] flex items-center justify-center font-bold text-sm shadow-inner">
                🐾
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-display">
                  JuaquiBot
                  <span className="text-[10px] bg-white/20 text-white font-normal px-2 py-0.5 rounded-full">
                    IA Asesor
                  </span>
                </h3>
                <span className="text-[11px] text-[#D3E8E1] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4EED9B] inline-block" />
                  La Juaquina Pet Shop
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href="https://wa.me/5491123456789?text=Hola%20La%20Juaquina,%20necesito%20asesoramiento%20para%20mi%20mascota"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D3E8E1] hover:text-[#25D366] p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Hablar por WhatsApp"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#FAF7F2]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 text-xs ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-[#1B4E43] text-[#EFA332] flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                    🐾
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3 leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-[#1B4E43] text-white rounded-br-none'
                      : 'bg-white text-[#2B231D] border border-[#E8DFC9] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">
                    {renderFormattedText(msg.text)}
                  </p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-white/70' : 'text-[#9A8A78]'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 text-xs items-center text-[#6A5949]">
                <div className="w-6 h-6 rounded-full bg-[#1B4E43] text-white flex items-center justify-center shrink-0 text-[11px]">
                  🐾
                </div>
                <div className="bg-white border border-[#E8DFC9] p-2.5 rounded-2xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#EFA332] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#EFA332] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#EFA332] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-[#7A6A59] ml-1 font-medium">JuaquiBot está escribiendo...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions pills */}
          <div className="px-3 py-1.5 bg-[#F6EFE2] border-t border-[#E8DFC9] overflow-x-auto no-scrollbar flex gap-1.5 shrink-0">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-[11px] font-semibold text-[#1B4E43] bg-white hover:bg-[#E8F3EF] border border-[#DCD0BB] rounded-full px-2.5 py-1 whitespace-nowrap transition-colors shrink-0 shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-2.5 bg-[#FFFDF9] border-t border-[#E8DFC9] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Preguntale sobre alimentos, marcas..."
              className="flex-1 text-xs bg-[#FAF5EC] border border-[#E3D6BE] rounded-full px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4E43]"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              className="w-9 h-9 rounded-full bg-[#EFA332] hover:bg-[#E39420] disabled:opacity-50 text-[#1E170E] flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* WhatsApp Escalation Bottom Strip */}
          <div className="bg-[#FAF7F2] py-1 px-3 border-t border-[#EAE1CE] flex items-center justify-between text-[10px] text-[#7A6A59]">
            <span>¿Preferís hablar con un vendedor?</span>
            <a
              href="https://wa.me/5491123456789?text=Hola%20La%20Juaquina,%20estoy%20en%20la%20tienda%20online%20y%20tengo%20una%20consulta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] font-bold hover:underline flex items-center gap-1"
            >
              WhatsApp Directo
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

        </div>
      )}
    </>
  );
};
