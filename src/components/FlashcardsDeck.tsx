import React, { useState, useRef } from 'react';
import { FLASHCARDS_DATA, FlashcardItem } from '../data/courseData';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  Clock,
  ChevronRight,
  ChevronLeft,
  Eye,
  Bell,
  Sparkles,
  Brain,
} from 'lucide-react';
import { ArabicVoiceButton, VoiceSpeedSelector, speechManager } from '../utils/arabicSpeech';
import { VisualRiskMatrix, RISK_MATRIX_PRESETS } from './VisualRiskMatrix';

export interface CardScheduleState {
  dueAt: number | null; // timestamp in ms, null if new
  status: 'new' | 'learning' | 'mastered';
  intervalLabel?: string;
}

interface FlashcardsDeckProps {
  scheduleMap: Record<string, CardScheduleState>;
  onRateCard: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  onResetSession: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  dueCardsCount: number;
  nextDueSeconds: number | null;
  onTriggerTestAlert: () => void;
}

export const FlashcardsDeck: React.FC<FlashcardsDeckProps> = ({
  scheduleMap,
  onRateCard,
  onResetSession,
  soundEnabled,
  onToggleSound,
  dueCardsCount,
  nextDueSeconds,
  onTriggerTestAlert,
}) => {
  const [selectedLecture, setSelectedLecture] = useState<number | 'all' | 'due'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMnemonicFirst, setShowMnemonicFirst] = useState(true);
  const [quickRecallNote, setQuickRecallNote] = useState('');
  const [showQuickScratchpad, setShowQuickScratchpad] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const now = Date.now();

  const filteredCards: FlashcardItem[] = FLASHCARDS_DATA.filter((card) => {
    const st = scheduleMap[card.id];
    if (selectedLecture === 'due') {
      return st?.status === 'learning' && st.dueAt !== null && st.dueAt <= now;
    }
    if (selectedLecture === 'all') {
      return st?.status !== 'mastered';
    }
    return card.lectureId === selectedLecture;
  });

  // Fallback if all cards in current filter are mastered
  const activeCards =
    filteredCards.length > 0
      ? filteredCards
      : selectedLecture === 'due'
      ? []
      : FLASHCARDS_DATA.filter((c) =>
          selectedLecture === 'all' ? true : c.lectureId === selectedLecture
        );

  const safeIndex = activeCards.length > 0 ? currentIndex % activeCards.length : 0;
  const currentCard = activeCards[safeIndex];

  const handleSelectFilter = (val: number | 'all' | 'due') => {
    speechManager.stop();
    setSelectedLecture(val);
    setCurrentIndex(0);
    setIsFlipped(false);
    setQuickRecallNote('');
  };

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;
    speechManager.stop();
    onRateCard(currentCard.id, rating);
    setIsFlipped(false);
    setQuickRecallNote('');
    if (safeIndex >= activeCards.length - 1) {
      setCurrentIndex(0);
    }
  };

  const goNext = () => {
    if (activeCards.length === 0) return;
    speechManager.stop();
    setIsFlipped(false);
    setQuickRecallNote('');
    setCurrentIndex((prev) => (prev + 1) % activeCards.length);
  };

  const goPrev = () => {
    if (activeCards.length === 0) return;
    speechManager.stop();
    setIsFlipped(false);
    setQuickRecallNote('');
    setCurrentIndex((prev) => (prev - 1 + activeCards.length) % activeCards.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 65) {
      if (deltaX > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    touchStartX.current = null;
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Spaced Repetition Live Alert Control Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400 shrink-0" />
            <span>خوارزمية التكرار المتباعد المكثف لليلة الامتحان (1 د · 5 د · 15 د)</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {dueCardsCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                حان الآن موعد تسميع {dueCardsCount} بطاقة مستحقة لتثبيتها في الذاكرة طويلة المدى!
              </span>
            ) : nextDueSeconds !== null ? (
              <span>
                التنبيه القادم للبطاقة المجدولة بعد{' '}
                <span className="font-mono text-emerald-700 dark:text-amber-400">
                  {formatCountdown(nextDueSeconds)}
                </span>
              </span>
            ) : (
              <span>
                قيّم أي بطاقة بـ (1 د / 5 د / 15 د) ليعمل منبه التكرار الذكي تلقائياً أثناء مذاكرتك
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <VoiceSpeedSelector />

          {dueCardsCount > 0 && (
            <button
              type="button"
              onClick={() => handleSelectFilter('due')}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              راجع المستحق الآن ({dueCardsCount})
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSound}
            className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                <span>المنبه: مفعّل</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>المنبه: صامت</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onTriggerTestAlert}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            تجربة الجرس
          </button>
        </div>
      </div>

      {/* Interactive Filter Tabs by Lecture */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleSelectFilter('all')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedLecture === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            كل البطاقات ({FLASHCARDS_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => handleSelectFilter('due')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedLecture === 'due'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            المستحقة ({dueCardsCount})
          </button>
          {[1, 2, 3, 4, 5, 6].map((lec) => (
            <button
              key={lec}
              type="button"
              onClick={() => handleSelectFilter(lec)}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedLecture === lec
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              محاضرة {lec}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetSession}
          className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة الجولة</span>
        </button>
      </div>

      {/* Main Flashcard Stage */}
      {!currentCard ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4 shadow-xs">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            لا توجد بطاقات مستحقة في هذه اللحظة!
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {nextDueSeconds !== null
              ? `ستظهر البطاقة التالية تلقائياً بعد ${formatCountdown(nextDueSeconds)}، أو يمكنك عرض جميع البطاقات الآن.`
              : 'اختر «كل البطاقات» أو إحدى المحاضرات للبدء في الحفظ الفوري.'}
          </p>
          <button
            type="button"
            onClick={() => handleSelectFilter('all')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            عرض جميع البطاقات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Interactive Card Column (8 cols on desktop, full width on mobile) */}
          <div className="lg:col-span-8 space-y-3.5">
            {/* Voice Action Bar directly above Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-emerald-700 dark:text-amber-400">
                  القارئ الصوتي العربي:
                </span>
                <span className="hidden sm:inline">استمع للبطاقة بصوت واضح لتثبيت الحفظ السمعي</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ArabicVoiceButton
                  id={`fc-q-${currentCard.id}`}
                  segments={[
                    `السؤال: ${currentCard.question}`,
                    `شفرة الحفظ السريع: ${currentCard.mnemonic}`,
                  ]}
                  label="استمع للسؤال والشفرة"
                  activeLabel="إيقاف الصوت"
                />
                <ArabicVoiceButton
                  id={`fc-full-${currentCard.id}`}
                  variant="primary"
                  segments={[
                    `السؤال: ${currentCard.question}`,
                    `الخلاصة الفورية: ${currentCard.shortAnswer}`,
                    ...currentCard.bulletPoints,
                    `شفرة الحفظ: ${currentCard.mnemonic}`,
                  ]}
                  label="استمع للسؤال والإجابة كاملة"
                  activeLabel="إيقاف القراءة"
                />
              </div>
            </div>

            {/* Tactile Mobile Card with Swipe & Flip */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsFlipped(!isFlipped);
                }
              }}
              className="w-full min-h-[300px] sm:min-h-[340px] rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-sm hover:border-emerald-500/50 dark:hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between select-none"
            >
              {/* Card Top Metadata (Zero-Pill Unboxed Text Discipline) */}
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-700 dark:text-amber-400">
                    محاضرة {currentCard.lectureId}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentCard.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-bold">
                    {safeIndex + 1} / {activeCards.length}
                  </span>
                </div>
                <span className="text-emerald-700 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isFlipped ? 'الإجابة (اضغط للسؤال)' : 'اضغط لقلب البطاقة'}</span>
                </span>
              </div>

              {/* Card Body */}
              {!isFlipped ? (
                <div className="my-auto py-5 space-y-4">
                  <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentCard.question}
                  </h2>

                  {showMnemonicFirst && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/25">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                        🔑 شفرة الاسترجاع النشط (تذكر منها النقاط قبل قلب البطاقة):
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-amber-100 leading-relaxed">
                        {currentCard.mnemonic}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="my-auto py-3 space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      الخلاصة الفورية (مفتاح الدرجة الكاملة):
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                      {currentCard.shortAnswer}
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {currentCard.bulletPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-amber-400 mt-0.5 shrink-0">
                          {idx + 1}.
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-emerald-700 dark:text-amber-400">
                      شفرة الحفظ:{' '}
                    </span>
                    <span className="font-semibold">{currentCard.mnemonic}</span>
                  </div>
                </div>
              )}

              {/* Card Bottom Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                <span>
                  {scheduleMap[currentCard.id]?.status === 'learning'
                    ? `قيد التكرار (${scheduleMap[currentCard.id]?.intervalLabel || ''})`
                    : scheduleMap[currentCard.id]?.status === 'mastered'
                    ? 'تم حفظها في هذه الجلسة ✓'
                    : 'بطاقة جديدة'}
                </span>
                <span>اسحب يميناً أو يساراً للتنقل · اضغط للقلب</span>
              </div>
            </div>

            {/* Optional Quick Active-Recall Blurt Box on Card */}
            {showQuickScratchpad && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                    <span>مسودة التسميع السريع (اكتب رؤوس الأقلام قبل قلب البطاقة):</span>
                  </span>
                  {quickRecallNote && (
                    <button
                      type="button"
                      onClick={() => setQuickRecallNote('')}
                      className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={quickRecallNote}
                  onChange={(e) => setQuickRecallNote(e.target.value)}
                  placeholder="اكتب الكلمات المفتاحية التي تتذكرها هنا ثم اقلب البطاقة..."
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            )}

            {/* Spaced Repetition Thumb-Zone Action Buttons (48px+ hitboxes for mobile thumbs) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleRate('again')}
                className="min-h-[50px] px-3 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-200 transition-all flex flex-col items-center justify-center cursor-pointer active:scale-[0.98]"
              >
                <span className="text-xs font-bold whitespace-nowrap">نسيتها · أعِدها</span>
                <span className="text-[11px] font-mono text-rose-700 dark:text-rose-300">
                  تنبيه بعد 1 د
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate('hard')}
                className="min-h-[50px] px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 transition-all flex flex-col items-center justify-center cursor-pointer active:scale-[0.98]"
              >
                <span className="text-xs font-bold whitespace-nowrap">صعبة · تثبيت</span>
                <span className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
                  تنبيه بعد 5 د
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate('good')}
                className="min-h-[50px] px-3 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/70 text-sky-900 dark:text-sky-200 transition-all flex flex-col items-center justify-center cursor-pointer active:scale-[0.98]"
              >
                <span className="text-xs font-bold whitespace-nowrap">جيدة · مراجعة</span>
                <span className="text-[11px] font-mono text-sky-700 dark:text-sky-300">
                  تنبيه بعد 15 د
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate('easy')}
                className="min-h-[50px] px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] shadow-xs"
              >
                <span className="text-xs font-bold whitespace-nowrap">حفظتها تماماً ✓</span>
                <span className="text-[11px] text-emerald-100">إخفاء من الجولة</span>
              </button>
            </div>

            {/* Prev / Next & Hint Toggle Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={goPrev}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابقة</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMnemonicFirst(!showMnemonicFirst)}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showMnemonicFirst ? 'إخفاء الشفرة قبل القلب' : 'إظهار الشفرة قبل القلب'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickScratchpad((prev) => !prev)}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showQuickScratchpad ? 'إخفاء مسودة التسميع' : 'مسودة تسميع كتابي'}
                </button>
              </div>

              <button
                type="button"
                onClick={goNext}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>التالية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Side Column: All-in-One Mnemonics Cheat Sheet for Instant Cramming */}
          <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
                <span>فهرس جميع شفرات الحفظ (20 شفرة)</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {FLASHCARDS_DATA.map((item, idx) => {
                const isCurrent = item.id === currentCard?.id;
                const st = scheduleMap[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      speechManager.stop();
                      setSelectedLecture(item.lectureId);
                      const idxInLec = FLASHCARDS_DATA.filter(
                        (c) => c.lectureId === item.lectureId
                      ).findIndex((c) => c.id === item.id);
                      setCurrentIndex(idxInLec >= 0 ? idxInLec : 0);
                      setIsFlipped(false);
                    }}
                    className={`w-full text-right p-3 rounded-2xl border transition-colors cursor-pointer block ${
                      isCurrent
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-amber-500/60'
                        : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>
                        <span className="font-mono font-bold">{idx + 1}.</span> محاضرة{' '}
                        {item.lectureId} · {item.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {st?.status === 'mastered' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-bold">
                            <Check className="w-3 h-3" /> تم الحفظ
                          </span>
                        ) : st?.status === 'learning' ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-mono font-semibold">
                            <Clock className="w-3 h-3" /> {st.intervalLabel}
                          </span>
                        ) : null}
                        <ArabicVoiceButton
                          id={`fc-side-${item.id}`}
                          segments={[item.question, item.mnemonic, item.shortAnswer]}
                          label="نطق"
                          activeLabel="إيقاف"
                        />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {item.mnemonic}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
