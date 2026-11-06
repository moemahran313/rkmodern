import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, RotateCcw, HelpCircle, Award } from 'lucide-react';
import { QUIZ_QUESTIONS_DATA, QuizQuestionItem } from '../data/quizAndSheetsData';

export const PracticeQuizView: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | QuizQuestionItem['type']>('all');
  const [selectedLecture, setSelectedLecture] = useState<number | 'all'>('all');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [onlyWrong, setOnlyWrong] = useState(false);

  const filteredQuiz = useMemo(() => {
    return QUIZ_QUESTIONS_DATA.filter((q) => {
      if (filterType !== 'all' && q.type !== filterType) return false;
      if (selectedLecture !== 'all' && q.lectureId !== selectedLecture) return false;
      if (onlyWrong) {
        const chosen = selectedAnswers[q.id];
        return chosen !== undefined && chosen !== q.correctIndex;
      }
      return true;
    });
  }, [filterType, selectedLecture, onlyWrong, selectedAnswers]);

  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    let wrong = 0;
    QUIZ_QUESTIONS_DATA.forEach((q) => {
      const ans = selectedAnswers[q.id];
      if (ans !== undefined) {
        answered++;
        if (ans === q.correctIndex) correct++;
        else wrong++;
      }
    });
    return { answered, correct, wrong, total: QUIZ_QUESTIONS_DATA.length };
  }, [selectedAnswers]);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setOnlyWrong(false);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Quiz Control & Score Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              اختبار الميدتيرم التجريبي التفاعلي ({QUIZ_QUESTIONS_DATA.length} سؤالاً شاملاً)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              يغطي الأسئلة النظرية ومسائل الموثوقية ومصفوفة المخاطر وشجرة القرارات مع التفسير الفوري
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400">النتيجة: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {stats.correct} صح
              </span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {stats.wrong} خطأ
              </span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {stats.answered}/{stats.total}
              </span>
            </div>

            {stats.answered > 0 && (
              <button
                type="button"
                onClick={handleResetQuiz}
                className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة الاختبار</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              الكل ({QUIZ_QUESTIONS_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('نظري')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                filterType === 'نظري'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              أسئلة نظرية
            </button>
            <button
              type="button"
              onClick={() => setFilterType('مسألة حسابية')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                filterType === 'مسألة حسابية'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              مسائل حسابية
            </button>
            <button
              type="button"
              onClick={() => setFilterType('مصفوفة وقرارات')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                filterType === 'مصفوفة وقرارات'
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              مصفوفة وقرارات
            </button>
            {stats.wrong > 0 && (
              <button
                type="button"
                onClick={() => setOnlyWrong((prev) => !prev)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  onlyWrong
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                }`}
              >
                مراجعة أخطائي فقط ({stats.wrong})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['all', 1, 2, 3, 4, 5, 6] as const).map((lec) => (
              <button
                key={lec}
                type="button"
                onClick={() => setSelectedLecture(lec)}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  selectedLecture === lec
                    ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-950'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {lec === 'all' ? 'كل المحاضرات' : `م ${lec}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuiz.map((q, index) => {
          const userChoice = selectedAnswers[q.id];
          const isAnswered = userChoice !== undefined;
          const isCorrect = userChoice === q.correctIndex;

          return (
            <article
              key={q.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  سؤال {index + 1} · المحاضرة {q.lectureId} · {q.type}
                </span>
                {isAnswered && (
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isCorrect
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>إجابة صحيحة</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>إجابة غير صحيحة</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                {q.question}
              </h3>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = userChoice === optIdx;
                  const isThisCorrect = q.correctIndex === optIdx;

                  let btnStyle =
                    'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800';
                  if (isAnswered) {
                    if (isThisCorrect) {
                      btnStyle =
                        'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50 text-emerald-950 dark:text-emerald-200 font-bold';
                    } else if (isThisSelected && !isThisCorrect) {
                      btnStyle =
                        'bg-rose-50 dark:bg-rose-500/15 border-rose-400 dark:border-rose-500/50 text-rose-950 dark:text-rose-200';
                    } else {
                      btnStyle =
                        'bg-slate-50/40 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`w-full text-right p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                    >
                      <span className="leading-relaxed">{opt}</span>
                      {isAnswered && isThisCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && isThisSelected && !isThisCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Explanation */}
              {isAnswered && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-amber-400">
                    <HelpCircle className="w-4 h-4" />
                    <span>التفسير وخطوات الحل:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {q.explanation}
                  </p>
                  {q.mnemonicTip && (
                    <div className="pt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      شفرة التذكر: {q.mnemonicTip}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Completion Card */}
      {stats.answered === stats.total && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-500/40 dark:border-amber-500/40 rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <Award className="w-10 h-10 text-emerald-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            أنهيت الاختبار بالكامل! نتيجتك: {stats.correct} من {stats.total} (
            {Math.round((stats.correct / stats.total) * 100)}%)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {stats.wrong > 0
              ? `لديك ${stats.wrong} أسئلة تحتاج لمراجعة سريعة. اضغط على زر "مراجعة أخطائي فقط" بالأعلى لتثبيتها قبل الامتحان.`
              : 'أداء ممتاز! أنت جاهز تماماً لامتحان الميدتيرم غداً.'}
          </p>
        </div>
      )}
    </div>
  );
};
