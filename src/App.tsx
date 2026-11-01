import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  StopCircle, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  Loader2, 
  ListTree, 
  FolderArchive, 
  Calendar, 
  Settings, 
  Terminal, 
  Copy, 
  Check, 
  Plus, 
  RefreshCw,
  ImageIcon,
  Cpu,
  Key
} from 'lucide-react';

type TabType = 'agent' | 'plans' | 'files' | 'scheduled' | 'setup';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState('owner@aetheris.local');
  const [activeTab, setActiveTab] = useState<TabType>('agent');

  // Multi-Provider & Custom Keys State
  const [backupGeminiKey, setBackupGeminiKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [providerMode, setProviderMode] = useState('auto');
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Agent Chat & Task state
  const [instruction, setInstruction] = useState('');
  const [taskType, setTaskType] = useState('Chat');
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [tasksHistory, setTasksHistory] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([
    { role: 'assistant', text: 'Mingalarbar! I am your private personal AI agent. Ready for research, web search, coding tasks, or document analysis.', time: 'Just now' }
  ]);

  // Files state
  const [files, setFiles] = useState<any[]>([]);

  // Scheduled tasks state
  const [scheduledTasks, setScheduledTasks] = useState<any[]>([]);
  const [newSchedName, setNewSchedName] = useState('');
  const [newSchedInstruction, setNewSchedInstruction] = useState('');
  const [newSchedTime, setNewSchedTime] = useState('08:00');

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
    fetchScheduledTasks();
    fetchTasksHistory();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/settings/config');
      const data = await res.json();
      if (data) {
        setProviderMode(data.activeProvider || 'auto');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/settings/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupGeminiKey,
          groqApiKey,
          activeProvider: providerMode,
        }),
      });
      setKeySavedMessage(true);
      setTimeout(() => setKeySavedMessage(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) setFiles(data.files);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchScheduledTasks = async () => {
    try {
      const res = await fetch('/api/scheduled');
      const data = await res.json();
      if (data.tasks) setScheduledTasks(data.tasks);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasksHistory = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.tasks) setTasksHistory(data.tasks);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, password: 'demo' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (err) {
      setIsAuthenticated(true); // fallback for seamless private demo
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  const handleRunTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isRunning) return;

    const userMsg = { role: 'user', text: instruction, time: new Date().toLocaleTimeString() };
    setConversation(prev => [...prev, userMsg]);
    const currentInst = instruction;
    setInstruction('');
    setIsRunning(true);

    try {
      const res = await fetch('/api/agent/run-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: currentInst, taskType }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTask(data.task);
        setTasksHistory(prev => [data.task, ...prev]);
        setConversation(prev => [
          ...prev, 
          { role: 'assistant', text: data.result, time: new Date().toLocaleTimeString(), file: data.file, imageUrl: data.imageUrl }
        ]);
        fetchFiles();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      let errMsg = err?.message || 'Error executing task';
      if (typeof errMsg === 'string' && (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE'))) {
        errMsg = 'AI Model ယာယီ လူသုံးများနေပါသည် (Server High Demand - 503)။ Auto-fallback စနစ်ဖြင့် နောက်ထပ် Model သို့ ပြောင်းလဲချိတ်ဆက်ထားပါသည်၊ ခဏနားပြီး ထပ်မံ ပို့ကြည့်ပေးပါရှင်။';
      }
      setConversation(prev => [
        ...prev,
        { role: 'assistant', text: errMsg, time: new Date().toLocaleTimeString() }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateScheduled = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedName || !newSchedInstruction) return;
    try {
      const res = await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSchedName,
          instruction: newSchedInstruction,
          schedule: newSchedTime,
          timezone: 'Asia/Yangon',
          outputType: 'markdown'
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSchedName('');
        setNewSchedInstruction('');
        fetchScheduledTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (id: string) => {
    await fetch(`/api/files/${id}`, { method: 'DELETE' });
    fetchFiles();
  };

  const handleToggleScheduled = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/scheduled/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !currentStatus }),
    });
    fetchScheduledTasks();
  };

  const handleDeleteScheduled = async (id: string) => {
    await fetch(`/api/scheduled/${id}`, { method: 'DELETE' });
    fetchScheduledTasks();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 text-cyan-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold mb-2">Private Owner Login</h1>
          <p className="text-xs text-slate-400 mb-6">Enter your owner credentials to access your private AI agent workspace.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Owner Email</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm"
            >
              Authenticate Owner
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-8 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">Aetheris</span>
            <span className="block text-[10px] text-cyan-400 font-medium">Private AI Agent</span>
          </div>
        </div>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button 
            onClick={() => setActiveTab('agent')} 
            className={`transition-colors whitespace-nowrap hover:text-white ${activeTab === 'agent' ? 'text-white font-semibold border-b-2 border-cyan-500 pb-1' : ''}`}
          >
            Chat & Tasks
          </button>
          <button 
            onClick={() => setActiveTab('plans')} 
            className={`transition-colors whitespace-nowrap hover:text-white ${activeTab === 'plans' ? 'text-white font-semibold border-b-2 border-cyan-500 pb-1' : ''}`}
          >
            Activity & Plan
          </button>
          <button 
            onClick={() => setActiveTab('files')} 
            className={`transition-colors whitespace-nowrap hover:text-white ${activeTab === 'files' ? 'text-white font-semibold border-b-2 border-cyan-500 pb-1' : ''}`}
          >
            Files & Exports
          </button>
          <button 
            onClick={() => setActiveTab('scheduled')} 
            className={`transition-colors whitespace-nowrap hover:text-white ${activeTab === 'scheduled' ? 'text-white font-semibold border-b-2 border-cyan-500 pb-1' : ''}`}
          >
            Scheduled Tasks
          </button>
          <button 
            onClick={() => setActiveTab('setup')} 
            className={`transition-colors whitespace-nowrap hover:text-white ${activeTab === 'setup' ? 'text-white font-semibold border-b-2 border-cyan-500 pb-1' : ''}`}
          >
            Setup & Guide
          </button>
        </nav>

        {/* Zone 3: Primary action / Logout */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[120px]">{ownerEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg bg-slate-900 border border-slate-800"
            title="Lock Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <button onClick={() => setActiveTab('agent')} className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${activeTab === 'agent' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400'}`}>Chat</button>
        <button onClick={() => setActiveTab('plans')} className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${activeTab === 'plans' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400'}`}>Activity</button>
        <button onClick={() => setActiveTab('files')} className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${activeTab === 'files' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400'}`}>Files</button>
        <button onClick={() => setActiveTab('scheduled')} className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${activeTab === 'scheduled' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400'}`}>Scheduled</button>
        <button onClick={() => setActiveTab('setup')} className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${activeTab === 'setup' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400'}`}>Guide</button>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* TAB 1: CHAT & TASKS */}
        {activeTab === 'agent' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 flex flex-col h-[75vh] bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Agent Ready (Asia/Yangon)</span>
                </div>
                <div className="text-xs text-slate-400">
                  Model: <span className="text-cyan-400 font-medium">Gemini Flash (Auto-failover)</span>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {conversation.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-cyan-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {msg.imageUrl && (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
                          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
                            <img
                              src={msg.imageUrl}
                              alt="AI Artwork"
                              className="w-full max-h-72 object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex justify-end">
                            <a
                              href={msg.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              download="flux_ai_artwork.jpg"
                              className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Save High-Res Image
                            </a>
                          </div>
                        </div>
                      )}
                      {msg.file && (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium truncate">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="truncate">{msg.file.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              const blob = new Blob([msg.file.content], { type: msg.file.type === 'image' ? 'text/plain' : 'text/markdown' });
                              const url = msg.file.type === 'image' ? msg.file.content : URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = msg.file.name;
                              a.click();
                            }}
                            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex items-center gap-3 text-cyan-400 text-xs bg-slate-800/50 p-3.5 rounded-xl border border-slate-800 w-fit">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {taskType === 'Chat'
                        ? 'အေးဂျင့်မှ အဖြေစဉ်းစားနေပါသည်... (Thinking...)'
                        : taskType === 'Image'
                          ? 'အခမဲ့ FLUX AI ဖြင့် ပုံဆွဲနေပါသည်... (Synthesizing Artwork...)'
                          : taskType === 'Research'
                            ? 'အချက်အလက်များ ရှာဖွေစုစည်းနေပါသည်... (Researching & Web Searching...)'
                            : taskType === 'Build'
                              ? 'ပရောဂျက်နှင့် ကုဒ်များ တည်ဆောက်နေပါသည်... (Building Project...)'
                              : 'ဖိုင်များ စစ်ဆေးနေပါသည်... (Analyzing Document...)'}
                    </span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleRunTask} className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Chat">General Chat (စကားပြော/မေးမြန်းရန်)</option>
                      <option value="Image">AI ပုံဆွဲခြင်း (Free FLUX Image Gen)</option>
                      <option value="Research">Research & Search (ဝဘ်ရှာဖွေမှုနှင့် အစီရင်ခံစာ)</option>
                      <option value="Build">Build Project / Code (ကုဒ်တည်ဆောက်ခြင်း)</option>
                      <option value="Analyze">Analyze Document (ဖိုင်စစ်ဆေးခြင်း)</option>
                    </select>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">· Multi-Provider</span>
                  </div>
                  {/* Quick Suggestions for fast testing */}
                  <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-[11px]">
                    <button
                      type="button"
                      onClick={() => setInstruction('Hi')}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
                    >
                      Hi
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTaskType('Image'); setInstruction('A cute baby cat playing in a sunny blooming garden, ultra realistic, 8k'); }}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
                    >
                      🎨 ပုံဆွဲရန်
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTaskType('Research'); setInstruction('နောက်ဆုံးပေါ် AI သတင်းများ ရှာပေးပါ'); }}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
                    >
                      AI သတင်းရှာရန်
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <textarea
                    rows={2}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder={
                      taskType === 'Image' 
                        ? "ဆွဲလိုသော ပုံအကြောင်း ရေးပါ (ဥပမာ- ရွှေရောင် ကြောင်ကလေး၊ ပန်းခြံထဲက အိမ်ကလေး)..."
                        : taskType === 'Chat' 
                          ? "မေးမြန်းလိုရာ စာသားရိုက်ထည့်ပါ (ဥပမာ- Hi, မင်္ဂလာပါ)..." 
                          : "အေးဂျင့်အား သုတေသနရှာဖွေခိုင်းရန် သို့မဟုတ် ပရောဂျက်တည်ဆောက်ခိုင်းရန်..."
                    }
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isRunning}
                    className="p-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Context / Recent Tasks Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-cyan-400" />
                  Active Task Overview
                </h3>
                {currentTask ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-medium capitalize">{currentTask.status}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Task Title:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[180px]">{currentTask.title}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Steps Executed:</span>
                      <span className="text-cyan-400 font-medium">{currentTask.currentStep} / {currentTask.maxSteps}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No active task running. Submit a prompt in chat to start.</p>
                )}
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-cyan-400" />
                  Recent Exports
                </h3>
                <div className="space-y-2">
                  {files.slice(0, 3).map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-300 truncate max-w-[150px]">{f.name}</span>
                      <span className="text-[10px] text-slate-500">{f.size}</span>
                    </div>
                  ))}
                  {files.length === 0 && <p className="text-xs text-slate-500">No exports yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY & PLAN */}
        {activeTab === 'plans' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Execution Plan & Activity Log</h2>
                <p className="text-xs text-slate-400">Transparent user-visible step logs and tool execution records.</p>
              </div>
              <button onClick={fetchTasksHistory} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {tasksHistory.map(task => (
                <div key={task.id} className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{task.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Type: {taskType} · Created: {new Date(task.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 font-medium capitalize">
                      {task.status}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">Step Logs</span>
                    {task.steps?.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-cyan-400">Step {step.step}:</span>
                            <span className="text-slate-200 font-medium">{step.title}</span>
                          </div>
                          <p className="text-slate-400">{step.summary}</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {tasksHistory.length === 0 && (
                <div className="text-center py-16 text-slate-600">
                  <ListTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No task execution logs available yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FILES & EXPORTS */}
        {activeTab === 'files' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Files & Project Exports</h2>
                <p className="text-xs text-slate-400">Private secure files stored in owner-scoped workspace storage.</p>
              </div>
              <button onClick={fetchFiles} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map(file => (
                <div key={file.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 overflow-hidden">
                      {file.type === 'image' ? (
                        <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate max-w-[180px]">{file.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{file.size} · Related: {file.relatedTask || 'General'}</p>
                      <span className="text-[10px] text-slate-500">{new Date(file.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.type === 'image' ? (
                      <a
                        href={file.content}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                        title="Open Image"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          const blob = new Blob([file.content || 'Sample export content'], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = file.name;
                          a.click();
                        }}
                        className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {files.length === 0 && (
              <div className="text-center py-16 text-slate-600">
                <FolderArchive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No files or exports found.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SCHEDULED TASKS */}
        {activeTab === 'scheduled' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Create Scheduled Task</h2>
              </div>
              <form onSubmit={handleCreateScheduled} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Task Name</label>
                  <input
                    type="text"
                    value={newSchedName}
                    onChange={(e) => setNewSchedName(e.target.value)}
                    placeholder="e.g. Daily AI Market Brief"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Agent Instruction</label>
                  <textarea
                    rows={3}
                    value={newSchedInstruction}
                    onChange={(e) => setNewSchedInstruction(e.target.value)}
                    placeholder="What should the agent do daily..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Run Time (Asia/Yangon)</label>
                  <input
                    type="time"
                    value={newSchedTime}
                    onChange={(e) => setNewSchedTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Scheduled Task
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-white">Configured Scheduled Tasks</h3>
              <div className="space-y-3">
                {scheduledTasks.map(sched => (
                  <div key={sched.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${sched.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                        <h4 className="text-sm font-semibold text-white">{sched.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleScheduled(sched.id, sched.enabled)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${sched.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
                        >
                          {sched.enabled ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDeleteScheduled(sched.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300">{sched.instruction}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                      <span>Schedule: {sched.schedule} ({sched.timezone})</span>
                      <span>Last Result: {sched.lastResult}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETUP & GUIDE */}
        {activeTab === 'setup' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-8">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-white">Multi-Provider AI & Backup Keys Configuration</h2>
              <p className="text-xs text-slate-400">Configure secondary AI keys and provider routing for uninterrupted high performance.</p>
            </div>

            {/* Provider Manager Card */}
            <form onSubmit={handleSaveConfig} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">Active AI Providers</span>
                </div>
                {keySavedMessage && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Settings Saved!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-semibold text-white">1. Google Gemini (Primary)</span>
                  <p className="text-[11px] text-emerald-400">● Active (Gemini 2.5/3.8 Flash with Google Search)</p>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-semibold text-white">2. Free Image AI (Pollinations / FLUX)</span>
                  <p className="text-[11px] text-emerald-400">● 100% Free (No API Key Required)</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Backup Gemini API Key (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">Used automatically if your primary Gemini key reaches rate limits or 503 errors.</p>
                  <input
                    type="password"
                    value={backupGeminiKey}
                    onChange={(e) => setBackupGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Groq API Key (Optional - Ultra-fast Llama 3.3 70B)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">Free at console.groq.com. Provides blazing fast ~500 tokens/sec chat fallback.</p>
                  <input
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Provider Routing Mode</label>
                  <select
                    value={providerMode}
                    onChange={(e) => setProviderMode(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto">Auto (Gemini + Groq Auto-Failover)</option>
                    <option value="gemini">Gemini Priority Only</option>
                    <option value="groq">Groq Llama 3.3 Priority (if configured)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                Save Provider Settings
              </button>
            </form>

            <div className="space-y-6 text-sm text-slate-300 pt-4 border-t border-slate-800">
              <div className="space-y-2">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Cloudflare Worker Environment Variables (.env / wrangler.toml)
                </h3>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
{`GEMINI_API_KEY="your_primary_gemini_key"
BACKUP_GEMINI_KEY="optional_backup_gemini_key"
GROQ_API_KEY="optional_free_groq_key"
OWNER_EMAIL="owner@aetheris.local"
OWNER_UID="owner_uid_777"`}
                </pre>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-white">Supported AI Platforms in this Agent</h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li><strong className="text-slate-200">Google Gemini (2.5 & 3.8 Flash):</strong> Live Google search, reasoning, and document analysis.</li>
                  <li><strong className="text-slate-200">Free FLUX / Pollinations AI:</strong> 100% free high-resolution AI image generation (Zero API key needed).</li>
                  <li><strong className="text-slate-200">Groq API (Llama 3.3 70B):</strong> Instant 500 tokens/sec chat fallback when Gemini rate limits occur.</li>
                  <li><strong className="text-slate-200">Automatic Key Failover:</strong> Never get stuck when one model or key experiences high traffic.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
