import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, KeyRound, Search, CheckCircle2 } from 'lucide-react';
import { SHEET_QUESTIONS_DATA, SheetQuestionItem } from '../data/quizAndSheetsData';
import { ArabicVoiceButton, VoiceSpeedSelector } from '../utils/arabicSpeech';

interface SheetsMemorizerViewProps {
  memorizedIds: string[];
  onToggleMemorized: (id: string) => void;
}

export const SheetsMemorizerView: React.FC<SheetsMemorizerViewProps> = ({
  memorizedIds,
  onToggleMemorized,
}) => {
  const [selectedSheet, setSelectedSheet] = useState<'all' | SheetQuestionItem['sheetName']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selfTestMode, setSelfTestMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [onlyUnmemorized, setOnlyUnmemorized] = useState(false);

  const filteredQuestions = useMemo(() => {
    return SHEET_QUESTIONS_DATA.filter((q) => {
      if (selectedSheet !== 'all' && q.sheetName !== selectedSheet) return false;
      if (onlyUnmemorized && memorizedIds.includes(q.id)) return false;
      if (searchQuery.trim() !== '') {
        const term = searchQuery.trim().toLowerCase();
        return (
          q.questionText.toLowerCase().includes(term) ||
          q.goldenTrigger.toLowerCase().includes(term) ||
          q.mnemonic.toLowerCase().includes(term) ||
          q.answerBlocks.some(
            (blk) =>
              blk.title.toLowerCase().includes(term) ||
              blk.points.some((p) => p.toLowerCase().includes(term))
          )
        );
      }
      return true;
    });
  }, [selectedSheet, searchQuery, onlyUnmemorized, memorizedIds]);

  const toggleRevealCard = (id: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleSelfTest = () => {
    setSelfTestMode((prev) => {
      const next = !prev;
      if (next) {
        setRevealedIds({});
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Control Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              بنك أسئلة الشيتات الرسمية والامتحانات ({SHEET_QUESTIONS_DATA.length} سؤالاً كاملاً)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              إجابات نموذجية مركزة مع القارئ الصوتي بالعربية ومفتاح الـ 3 ثوانٍ وشفرة الحفظ لكل سؤال
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <VoiceSpeedSelector />

            <button
              type="button"
              onClick={handleToggleSelfTest}
              className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selfTestMode
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {selfTestMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{selfTestMode ? 'التسميع الذاتي: مفعّل' : 'تفعيل التسميع الذاتي'}</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyUnmemorized((prev) => !prev)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                onlyUnmemorized
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {onlyUnmemorized ? 'عرض الكل' : 'المتبقي للحفظ فقط'}
            </button>
          </div>
        </div>

        {/* Sheet Selector + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedSheet('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedSheet === 'all'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              كل الشيتات ({SHEET_QUESTIONS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSheet('الشيت الأول (محاضرة 1 و 2)')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedSheet === 'الشيت الأول (محاضرة 1 و 2)'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              شيت الفصل الأول (16 س)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSheet('الشيت الثاني (محاضرة 3 و 4 و 5)')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedSheet === 'الشيت الثاني (محاضرة 3 و 4 و 5)'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              شيت الفصل الثاني (14 س)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSheet('أسئلة المحاضرة السادسة')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedSheet === 'أسئلة المحاضرة السادسة'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              أسئلة المحاضرة 6 (4 س)
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بكلمة مفتاحية أو سؤال..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 dark:focus:border-amber-500 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Progress Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-400">
        <span>
          إجمالي المعروض: <strong>{filteredQuestions.length}</strong> سؤال · تم إتقان{' '}
          <strong className="text-emerald-700 dark:text-emerald-400">{memorizedIds.length}</strong>{' '}
          من {SHEET_QUESTIONS_DATA.length}
        </span>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => {
          const isMemorized = memorizedIds.includes(q.id);
          const isAnswerHidden = selfTestMode && !revealedIds[q.id];
          const totalBullets = q.answerBlocks.reduce((acc, blk) => acc + blk.points.length, 0);

          const speechSegments: string[] = [
            `السؤال رقم ${q.questionNumber}: ${q.questionText}`,
            `الخلاصة الذهبية: ${q.goldenTrigger}`,
            q.mnemonic ? `شفرة الحفظ: ${q.mnemonic}` : '',
            ...q.answerBlocks.flatMap((blk) => [blk.title, ...blk.points]),
          ];

          return (
            <article
              key={q.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-colors shadow-xs ${
                isMemorized
                  ? 'border-emerald-400 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-slate-900/70'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {q.sheetName} · السؤال رقم {q.questionNumber}
                  </p>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {q.questionText}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ArabicVoiceButton
                    id={`sheet-voice-${q.id}`}
                    segments={speechSegments}
                    label="استمع للسؤال والإجابة"
                    activeLabel="إيقاف القراءة"
                  />

                  <button
                    type="button"
                    onClick={() => onToggleMemorized(q.id)}
                    className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                      isMemorized
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isMemorized ? 'تم الحفظ ✓' : 'علّم كمحفوظ'}</span>
                  </button>
                </div>
              </div>

              {/* Golden 3-Second Trigger + Mnemonic */}
              <div className="bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-xl p-3.5 mb-4 space-y-1.5">
                <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-300 text-xs font-bold">
                  <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>الخلاصة الذهبية (مفتاح الـ 3 ثوانٍ): {q.goldenTrigger}</span>
                </div>
                {q.mnemonic && (
                  <p className="text-xs text-amber-800 dark:text-amber-200/90 font-semibold">
                    شفرة البصمجة السريعة: {q.mnemonic}
                  </p>
                )}
              </div>

              {/* Answer Body or Self-Test Blur */}
              {isAnswerHidden ? (
                <button
                  type="button"
                  onClick={() => toggleRevealCard(q.id)}
                  className="w-full py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-amber-500/50 text-center space-y-1 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-emerald-700 dark:text-amber-400">
                    سمّع الإجابة في ذهنك أولاً ثم اضغط هنا لكشف النقاط النموذجية
                  </p>
                  <p className="text-[11px] text-slate-500">
                    تتكون الإجابة من {q.answerBlocks.length} محاور ({totalBullets} نقاط تفصيلية)
                  </p>
                </button>
              ) : (
                <div className="space-y-3 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
                  {selfTestMode && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleRevealCard(q.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                      >
                        إخفاء الإجابة مرة أخرى
                      </button>
                    </div>
                  )}

                  {q.answerBlocks.map((block, bIdx) => (
                    <div key={bIdx} className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-amber-400">
                        {block.title}
                      </h4>
                      <ul className="space-y-2">
                        {block.points.map((pt, pIdx) => (
                          <li
                            key={pIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-slate-800 text-emerald-800 dark:text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {pIdx + 1}
                            </span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
