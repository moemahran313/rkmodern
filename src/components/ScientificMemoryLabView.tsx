import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  PenTool,
  BookOpenCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Timer,
  Lightbulb,
} from 'lucide-react';
import {
  STORY_CHAINS_DATA,
  BLURTING_PROMPTS_DATA,
  CLOZE_DRILLS_DATA,
  FEYNMAN_CARDS_DATA,
} from '../data/scientificMemoryData';
import { ArabicVoiceButton, VoiceSpeedSelector } from '../utils/arabicSpeech';

type LabSubMode = 'blurting' | 'stories' | 'cloze' | 'feynman';

export const ScientificMemoryLabView: React.FC = () => {
  const [subMode, setSubMode] = useState<LabSubMode>('blurting');

  // --- BLURTING STATE ---
  const [selectedBlurtId, setSelectedBlurtId] = useState<string>(BLURTING_PROMPTS_DATA[0].id);
  const [blurtText, setBlurtText] = useState<string>('');
  const [isBlurtChecked, setIsBlurtChecked] = useState<boolean>(false);
  const [showBlurtHint, setShowBlurtHint] = useState<boolean>(false);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(BLURTING_PROMPTS_DATA[0].recommendedSeconds);

  // --- STORY CHAINING STATE ---
  const [storyTestMode, setStoryTestMode] = useState<boolean>(false);
  const [revealedStorySteps, setRevealedStorySteps] = useState<Record<string, boolean>>({});

  // --- CLOZE STATE ---
  const [revealedClozeKeys, setRevealedClozeKeys] = useState<Record<string, boolean>>({});

  const activeBlurt = useMemo(
    () => BLURTING_PROMPTS_DATA.find((b) => b.id === selectedBlurtId) || BLURTING_PROMPTS_DATA[0],
    [selectedBlurtId]
  );

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          setIsBlurtChecked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const handleSelectBlurtTopic = (id: string) => {
    const found = BLURTING_PROMPTS_DATA.find((b) => b.id === id);
    setSelectedBlurtId(id);
    setBlurtText('');
    setIsBlurtChecked(false);
    setShowBlurtHint(false);
    setTimerRunning(false);
    setSecondsLeft(found ? found.recommendedSeconds : 60);
  };

  // Analyze user's blurted text against target keywords
  const blurtEvaluation = useMemo(() => {
    const normalizedInput = blurtText
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');

    const remembered: string[] = [];
    const missed: string[] = [];

    activeBlurt.targetKeywords.forEach((kw) => {
      const hit = kw.matchTerms.some((term) => {
        const normTerm = term
          .toLowerCase()
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي');
        return normalizedInput.includes(normTerm);
      });
      if (hit) {
        remembered.push(kw.label);
      } else {
        missed.push(kw.label);
      }
    });

    const total = activeBlurt.targetKeywords.length;
    const scorePercent = total > 0 ? Math.round((remembered.length / total) * 100) : 0;

    return { remembered, missed, total, scorePercent };
  }, [blurtText, activeBlurt]);

  const toggleStoryStep = (key: string) => {
    setRevealedStorySteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleClozeBlank = (key: string) => {
    setRevealedClozeKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllCloze = (reveal: boolean) => {
    if (!reveal) {
      setRevealedClozeKeys({});
      return;
    }
    const next: Record<string, boolean> = {};
    CLOZE_DRILLS_DATA.forEach((item) => {
      item.parts.forEach((pt, idx) => {
        if (pt.isBlank) {
          next[`${item.id}-${idx}`] = true;
        }
      });
    });
    setRevealedClozeKeys(next);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header & Scientific Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-600 dark:text-amber-400 shrink-0" />
              <span>معمل الحفظ العلمي السريع (لتثبيت المنهج في يوم واحد)</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              تقنيات مثبتة علمياً مع القراءة الصوتية بالعربية: التفريغ الذهني · الربط القصصي · الاسترجاع النشط · تبسيط فاينمان
            </p>
          </div>
          <VoiceSpeedSelector />
        </div>

        {/* 4 Scientific Technique Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSubMode('blurting')}
            className={`min-h-[46px] p-2.5 rounded-xl text-right transition-all cursor-pointer border flex flex-col justify-center ${
              subMode === 'blurting'
                ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 border-emerald-600 dark:border-amber-400 font-bold shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <PenTool className="w-3.5 h-3.5 shrink-0" />
              <span>1. التفريغ الذهني (Blurting)</span>
            </div>
            <div className="text-[11px] opacity-85 mt-0.5">اكتب من ذاكرتك واكشف النواقص</div>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('stories')}
            className={`min-h-[46px] p-2.5 rounded-xl text-right transition-all cursor-pointer border flex flex-col justify-center ${
              subMode === 'stories'
                ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 border-emerald-600 dark:border-amber-400 font-bold shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>2. الربط القصصي (Stories)</span>
            </div>
            <div className="text-[11px] opacity-85 mt-0.5">6 قصص لحفظ القوائم الطويلة</div>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('cloze')}
            className={`min-h-[46px] p-2.5 rounded-xl text-right transition-all cursor-pointer border flex flex-col justify-center ${
              subMode === 'cloze'
                ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 border-emerald-600 dark:border-amber-400 font-bold shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
              <span>3. إخفاء الكلمات (Cloze)</span>
            </div>
            <div className="text-[11px] opacity-85 mt-0.5">تسميع فوري للأرقام والتعريفات</div>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('feynman')}
            className={`min-h-[46px] p-2.5 rounded-xl text-right transition-all cursor-pointer border flex flex-col justify-center ${
              subMode === 'feynman'
                ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 border-emerald-600 dark:border-amber-400 font-bold shadow-xs'
                : 'bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
              <span>4. تبسيط فاينمان</span>
            </div>
            <div className="text-[11px] opacity-85 mt-0.5">افهم أعمق الأفخاخ في دقيقة</div>
          </button>
        </div>
      </div>

      {/* ================= 1. BLURTING ENGINE ================= */}
      {subMode === 'blurting' && (
        <div className="space-y-4">
          {/* Topic Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {BLURTING_PROMPTS_DATA.map((item) => {
              const active = item.id === selectedBlurtId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectBlurtTopic(item.id)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>

          {/* Active Blurting Workspace */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-amber-400">
                المحاضرة {activeBlurt.lectureId} · تمرين التفريغ الذهني النشط (Blurting Method)
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <ArabicVoiceButton
                  id={`blurt-voice-${activeBlurt.id}`}
                  segments={[
                    activeBlurt.examQuestionPrompt,
                    `شفرة التذكر: ${activeBlurt.hintMnemonic}`,
                    `الإجابة النموذجية الكاملة: ${activeBlurt.modelSummary}`,
                  ]}
                  label="استمع للسؤال والإجابة"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (!timerRunning && secondsLeft === 0) {
                      setSecondsLeft(activeBlurt.recommendedSeconds);
                    }
                    setTimerRunning((prev) => !prev);
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                    timerRunning
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span className="font-mono">{secondsLeft} ث</span>
                  <span>{timerRunning ? 'إيقاف المؤقت' : 'ابدأ مؤقت التحدي'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBlurtHint((prev) => !prev)}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {showBlurtHint ? 'إخفاء الشفرة' : 'تلميح الشفرة'}
                </button>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {activeBlurt.examQuestionPrompt}
            </h3>

            {showBlurtHint && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs font-bold text-amber-900 dark:text-amber-300">
                شفرة التذكر: {activeBlurt.hintMnemonic}
              </div>
            )}

            <textarea
              value={blurtText}
              onChange={(e) => {
                setBlurtText(e.target.value);
                if (isBlurtChecked) setIsBlurtChecked(false);
              }}
              rows={4}
              placeholder="اكتب هنا بسرعة كل الكلمات المفتاحية أو الأرقام أو العناصر التي تتذكرها دون النظر للملخص (لا يشترط الترتيب أو الصياغة الكاملة)..."
              className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 dark:focus:border-amber-500 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setIsBlurtChecked(true);
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                افحص تفريغي الذهني واكشف النواقص ({activeBlurt.targetKeywords.length} عناصر)
              </button>

              {blurtText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBlurtText('');
                    setIsBlurtChecked(false);
                    setSecondsLeft(activeBlurt.recommendedSeconds);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>مسح وإعادة التفريغ من الذاكرة</span>
                </button>
              )}
            </div>

            {/* Blurting Diagnostic Feedback */}
            {isBlurtChecked && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    نتيجة الاسترجاع الذهني:{' '}
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {blurtEvaluation.remembered.length} / {blurtEvaluation.total}
                    </span>{' '}
                    ({blurtEvaluation.scorePercent}%)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    سر طريقة Blurting: احفظ العناصر المنسية بالأسفل لمدة 30 ثانية ثم امسح وأعد الكتابة!
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Remembered Keywords */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>عناصر تذكرتها بنجاح ({blurtEvaluation.remembered.length}):</span>
                    </div>
                    {blurtEvaluation.remembered.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        لم تكتب بعد كلمات مطابقة — اقرأ النواقص بالجانب ثم جرب كتابتها غيباً!
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 font-medium">
                        {blurtEvaluation.remembered.map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span>✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Missed Keywords (The Goldmine of Blurting) */}
                  <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>نقاط فاتتك — ركز عليها الآن ({blurtEvaluation.missed.length}):</span>
                    </div>
                    {blurtEvaluation.missed.length === 0 ? (
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        مذهل! استرجعت جميع العناصر المطلوبة في هذا السؤال بالكامل!
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200 font-semibold">
                        {blurtEvaluation.missed.map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Complete Model Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    الإجابة النموذجية الكاملة للمقارنة:
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {activeBlurt.modelSummary}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 2. STORY CHAINING & MEMORY PALACE ================= */}
      {subMode === 'stories' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                سلاسل القصص البصرية (Story Chaining) — احفظ القوائم الطويلة كفيلم متسلسل
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                العقل البشري ينسى القوائم الجافة لكنه يستحيل أن ينسى قصة مترابطة بالأماكن والأحداث!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStoryTestMode((prev) => !prev);
                setRevealedStorySteps({});
              }}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                storyTestMode
                  ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {storyTestMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {storyTestMode ? 'وضع تسميع القصة: نشط' : 'اختبر نفسك في مشاهد القصة'}
              </span>
            </button>
          </div>

          <div className="space-y-4">
            {STORY_CHAINS_DATA.map((story) => {
              const storyVoiceSegments = [
                story.title,
                story.hook,
                ...story.scenes.map(
                  (s) => `المشهد ${s.stepNumber}: ${s.storyCue}. المقابل في الامتحان: ${s.examPoint}`
                ),
                `خلاصة القصة: ${story.moralSummary}`,
              ];

              return (
                <article
                  key={story.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-amber-400">
                        {story.lectureRange} · تقنية الربط القصصي المتسلسل
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                        {story.title}
                      </h4>
                    </div>

                    <ArabicVoiceButton
                      id={`story-voice-${story.id}`}
                      segments={storyVoiceSegments}
                      label="استمع للقصة كاملة"
                      activeLabel="إيقاف القصة"
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    🎬 مدخل القصة: {story.hook}
                  </p>

                  {/* Story Scenes */}
                  <div className="space-y-2.5">
                    {story.scenes.map((scene) => {
                      const stepKey = `${story.id}-${scene.stepNumber}`;
                      const isHidden = storyTestMode && !revealedStorySteps[stepKey];

                      return (
                        <div
                          key={scene.stepNumber}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/90 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {scene.stepNumber}
                              </span>
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                                مشهد القصة: {scene.storyCue}
                              </p>
                            </div>
                          </div>

                          {isHidden ? (
                            <button
                              type="button"
                              onClick={() => toggleStoryStep(stepKey)}
                              className="w-full py-2.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-emerald-700 dark:text-amber-400 hover:border-emerald-500 cursor-pointer text-center"
                            >
                              استرجع المعلومة العلمية المرتبطة بهذا المشهد ثم اضغط للكشف ({scene.keyword})
                            </button>
                          ) : (
                            <div className="pr-8 space-y-1">
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                                <strong className="text-emerald-700 dark:text-amber-400">
                                  المقابل في الامتحان:{' '}
                                </strong>
                                {scene.examPoint}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-amber-500/10 border border-emerald-200 dark:border-amber-500/25 text-xs font-bold text-emerald-950 dark:text-amber-200">
                    💡 خلاصة القصة للامتحان: {story.moralSummary}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 3. CLOZE ACTIVE RECALL DRILLS ================= */}
      {subMode === 'cloze' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                تسميع الفراغات النشط (Cloze Occlusion) — اضغط على الفراغ بعد تسميعه في ذهنك
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                أسرع طريقة لتثبيت التواريخ والأرقام والمصطلحات الدقيقة قبل دخول اللجنة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllCloze(false)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                إخفاء الكل للتسميع
              </button>
              <button
                type="button"
                onClick={() => setAllCloze(true)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                كشف الكل للمراجعة
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {CLOZE_DRILLS_DATA.map((item, idx) => {
              const fullSentence = item.parts.map((p) => p.text).join('');
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      فقرة تسميع {idx + 1} · المحاضرة {item.lectureId} · {item.category}
                    </span>
                    <ArabicVoiceButton
                      id={`cloze-voice-${item.id}`}
                      segments={[fullSentence]}
                      label="استمع للفقرة كاملة"
                    />
                  </div>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-loose">
                    {item.parts.map((part, pIdx) => {
                      if (!part.isBlank) {
                        return <span key={pIdx}>{part.text}</span>;
                      }
                      const key = `${item.id}-${pIdx}`;
                      const isRevealed = !!revealedClozeKeys[key];
                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => toggleClozeBlank(key)}
                          className={`mx-1 px-2.5 py-0.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center gap-1 ${
                            isRevealed
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-500/20 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-dashed border-amber-500 hover:bg-amber-500/30'
                          }`}
                        >
                          {isRevealed ? part.text : 'اضغط لكشف الإجابة'}
                        </button>
                      );
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 4. FEYNMAN SIMPLE EXPLAINER ================= */}
      {subMode === 'feynman' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              تقنية فاينمان (Feynman Technique) — افهم الفكرة بالبلدي وبأبسط تشبيه في 30 ثانية
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              إذا فهمت «لماذا» صيغ القانون بهذا الشكل، لن تنساه أبداً حتى لو توترت في اللجنة
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEYNMAN_CARDS_DATA.map((card) => (
              <article
                key={card.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-amber-400">
                      المحاضرة {card.lectureId} · تبسيط فاينمان
                    </span>
                    <ArabicVoiceButton
                      id={`feyn-voice-${card.id}`}
                      segments={[
                        card.concept,
                        `التشبيه المبسط: ${card.simpleAnalogy}`,
                        `فخ الامتحان: ${card.examTrapToAvoid}`,
                      ]}
                      label="استمع للشرح"
                    />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {card.concept}
                  </h4>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-300">
                    {card.academicDefinition}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">التشبيه المبسط: </strong>
                    {card.simpleAnalogy}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-900 dark:text-rose-200 font-semibold mt-2">
                  ⚠️ فخ الامتحان الذي يجب الحذر منه: {card.examTrapToAvoid}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
