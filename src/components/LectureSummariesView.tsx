import React, { useState } from 'react';
import { Calculator, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { LECTURES_DATA } from '../data/courseData';
import { ArabicVoiceButton, VoiceSpeedSelector } from '../utils/arabicSpeech';

export const LectureSummariesView: React.FC = () => {
  const [activeLectureId, setActiveLectureId] = useState<number>(1);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);

  // Quick interactive sandbox state for Lecture 3, 4, 5 formulas
  const [r1, setR1] = useState<number>(0.9);
  const [r2, setR2] = useState<number>(0.8);
  const [matrixP, setMatrixP] = useState<number>(0.7);
  const [matrixC, setMatrixC] = useState<number>(0.4);

  const activeLecture = LECTURES_DATA.find((l) => l.id === activeLectureId) || LECTURES_DATA[0];

  const seriesReliability = (r1 * r2).toFixed(4);
  const parallelReliability = (1 - (1 - r1) * (1 - r2)).toFixed(4);
  const matrixScore = Number((matrixP * matrixC).toFixed(3));
  const matrixZone =
    matrixScore >= 0.18
      ? {
          label: 'منطقة حمراء (خطر شديد — أولوية قصوى ≥ 0.18)',
          color: 'text-rose-600 dark:text-rose-400',
        }
      : matrixScore >= 0.05
      ? {
          label: 'منطقة صفراء (خطر متوسط 0.05 – 0.14)',
          color: 'text-amber-600 dark:text-amber-400',
        }
      : {
          label: 'منطقة خضراء (خطر منخفض ≤ 0.04)',
          color: 'text-emerald-600 dark:text-emerald-400',
        };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Lecture Selector Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              ملخصات المحاضرات الـ 6 المركزة (من الصفر للاحتراف)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              كل محاضرة مقسمة إلى كبسولات حفظ سريع وجداول مقارنات وقوانين المسائل مع قراءة صوتية
            </p>
          </div>
          <VoiceSpeedSelector />
        </div>

        {/* 6 Lecture Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {LECTURES_DATA.map((lec) => {
            const isActive = lec.id === activeLectureId;
            return (
              <button
                key={lec.id}
                type="button"
                onClick={() => setActiveLectureId(lec.id)}
                className={`min-h-[48px] p-2.5 rounded-xl text-right transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 border-emerald-600 dark:border-amber-400 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="text-[11px] opacity-85">المحاضرة {lec.id}</div>
                <div className="text-xs font-bold truncate mt-0.5">{lec.chapter}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Lecture Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-emerald-700 dark:text-amber-400 font-bold">
            المحاضرة {activeLecture.id} · {activeLecture.chapter}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <ArabicVoiceButton
              id={`lec-overview-${activeLecture.id}`}
              segments={[
                activeLecture.title,
                activeLecture.coreIdea,
                activeLecture.mnemonicTitle,
                activeLecture.mnemonicCode,
                activeLecture.mnemonicExplanation,
              ]}
              label="استمع لخلاصة المحاضرة وشفرتها"
            />

            <button
              type="button"
              onClick={() => setShowSandbox((prev) => !prev)}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
              <span>حاسبة القوانين التفاعلية</span>
              {showSandbox ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
          {activeLecture.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          {activeLecture.coreIdea}
        </p>

        {/* Lecture Master Mnemonic Box */}
        <div className="bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-400">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>{activeLecture.mnemonicTitle}</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-amber-200">
            {activeLecture.mnemonicCode}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {activeLecture.mnemonicExplanation}
          </p>
        </div>

        {/* Interactive Formula Sandbox (Collapsible) */}
        {showSandbox && (
          <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 dark:border-amber-500/30 rounded-xl p-4 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reliability Calculator */}
            <div className="space-y-2.5 bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-amber-400">
                1. حاسبة هندسة الموثوقية (توالي vs توازي — محاضرة 3)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    موثوقية المكون الأول (R1): {r1}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.99"
                    step="0.01"
                    value={r1}
                    onChange={(e) => setR1(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 dark:accent-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    موثوقية المكون الثاني (R2): {r2}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.99"
                    step="0.01"
                    value={r2}
                    onChange={(e) => setR2(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 dark:accent-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    توصيل على التوالي (R1 × R2)
                  </div>
                  <div className="font-mono text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {(Number(seriesReliability) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    توصيل على التوازي 1-(1-R1)(1-R2)
                  </div>
                  <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {(Number(parallelReliability) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Matrix Calculator */}
            <div className="space-y-2.5 bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-amber-400">
                2. حاسبة مصفوفة المخاطر (P × C — محاضرة 4)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    الاحتمالية (P) من المقياس القياسي:
                  </label>
                  <select
                    value={matrixP}
                    onChange={(e) => setMatrixP(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value={0.1}>0.1 (نادر جداً)</option>
                    <option value={0.3}>0.3 (منخفض)</option>
                    <option value={0.5}>0.5 (متوسط)</option>
                    <option value={0.7}>0.7 (مرتفع)</option>
                    <option value={0.9}>0.9 (شبه مؤكد)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    الأثر / العاقبة (C) من المقياس القياسي:
                  </label>
                  <select
                    value={matrixC}
                    onChange={(e) => setMatrixC(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value={0.05}>0.05 (ضئيل جداً)</option>
                    <option value={0.1}>0.10 (طفيف)</option>
                    <option value={0.2}>0.20 (معتدل)</option>
                    <option value={0.4}>0.40 (كبير)</option>
                    <option value={0.8}>0.80 (كارثي)</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    درجة الخطر (Risk Score = P × C)
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${matrixZone.color}`}>
                    {matrixZone.label}
                  </div>
                </div>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {matrixScore}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lecture Formulas if present */}
      {activeLecture.formulas && activeLecture.formulas.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
          <h4 className="text-sm font-bold text-emerald-700 dark:text-amber-400">
            قوانين ومعادلات المحاضرة {activeLecture.id} (للمسائل الحسابية)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeLecture.formulas.map((f, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{f.name}</div>
                <div
                  dir="ltr"
                  className="font-mono text-xs sm:text-sm text-emerald-800 dark:text-amber-300 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/80 overflow-x-auto"
                >
                  {f.equation}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {f.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lecture Comparison Tables if present */}
      {activeLecture.comparisons && activeLecture.comparisons.length > 0 && (
        <div className="space-y-4">
          {activeLecture.comparisons.map((comp, cIdx) => (
            <section
              key={cIdx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs"
            >
              <h4 className="text-sm sm:text-base font-bold text-emerald-700 dark:text-amber-400">
                {comp.title}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 text-emerald-800 dark:text-amber-400 border-b border-slate-200 dark:border-slate-800">
                      {comp.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-3 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {comp.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={`p-3 leading-relaxed ${
                              cellIdx === 0
                                ? 'font-bold text-slate-900 dark:text-slate-100'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lecture Structured Sections */}
      <div className="space-y-4">
        {activeLecture.sections.map((sec, idx) => {
          const secSpeech = [
            sec.heading,
            ...sec.keyPoints.map((kp) => `${kp.term}: ${kp.detail}`),
          ];

          return (
            <section
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {sec.heading}
                </h4>
                <ArabicVoiceButton
                  id={`lec-${activeLecture.id}-sec-${idx}`}
                  segments={secSpeech}
                  label="استمع لهذا القسم"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {sec.keyPoints.map((kp, kpIdx) => (
                  <div
                    key={kpIdx}
                    className="bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-amber-300">
                        {kp.term}
                      </span>
                      {kp.highlight && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          مفتاح التذكر: {kp.highlight}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {kp.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
