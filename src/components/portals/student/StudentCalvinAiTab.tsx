import React, { useState, useRef, useEffect } from 'react';
import { 
  Crown, 
  Send, 
  Bot, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RotateCcw, 
  Key, 
  BookOpen, 
  Award, 
  Lightbulb, 
  HelpCircle,
  ShieldCheck,
  Zap,
  Bell,
  Sparkles
} from 'lucide-react';
import { useSchool } from '../../../context/SchoolContext';
import { StudentProfile } from '../../../types';

interface StudentCalvinAiTabProps {
  student: StudentProfile;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'calvin';
  text: string;
  timestamp: string;
  tier?: 'regular' | 'premium';
  source?: string;
  modelUsed?: string;
}

// Converts caret notation like x^2, 10^5, ^(x+1) into proper unicode superscripts
function cleanMathExponents(str: string): string {
  const superscriptMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 'i': 'ⁱ'
  };

  // Replace ^(content) or ^word
  let res = str.replace(/\^([0-9+\-nxyab]+)/gi, (_, exp) => {
    return exp.split('').map((c: string) => superscriptMap[c.toLowerCase()] || c).join('');
  });

  // Replace single digit exponents
  res = res.replace(/\^([0-9])/g, (_, digit) => superscriptMap[digit] || digit);

  // Clean chemical formulas like CO_2, H_2O
  const subscriptMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋'
  };
  res = res.replace(/_([0-9+\-])/g, (_, sub) => subscriptMap[sub] || sub);

  // Common LaTeX sanitization if any model produced raw LaTeX
  res = res
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\pm\b/g, '±')
    .replace(/\\times\b/g, '×')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\xrightarrow\[[^\]]*\]\{[^}]*\}/g, '──>')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\$\$/g, '')
    .replace(/\$/g, '');

  return res;
}

// Parses inline bold (**text** or __text__), italics (*text* or _text_), and clean math
function renderInlineFormatted(text: string, isUser: boolean = false): React.ReactNode[] {
  const cleaned = cleanMathExponents(text);
  
  // Split by bold (**...** or __...__)
  const boldParts = cleaned.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  
  return boldParts.map((part, idx) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className={isUser ? 'font-bold text-white' : 'font-extrabold text-slate-900'}>
          {inner}
        </strong>
      );
    }
    // Check italics (*...* or _..._)
    const italicParts = part.split(/(\*[^*]+\*|_[^_]+_)/g);
    if (italicParts.length > 1) {
      return (
        <React.Fragment key={idx}>
          {italicParts.map((subPart, subIdx) => {
            if ((subPart.startsWith('*') && subPart.endsWith('*')) || (subPart.startsWith('_') && subPart.endsWith('_'))) {
              return (
                <em key={subIdx} className="italic text-indigo-900 font-medium">
                  {subPart.slice(1, -1)}
                </em>
              );
            }
            return subPart;
          })}
        </React.Fragment>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

// StudentFriendlyMessageContent component
export const StudentFriendlyMessageContent: React.FC<{ text: string; isUser?: boolean }> = ({ text, isUser = false }) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap font-normal break-words">{text}</div>;
  }

  // Pre-process lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list-${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <div className="flex-1">{renderInlineFormatted(item, false)}</div>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList(`line-${i}`);
      if (elements.length > 0 && i < lines.length - 1 && lines[i + 1].trim()) {
        elements.push(<div key={`spacer-${i}`} className="h-2" />);
      }
      continue;
    }

    // Check for markdown headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^#{1,6}\s*(.+)$/);
    if (headingMatch) {
      flushList(`heading-${i}`);
      const headingText = headingMatch[1];
      elements.push(
        <div key={`heading-${i}`} className="mt-3.5 mb-1.5 pt-2 first:pt-0 border-t first:border-t-0 border-slate-100">
          <div className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
            <span>{renderInlineFormatted(headingText, false)}</span>
          </div>
        </div>
      );
      continue;
    }

    // Check for bullet items (* item, - item, • item)
    const bulletMatch = trimmed.match(/^[*•\-]\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Check for numbered items (1. item, 2. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      flushList(`num-${i}`);
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 pl-1">
          <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1 text-slate-800 leading-relaxed">
            {renderInlineFormatted(numMatch[2], false)}
          </div>
        </div>
      );
      continue;
    }

    flushList(`plain-${i}`);

    // If it's a prominent formula or chemical/math equation
    const isFormulaLine = (trimmed.includes('→') || trimmed.includes('──>') || trimmed.includes('=') || trimmed.includes('±') || trimmed.includes('√')) && 
      (trimmed.includes('²') || trimmed.includes('³') || trimmed.includes('CO') || trimmed.includes('H₂') || trimmed.includes('Δ') || trimmed.startsWith('x =') || trimmed.startsWith('f(') || (trimmed.length < 65 && trimmed.includes('=')));

    if (isFormulaLine && !trimmed.endsWith('.')) {
      elements.push(
        <div key={`formula-${i}`} className="my-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-xs text-slate-900 overflow-x-auto text-center font-bold tracking-wide shadow-xs">
          {cleanMathExponents(trimmed)}
        </div>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed text-slate-800 my-1 font-normal break-words">
          {renderInlineFormatted(trimmed, false)}
        </p>
      );
    }
  }

  flushList('end');

  return <div className="space-y-1">{elements}</div>;
};

