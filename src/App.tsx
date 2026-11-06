/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Brain,
  FileCheck2,
  BookOpen,
  HelpCircle,
  BellRing,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { FLASHCARDS_DATA } from './data/courseData';
import { SHEET_QUESTIONS_DATA } from './data/quizAndSheetsData';
import { FlashcardsDeck, CardScheduleState } from './components/FlashcardsDeck';
import { ScientificMemoryLabView } from './components/ScientificMemoryLabView';
import { SheetsMemorizerView } from './components/SheetsMemorizerView';
import { LectureSummariesView } from './components/LectureSummariesView';
import { PracticeQuizView } from './components/PracticeQuizView';
import { PWAHeaderAction, OfflineToast, usePWAAndOffline } from './components/PWAInstallModal';
import { speechManager } from './utils/arabicSpeech';

type ActiveTab = 'flashcards' | 'memorylab' | 'sheets' | 'lectures' | 'quiz';

const STORAGE_KEY_SR = 'risk_cram_sr_v1';
const STORAGE_KEY_SHEETS = 'risk_cram_sheets_v1';
const STORAGE_KEY_THEME = 'risk_cram_theme_v1';

// Subtle Web Audio API chime for Spaced Repetition due alerts (works 100% offline)
function playAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context restriction if user hasn't interacted yet
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('flashcards');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());
  const { isOnline } = usePWAAndOffline();

  // Light Mode by default (Warm Daylight Paper), with instant Dark Mode toggle
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDarkMode]);

  useEffect(() => {
    speechManager.stop();
  }, [activeTab]);

  // Spaced Repetition state per flashcard
  const [scheduleMap, setScheduleMap] = useState<Record<string, CardScheduleState>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SR);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Memorized Sheet Questions IDs
  const [memorizedSheetIds, setMemorizedSheetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHEETS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const prevDueCountRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SR, JSON.stringify(scheduleMap));
    } catch {
      // Ignore storage quota errors
    }
  }, [scheduleMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHEETS, JSON.stringify(memorizedSheetIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [memorizedSheetIds]);

  // Tick every second to check Spaced Repetition due timers
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Calculate currently due cards (scheduled in the past & in 'learning' status)
  const dueScheduledCount = useMemo(() => {
    return FLASHCARDS_DATA.filter((c) => {
      const st = scheduleMap[c.id];
      return st && st.status === 'learning' && st.dueAt !== null && st.dueAt <= nowTimestamp;
    }).length;
  }, [scheduleMap, nowTimestamp]);

  // Next upcoming card countdown in seconds
  const nextUpcomingSeconds = useMemo(() => {
    let earliest = Infinity;
    FLASHCARDS_DATA.forEach((c) => {
      const st = scheduleMap[c.id];
      if (st && st.status === 'learning' && st.dueAt !== null && st.dueAt > nowTimestamp) {
        if (st.dueAt < earliest) earliest = st.dueAt;
      }
    });
    if (earliest === Infinity) return null;
    return Math.max(1, Math.ceil((earliest - nowTimestamp) / 1000));
  }, [scheduleMap, nowTimestamp]);

  // Trigger audio chime when dueScheduledCount increases
  useEffect(() => {
    if (dueScheduledCount > prevDueCountRef.current && soundEnabled) {
      playAlertChime();
    }
    prevDueCountRef.current = dueScheduledCount;
  }, [dueScheduledCount, soundEnabled]);

  const handleRateCard = (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    setScheduleMap((prev) => {
      if (rating === 'easy') {
        return {
          ...prev,
          [cardId]: {
            dueAt: null,
            status: 'mastered',
            intervalLabel: 'تم الإتقان',
          },
        };
      }

      const minutesMap: Record<'again' | 'hard' | 'good', { mins: number; label: string }> = {
        again: { mins: 1, label: 'بعد دقيقة' },
        hard: { mins: 5, label: 'بعد 5 دقائق' },
        good: { mins: 15, label: 'بعد 15 دقيقة' },
      };

      const { mins, label } = minutesMap[rating];
      return {
        ...prev,
        [cardId]: {
          dueAt: Date.now() + mins * 60 * 1000,
          status: 'learning',
          intervalLabel: label,
        },
      };
    });
  };

  const handleResetSession = () => {
    setScheduleMap({});
    setMemorizedSheetIds([]);
  };

  const handleToggleSheetMemorized = (id: string) => {
    setMemorizedSheetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const masteredCardsCount = useMemo(
    () => FLASHCARDS_DATA.filter((c) => scheduleMap[c.id]?.status === 'mastered').length,
    [scheduleMap]
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors"
    >
      {/* Top Bar Contract: Zone 1 (Brand), Zone 2 (Navigation), Zone 3 (Action + Theme) */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-4">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 whitespace-nowrap">
                ادارة المخاطر
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                محمد مهران - th-3
              </span>
            </div>
          </div>

          {/* Zone 2: Desktop Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('flashcards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'flashcards'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              البطاقات ({masteredCardsCount}/{FLASHCARDS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('memorylab')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'memorylab'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              معمل الحفظ العلمي (Blurting & قصص)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'sheets'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              الشيتات ({memorizedSheetIds.length}/{SHEET_QUESTIONS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lectures')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'lectures'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              الـ 6 محاضرات
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              الاختبار
            </button>
          </nav>

          {/* Zone 3: Theme Switcher + Offline App Install */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              aria-label="تبديل الوضع النهاري والليلي"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">نهاري</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span className="hidden sm:inline">ليلي</span>
                </>
              )}
            </button>

            <PWAHeaderAction />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 pt-4">
        {/* Global Spaced Repetition Due Alert Strip */}
        {(dueScheduledCount > 0 || nextUpcomingSeconds !== null) && (
          <div
            className={`mb-4 rounded-xl px-4 py-2.5 border flex flex-wrap items-center justify-between gap-2 transition-colors ${
              dueScheduledCount > 0
                ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/50 text-amber-950 dark:text-amber-200'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <BellRing
                className={`w-4 h-4 shrink-0 ${
                  dueScheduledCount > 0
                    ? 'text-amber-600 dark:text-amber-400 animate-bounce'
                    : 'text-slate-400'
                }`}
              />
              {dueScheduledCount > 0 ? (
                <span className="font-bold">
                  تنبيه التكرار المتباعد: حان الآن موعد تسميع {dueScheduledCount} بطاقة مجدولة
                  لتثبيتها في الذاكرة!
                </span>
              ) : (
                <span>
                  المؤقت الذكي يعمل في الخلفية · أقرب بطاقة للمراجعة بعد{' '}
                  <strong className="font-mono text-emerald-700 dark:text-amber-400">
                    {nextUpcomingSeconds} ثانية
                  </strong>
                </span>
              )}
            </div>

            {dueScheduledCount > 0 && activeTab !== 'flashcards' && (
              <button
                type="button"
                onClick={() => setActiveTab('flashcards')}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                راجعها الآن
              </button>
            )}
          </div>
        )}

        {/* Active View */}
        {activeTab === 'flashcards' && (
          <FlashcardsDeck
            scheduleMap={scheduleMap}
            onRateCard={handleRateCard}
            onResetSession={handleResetSession}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            dueCardsCount={dueScheduledCount}
            nextDueSeconds={nextUpcomingSeconds}
            onTriggerTestAlert={playAlertChime}
          />
        )}

        {activeTab === 'memorylab' && <ScientificMemoryLabView />}

        {activeTab === 'sheets' && (
          <SheetsMemorizerView
            memorizedIds={memorizedSheetIds}
            onToggleMemorized={handleToggleSheetMemorized}
          />
        )}

        {activeTab === 'lectures' && <LectureSummariesView />}

        {activeTab === 'quiz' && <PracticeQuizView />}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb-Optimized 5 Core Study Modes) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-colors relative cursor-pointer ${
            activeTab === 'flashcards'
              ? 'text-emerald-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>البطاقات</span>
          {dueScheduledCount > 0 && (
            <span className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {dueScheduledCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('memorylab')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'memorylab'
              ? 'text-emerald-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Brain className="w-5 h-5 mb-0.5" />
          <span>معمل الحفظ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheets')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'sheets'
              ? 'text-emerald-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileCheck2 className="w-5 h-5 mb-0.5" />
          <span>الشيتات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lectures')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'lectures'
              ? 'text-emerald-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>المحاضرات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'quiz'
              ? 'text-emerald-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <HelpCircle className="w-5 h-5 mb-0.5" />
          <span>الاختبار</span>
        </button>
      </nav>

      {/* Offline Toast */}
      <OfflineToast isOnline={isOnline} />
    </div>
  );
}
