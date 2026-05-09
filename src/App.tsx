/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Trophy, 
  Play, 
  RotateCcw, 
  Send, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type GameState = 'idle' | 'loading' | 'playing' | 'result';

interface DrawingData {
  word: string;
  paths: string[];
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentRound, setCurrentRound] = useState<DrawingData | null>(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [timer, setTimer] = useState(30);
  const [visibleStrokes, setVisibleStrokes] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('sketchGuessHighScore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0 && gameState === 'playing') {
      endRound(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timer]);

  // Stroke incremental reveal logic
  useEffect(() => {
    if (gameState === 'playing' && currentRound) {
      const totalStrokes = currentRound.paths.length;
      const interval = 25000 / totalStrokes; // Reveal all strokes over ~25 seconds
      
      const strokeInterval = setInterval(() => {
        setVisibleStrokes(prev => {
          if (prev < totalStrokes) return prev + 1;
          return prev;
        });
      }, interval);

      return () => clearInterval(strokeInterval);
    }
  }, [gameState, currentRound]);

  const startGame = async () => {
    setScore(0);
    await startNewRound();
  };

  const startNewRound = async () => {
    setGameState('loading');
    setGuess('');
    setFeedback(null);
    setTimer(30);
    setVisibleStrokes(0);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Pick a common, simple-to-draw object (like 'cat', 'tree', 'sun', 'house', 'car', 'flower', 'apple'). Generate a simple sketch of it using 6-12 SVG path 'd' attributes. The sketch must be recognizable but minimal. Use a 0-100 coordinate system. Return ONLY a JSON object: { \"word\": \"string\", \"paths\": [\"string\"] }.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              paths: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["word", "paths"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}') as DrawingData;
      // Sanitize word (sometimes it returns lowercase/extra spaces)
      data.word = data.word.toLowerCase().trim();
      
      setCurrentRound(data);
      setGameState('playing');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      console.error("Error fetching drawing:", error);
      setFeedback({ type: 'error', message: "Ops! Gagal memuat AI Drawing. Coba lagi." });
      setGameState('idle');
    }
  };

  const handleGuess = (e?: FormEvent) => {
    e?.preventDefault();
    if (!currentRound || !guess.trim()) return;

    if (guess.toLowerCase().trim() === currentRound.word) {
      endRound(true);
    } else {
      setFeedback({ type: 'error', message: "Bukan itu! Terus menebak!" });
      setGuess('');
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const endRound = (success: boolean) => {
    setGameState('result');
    if (timerRef.current) clearInterval(timerRef.current);

    if (success) {
      const roundScore = Math.max(10, timer * 5);
      const newTotal = score + roundScore;
      setScore(newTotal);
      if (newTotal > highScore) {
        setHighScore(newTotal);
        localStorage.setItem('sketchGuessHighScore', newTotal.toString());
      }
      setFeedback({ type: 'success', message: `Hebat! Itu adalah ${currentRound?.word.toUpperCase()}!` });
    } else {
      setFeedback({ type: 'error', message: `Waktu habis! Itu sebenarnya adalah ${currentRound?.word.toUpperCase()}.` });
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-dim font-sans selection:bg-brand selection:text-black relative overflow-hidden">
      {/* Immersive Background Elements */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,#0a3d2e_0%,transparent_60%)] opacity-40 pointer-events-none"></div>
      
      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto px-10 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            <BrainCircuit size={28} className="text-bg-dark" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase">A.I. Sketch Detective</h1>
            <div className="flex items-center gap-2 text-[10px] text-brand font-bold tracking-widest uppercase opacity-70">
              <span className={`w-2 h-2 rounded-full bg-brand ${gameState === 'playing' ? 'animate-pulse' : ''}`}></span> 
              System: {gameState === 'loading' ? 'Processing' : 'Active'}
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-brand/50 font-bold mb-1">Current Score</p>
            <p className="text-3xl font-mono font-bold leading-none">{score.toLocaleString('en-US', { minimumIntegerDigits: 5 })}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-brand/50 font-bold mb-1">High Score</p>
            <div className="flex items-center justify-center gap-2">
              <Trophy size={14} className="text-amber-400" />
              <p className="text-3xl font-mono font-bold leading-none text-brand">{highScore.toLocaleString('en-US')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-8 pt-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-3 space-y-6">
          <div className="bg-bg-panel rounded-[32px] border border-brand/20 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none grid-pattern"></div>
            
            <AnimatePresence mode="wait">
              {/* Idle State */}
              {gameState === 'idle' && (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex-grow flex flex-col items-center justify-center p-12 text-center z-10"
                >
                  <div className="w-24 h-24 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <Play size={40} className="text-brand ml-1 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Ready to Detect?</h2>
                  <p className="text-text-dim/70 max-w-md mx-auto mb-10 leading-relaxed font-medium">
                    Our neural system will generate a sketch. Identify the target before the sequence completes or time expires.
                  </p>
                  <button 
                    onClick={startGame}
                    className="group relative inline-flex items-center gap-4 bg-brand text-bg-dark px-12 py-5 rounded-2xl font-black text-xl uppercase tracking-tight transition-all hover:brightness-110 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(0,255,136,0.2)]"
                  >
                    Initialize System
                    <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* Loading State */}
              {gameState === 'loading' && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-grow flex flex-col items-center justify-center p-12 z-10"
                >
                  <div className="relative w-24 h-24">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="absolute inset-0 border-4 border-brand/10 border-t-brand rounded-full shadow-[0_0_15px_rgba(0,255,136,0.2)]"
                    />
                    <BrainCircuit className="absolute inset-0 m-auto text-brand opacity-80" size={40} />
                  </div>
                  <p className="mt-10 text-brand font-mono font-bold tracking-[0.3em] uppercase text-sm animate-pulse">Synchronizing Neural Net...</p>
                </motion.div>
              )}

              {/* Playing State */}
              {(gameState === 'playing' || gameState === 'result') && currentRound && (
                <motion.div 
                  key="playing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-grow flex flex-col z-10"
                >
                  {/* Status Bar */}
                  <div className="p-6 flex items-center justify-between border-b border-brand/10 bg-black/20">
                    <div className="flex gap-4">
                      <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${gameState === 'playing' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-white/80 uppercase">
                          {gameState === 'playing' ? 'A.I. IS DRAWING...' : 'SEQUENCE COMPLETE'}
                        </span>
                      </div>
                      <div className="px-4 py-2 bg-brand/10 backdrop-blur-md rounded-full border border-brand/20">
                        <span className="text-[10px] font-mono font-bold tracking-widest text-brand uppercase">
                          Complexity: {currentRound.paths.length} Strokes
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {currentRound.paths.map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-1 w-3 rounded-full transition-all duration-500 ${i < visibleStrokes ? 'bg-brand shadow-[0_0_8px_rgba(0,255,136,0.6)]' : 'bg-white/10'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Main Interaction Area */}
                  <div className="flex-grow flex flex-col md:flex-row p-8 gap-8 items-center">
                    {/* SVG Container */}
                    <div className="w-full md:w-3/5 aspect-square relative bg-black/30 rounded-[2.5rem] border border-white/5 flex items-center justify-center p-12 transition-transform">
                      <svg 
                        viewBox="0 0 100 100" 
                        className="w-full h-full drop-shadow-[0_0_15px_rgba(0,255,136,0.5)]"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      >
                        {currentRound.paths.slice(0, visibleStrokes).map((path, index) => (
                          <motion.path
                            key={index}
                            d={path}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            stroke="currentColor"
                            strokeWidth="3.5"
                            className="text-brand"
                          />
                        ))}
                      </svg>

                      {/* Result Overlay */}
                      {gameState === 'result' && (
                        <motion.div 
                          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                          className="absolute inset-0 bg-bg-dark/60 flex flex-col items-center justify-center p-6 text-center z-20 rounded-[2.5rem]"
                        >
                          <motion.div
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                          >
                            {feedback?.type === 'success' ? (
                              <CheckCircle2 size={100} className="text-brand mx-auto drop-shadow-[0_0_20px_rgba(0,255,136,0.6)]" />
                            ) : (
                              <XCircle size={100} className="text-red-500 mx-auto drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
                            )}
                          </motion.div>
                          
                          <h3 className="mt-6 text-4xl font-black text-white italic tracking-tighter uppercase">
                            {feedback?.type === 'success' ? 'Confirmed' : 'System Failure'}
                          </h3>
                          <p className="mt-2 text-brand font-mono font-bold tracking-widest text-lg">
                            TARGET: {currentRound.word.toUpperCase()}
                          </p>
                          
                          <button 
                            onClick={startNewRound}
                            className="mt-10 flex items-center gap-3 bg-brand text-bg-dark px-10 py-4 rounded-xl font-black uppercase tracking-tight hover:brightness-110 transition-all shadow-xl shadow-brand/20"
                          >
                            Next Round <RotateCcw size={20} />
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Stats & Controls */}
                    <div className="w-full md:w-2/5 flex flex-col h-full justify-between gap-8">
                      <div className="bg-black/20 p-8 rounded-3xl border border-white/5 space-y-4">
                        <div className="text-right">
                          <p className="text-8xl font-black italic tracking-tighter text-brand drop-shadow-[0_0_15px_rgba(0,255,136,0.3)] leading-none">
                            {timer.toString().padStart(2, '0')}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 mt-2">Seconds Remaining</p>
                        </div>
                      </div>

                      <div className="flex-grow flex flex-col justify-center">
                        <AnimatePresence>
                          {feedback && gameState === 'playing' && (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className={`p-6 rounded-2xl border font-bold uppercase tracking-tighter text-center italic text-xl ${feedback.type === 'success' ? 'bg-brand/10 border-brand/30 text-brand' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
                            >
                              {feedback.message}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Area */}
          {gameState === 'playing' && (
            <form onSubmit={handleGuess} className="h-24 bg-bg-panel rounded-3xl border border-white/5 p-4 flex gap-4 shadow-2xl relative z-10">
              <input
                ref={inputRef}
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="TYPE YOUR DETECTION HERE..."
                className="flex-grow bg-black/40 rounded-2xl border border-white/10 px-8 text-xl font-bold tracking-tight text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-all uppercase"
              />
              <button 
                type="submit"
                disabled={!guess.trim()}
                className="px-12 bg-brand text-bg-dark rounded-2xl font-black text-xl uppercase tracking-tight hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(0,255,136,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </form>
          )}
        </div>

        {/* Sidebar Info */}
        <aside className="space-y-6">
          <div className="bg-bg-panel rounded-[32px] border border-white/5 p-8 flex flex-col h-full min-h-[400px]">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand/60 mb-8 flex items-center gap-2">
                <Sparkles size={14} /> Mission Intel
             </h3>
             
             <div className="space-y-6 flex-grow">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-2">Round Probability</p>
                   <p className="text-sm font-bold text-white/80 leading-snug tracking-tight">AI precision is varying. Detection window is limited to 30 seconds.</p>
                </div>
                
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-2">Bonus Multiplier</p>
                   <p className="text-sm font-bold text-white/80 leading-snug tracking-tight">Early detection provides up to 5x reward points.</p>
                </div>
             </div>

             <div className="mt-8">
                <div className="p-6 bg-gradient-to-br from-brand/10 to-transparent rounded-2xl border border-brand/20">
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-3">Intelligence Level</p>
                   <p className="text-2xl font-black italic tracking-tighter text-white uppercase mb-4">
                      {score > 500 ? 'Expert Detective' : score > 200 ? 'Senior Agent' : 'Field Operative'}
                   </p>
                   <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (score / 1000) * 100)}%` }}
                        className="h-full bg-brand"
                      ></motion.div>
                   </div>
                </div>
             </div>
          </div>
        </aside>
      </main>

      <footer className="max-w-6xl mx-auto px-10 pb-8 flex justify-between items-center opacity-30 text-[10px] font-bold tracking-[0.3em] uppercase relative z-10">
        <span>Region: ID-VIRTUAL-NODE</span>
        <span>Neural Engine v4.2.0-stable</span>
        <span>© 2026 AI Sketch Systems</span>
      </footer>
    </div>
  );
}