export const StudentCalvinAiTab: React.FC<StudentCalvinAiTabProps> = ({ student }) => {
  const { 
    redeemCalvinToken, 
    calvinTokens, 
    recordCalvinQuestionAsked,
    acceptTokenPromptAndActivate,
    dismissTokenPrompt
  } = useSchool();

  const [inputTokenCode, setInputTokenCode] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`calvin_chat_${student.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat messages', e);
      }
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'calvin',
        text: `Hello ${student.name.split(' ')[0] || student.name}! I am **Calvin**, your dedicated Academic Tutor for **${student.grade || 'your class'}** at Stanbax Schools.\n\nWhether you need help understanding difficult topics, working through step-by-step solutions, or preparing for exams, I am here for you. What would you like to explore today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check student active Calvin access
  const access = student.calvinAiAccess;
  const isAccessValid = access?.active && (!access.expiresAt || new Date(access.expiresAt) > new Date());
  const isPremium = access?.tier === 'premium';

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!access?.expiresAt) return null;
    const diffMs = new Date(access.expiresAt).getTime() - new Date().getTime();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  };

  useEffect(() => {
    try {
      localStorage.setItem(`calvin_chat_${student.id}`, JSON.stringify(messages));
    } catch {}
  }, [messages, student.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!inputTokenCode && student.tokenPrompt?.status === 'pending' && student.tokenPrompt.tokenCode) {
      setInputTokenCode(student.tokenPrompt.tokenCode);
    }
  }, [student.tokenPrompt, inputTokenCode]);

  const handleRedeemToken = (codeToRedeem?: string) => {
    const code = (codeToRedeem || inputTokenCode).trim();
    if (!code) {
      setTokenError('Please enter a valid token voucher code.');
      return;
    }

    setIsRedeeming(true);
    setTokenError(null);
    setTokenSuccess(null);

    setTimeout(() => {
      const result = redeemCalvinToken(student.id, code);
      setIsRedeeming(false);
      if (result.success) {
        setTokenSuccess(result.message);
        setInputTokenCode('');
        // Add celebration welcome message
        const welcomeTierMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'calvin',
          text: `**Congratulations, ${student.name.split(' ')[0]}!** Your **${result.tier === 'premium' ? 'Premium Masterclass' : 'Regular'}** token has been verified!\n\n${result.tier === 'premium' ? 'You now have access to high-depth derivations, WAEC/JAMB exam secrets, memory mnemonics, and deep academic reasoning!' : 'You have access to fast, class-tailored curriculum explanations!'} How can I assist you with your studies right now?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tier: result.tier
        };
        setMessages(prev => [...prev, welcomeTierMsg]);
      } else {
        setTokenError(result.message);
      }
    }, 400);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const query = (customPrompt || inputText).trim();
    if (!query || isLoading) return;

    if (!isAccessValid) {
      setTokenError('Your Calvin AI access token is expired or inactive. Please redeem a token below.');
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    recordCalvinQuestionAsked(student.id);

    try {
      // Build previous turns for context
      const chatHistory = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await fetch('/api/calvin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          studentName: student.name,
          classLevel: student.grade || 'Senior Secondary',
          tier: access?.tier || 'regular',
          chatHistory
        })
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const calvinMsg: ChatMessage = {
          id: `msg-${Date.now()}-calvin`,
          sender: 'calvin',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tier: data.tier,
          source: data.source,
          modelUsed: data.modelUsed
        };
        setMessages(prev => [...prev, calvinMsg]);
      } else {
        throw new Error(data.error || 'Unable to retrieve answer');
      }
    } catch (err: any) {
      console.warn('Calvin chat fetch failed:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now()}-calvin`,
        sender: 'calvin',
        text: `I had a slight connection hiccup, but here is what you need to know about your question:\n\n**"${query}"** is an important topic in your ${student.grade} syllabus. Focus on the core definition in your textbook and break the steps down sequentially. Try asking again in a moment or break your question into smaller parts!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tier: access?.tier || 'regular'
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear your conversation with Calvin?')) {
      const resetMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'calvin',
        text: `Chat cleared! Ready for your next academic question, ${student.name.split(' ')[0]}. What are we studying?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([resetMsg]);
      localStorage.removeItem(`calvin_chat_${student.id}`);
    }
  };

  // Class-specific quick prompt ideas
  const getPromptSuggestions = () => {
    const g = (student.grade || '').toLowerCase();
    if (g.includes('sss') || g.includes('ss 2') || g.includes('ss 3') || g.includes('ss 1')) {
      return [
        "Explain electrolysis of copper (II) sulphate solution with cathode & anode equations",
        "Solve the quadratic equation 3x² - 5x + 2 = 0 step by step",
        "Give a concise WAEC summary of Themes in Things Fall Apart",
        "Distinguish between Fiscal Policy and Monetary Policy with Nigerian examples",
        "How do I balance redox equations using the half-reaction method?"
      ];
    } else if (g.includes('jss') || g.includes('junior')) {
      return [
        "Explain the kinetic theory of matter with simple examples",
        "Calculate the circumference and area of a circle with radius 7cm",
        "Explain Adverbs vs Adjectives with sample sentences",
        "What are fundamental human rights in Nigerian Civic Education?",
        "How does the human respiratory system exchange gases?"
      ];
    } else if (g.includes('primary') || g.includes('basic')) {
      return [
        "Explain living and non-living things with examples from my school garden",
        "Help me practice long division: 456 divided by 4 step by step",
        "Why do green plants need sunlight, water, and soil?",
        "Write a short, beautiful essay about My Best Friend",
        "What are the three primary states of matter?"
      ];
    } else {
      // Early Years / Nursery
      return [
        "Tell me a fun counting story with fruits and numbers",
        "What sounds do different farm animals make?",
        "Teach me a cheerful rhyme about colors and shapes",
        "Why is it important to wash our hands before eating?"
      ];
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-60 h-60 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Bot className="w-9 h-9 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">Calvin AI</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Personal Academic Tutor
                </span>
                {isAccessValid && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                    isPremium 
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-400/20' 
                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                  }`}>
                    {isPremium ? <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                    {isPremium ? 'PREMIUM TIER' : 'REGULAR TIER'}
                  </span>
                )}
              </div>
              <p className="text-blue-200 text-sm mt-1 max-w-xl">
                Tailored for <strong className="text-white">{student.name}</strong> • Enrolled in <span className="text-white font-medium">{student.grade || 'Senior School'}</span>.
                Calvin provides age and class-appropriate curriculum mastery.
              </p>
            </div>
          </div>

          {/* Token Status Badge / Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {isAccessValid ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-right">
                <div className="flex items-center gap-1.5 justify-end text-xs text-blue-200">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{calculateDaysRemaining()}</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Voucher: <code className="font-mono text-purple-200 font-semibold">{access.tokenCode}</code>
                </div>
                <div className="text-[11px] text-blue-300/80 mt-0.5">
                  Questions asked: <strong className="text-white">{access.questionsCount || 0}</strong>
                </div>
              </div>
            ) : (
              <div className="bg-rose-500/20 border border-rose-500/40 rounded-xl p-3.5 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Token Inactive / Expired</div>
                  <div className="text-[11px] text-rose-200/90">Purchase token from Super Admin to unlock Calvin</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Token Activation Prompt Banner */}
      {student.tokenPrompt && student.tokenPrompt.status === 'pending' && (
        <div className="bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-blue-500/15 border-2 border-indigo-400 rounded-3xl p-5 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <Bell className="w-3.5 h-3.5 text-amber-300" />
                  <span>Admin Token Activation Prompt</span>
                </span>
                {student.tokenPrompt.tier && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>{student.tokenPrompt.tier === 'premium' ? 'Premium Masterclass' : 'Regular Pass'}</span>
                  </span>
                )}
                {student.tokenPrompt.durationLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                    {student.tokenPrompt.durationLabel}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed max-w-2xl pt-0.5">
                {student.tokenPrompt.message}
              </p>
              {student.tokenPrompt.tokenCode && (
                <div className="pt-1 flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-bold">Assigned Voucher:</span>
                  <code className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 font-mono font-black text-indigo-700 text-xs shadow-xs">
                    {student.tokenPrompt.tokenCode}
                  </code>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const res = acceptTokenPromptAndActivate(student.id);
                  if (res.success) {
                    setTokenSuccess(res.message);
                    const welcomeMsg: ChatMessage = {
                      id: `msg-${Date.now()}`,
                      sender: 'calvin',
                      text: `Congratulations, ${student.name.split(' ')[0]}! Your Calvin AI access is now unlocked via your Administrator activation pass! What topic in your ${student.grade} syllabus shall we explore?`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      tier: res.tier
                    };
                    setMessages(prev => [...prev, welcomeMsg]);
                  }
                }}
                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Activate My Token Pass</span>
              </button>
              <button
                type="button"
                onClick={() => dismissTokenPrompt(student.id)}
                className="px-3.5 py-3 rounded-2xl text-slate-600 hover:text-slate-800 hover:bg-white/60 text-xs font-bold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isAccessValid ? (
        /* ACTIVE CHAT WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Window (3 columns on lg) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Chat Header Toolbar */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Bot className="w-6 h-6 text-indigo-600" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Calvin Study Session</h3>
                  <span className="text-[11px] text-slate-500">
                    Active Curriculum: <strong className="text-slate-700">{student.grade || 'Standard'}</strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  title="Clear Conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-indigo-600 text-white shadow-sm'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm relative group ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}>
                    {/* Model tag if Calvin */}
                    {msg.sender === 'calvin' && (
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-[11px]">
                        <span className="font-semibold text-indigo-700 flex items-center gap-1">
                          {isPremium ? (
                            <>
                              <Crown className="w-3 h-3 text-amber-500" />
                              Calvin AI Premium Masterclass
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3 h-3 text-indigo-500" />
                              Calvin AI Standard Tutor
                            </>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            title="Copy reply"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formatted Text */}
                    <div className="font-normal break-words">
                      <StudentFriendlyMessageContent text={msg.text} isUser={msg.sender === 'user'} />
                    </div>

                    <div className={`text-[10px] mt-2 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span className="text-xs text-slate-500 font-medium">
                      Calvin is reasoning through your curriculum question...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form 
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Ask Calvin any academic question for ${student.grade || 'your class'}...`}
                  disabled={isLoading}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Suggestions & Token Voucher Info (1 column) */}
          <div className="space-y-6">
            {/* Curriculum Topic Chips */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended For {student.grade}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Click any prompt to ask Calvin immediately:
              </p>
              <div className="space-y-2">
                {getPromptSuggestions().map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/70 hover:bg-indigo-50/50 text-xs text-slate-700 hover:text-indigo-900 transition-all font-medium leading-relaxed group flex items-start gap-2"
                  >
                    <span className="text-indigo-400 group-hover:text-indigo-600 shrink-0 font-bold">•</span>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Voucher Information & Upgrade */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  Token Voucher Status
                </h4>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-indigo-100 text-xs space-y-1.5 mb-3 shadow-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Tier:</span>
                  <span className="font-bold text-indigo-900 uppercase">
                    {access?.tier === 'premium' ? 'Premium' : 'Regular'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Voucher Code:</span>
                  <span className="font-mono font-semibold text-slate-700">{access?.tokenCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Validity:</span>
                  <span className="font-medium text-emerald-700">{calculateDaysRemaining()}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 mb-3">
                Need to extend your access or upgrade to <strong>Premium Masterclass</strong>? Enter a new token voucher code:
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={inputTokenCode}
                  onChange={e => setInputTokenCode(e.target.value.toUpperCase())}
                  placeholder="CALVIN-PREM-30D-XXXX"
                  className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
                <button
                  onClick={() => handleRedeemToken()}
                  disabled={!inputTokenCode.trim() || isRedeeming}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  {isRedeeming ? 'Validating Token...' : 'Redeem & Extend'}
                </button>
              </div>

              {tokenError && (
                <div className="mt-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded p-2 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{tokenError}</span>
                </div>
              )}
              {tokenSuccess && (
                <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{tokenSuccess}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* INACTIVE / TOKEN PURCHASE REQUIRED VIEW */
        <div className="max-w-4xl mx-auto space-y-8 py-4">
          {/* Pitch Banner */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-200">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tailored Age & Class-Appropriate Study</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Unlock Calvin AI for {student.name}
            </h2>
            <p className="text-slate-600 text-sm max-w-xl mx-auto">
              Calvin is Stanbax Schools' proprietary academic AI study tutor, personalized to your enrolled class ({student.grade}).
              Students require an authorized access token from the <strong>Super Administrator / Bursary</strong>.
            </p>
          </div>

          {/* Token Tier Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regular Token */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    REGULAR TOKEN
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Standard Academic Tutor</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Fast, clear, age-appropriate answers directly matching your class curriculum.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Direct explanations for math, science, English & commercial subjects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Age-appropriate vocabulary tailored to {student.grade}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Homework concept clarifications & summaries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Single-use voucher valid for configured period (24h, 7d, 30d)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 block">Available from Bursary:</span>
                <span className="text-base font-bold text-slate-800">From ₦500 / 24h Pass</span>
              </div>
            </div>

            {/* Premium Token */}
            <div className="bg-gradient-to-b from-indigo-900 to-purple-950 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden border border-purple-500/30">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-400/40">
                    <Crown className="w-6 h-6 fill-amber-400" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 fill-amber-300" />
                    <span>PREMIUM TOKEN</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Masterclass Deep Reasoning</h3>
                <p className="text-xs text-indigo-200 mt-1 mb-4">
                  Highest-quality academic reasoning with step-by-step derivations, WAEC exam secrets & mnemonics.
                </p>

                <ul className="space-y-2.5 text-xs text-indigo-100">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Deep Mathematical Derivations:</strong> Step-by-step algebraic breakdown with formulas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>WAEC / JAMB / Cambridge Secrets:</strong> Marking scheme tips and common pitfalls to avoid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Mnemonic Memory Tricks:</strong> Catchy formulas and acronyms to memorize tough concepts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Self-Test Practice Questions:</strong> Mini drills with verified answers after every explanation</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <span className="text-xs text-indigo-300 block">Available from Bursary:</span>
                <span className="text-base font-bold text-amber-300">From ₦1,000 / 24h • ₦4,500 / Month</span>
              </div>
            </div>
          </div>

          {/* Redemption Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Redeem Token Voucher</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Enter the unique voucher code issued by the Super Administrator / Bursar:
            </p>

            <form 
              onSubmit={e => {
                e.preventDefault();
                handleRedeemToken();
              }}
              className="space-y-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputTokenCode}
                  onChange={e => setInputTokenCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CALVIN-PREM-30D-XXXX"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-semibold text-center"
                />
                <button
                  type="submit"
                  disabled={!inputTokenCode.trim() || isRedeeming}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-md shadow-indigo-600/20 shrink-0"
                >
                  {isRedeeming ? 'Redeeming...' : 'Activate'}
                </button>
              </div>

              {tokenError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{tokenError}</span>
                </div>
              )}

              {tokenSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{tokenSuccess}</span>
                </div>
              )}
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Each token can only be used once • Single-student assignment</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
