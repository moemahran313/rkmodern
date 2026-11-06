import React from 'react';

export interface MatrixMarkerItem {
  p: number; // 0.9 | 0.7 | 0.5 | 0.3 | 0.1
  c: number; // 0.05 | 0.10 | 0.20 | 0.40 | 0.80
  badgeLetter: string; // e.g. 'أ' | 'ب' | 'ج'
  cardTitle: string;
  probText: string; // e.g. 'الاحتمال: متوسط ← 0.5'
  consText: string; // e.g. 'العاقبة: متوسطة ← 0.2'
  equationText: string; // e.g. '0.5 × 0.2 = 0.10'
  statusLabel: string; // e.g. 'أصفر : خطر متوسط'
  statusTone: 'green' | 'yellow' | 'red';
}

interface VisualRiskMatrixProps {
  headerBadge?: string; // e.g. 'مثال محلول (1)'
  title: string; // e.g. 'استقالة الموظفين مقابل نشوب حريق هائل'
  markers?: MatrixMarkerItem[];
  conclusionText?: string;
  onSelectCell?: (p: number, c: number) => void;
  compact?: boolean;
}

const PROB_ROWS = [0.9, 0.7, 0.5, 0.3, 0.1];
const CONS_COLS = [0.05, 0.1, 0.2, 0.4, 0.8];

// Exact cell display values and color zones from the lecture slide
const MATRIX_CELLS: Record<
  string,
  { display: string; zone: 'green' | 'yellow' | 'red' }
> = {
  '0.9_0.05': { display: '0.05', zone: 'yellow' },
  '0.9_0.1': { display: '0.09', zone: 'yellow' },
  '0.9_0.2': { display: '0.18', zone: 'red' },
  '0.9_0.4': { display: '0.36', zone: 'red' },
  '0.9_0.8': { display: '0.72', zone: 'red' },

  '0.7_0.05': { display: '0.04', zone: 'green' },
  '0.7_0.1': { display: '0.07', zone: 'yellow' },
  '0.7_0.2': { display: '0.14', zone: 'yellow' },
  '0.7_0.4': { display: '0.28', zone: 'red' },
  '0.7_0.8': { display: '0.56', zone: 'red' },

  '0.5_0.05': { display: '0.03', zone: 'green' },
  '0.5_0.1': { display: '0.05', zone: 'yellow' },
  '0.5_0.2': { display: '0.10', zone: 'yellow' },
  '0.5_0.4': { display: '0.20', zone: 'red' },
  '0.5_0.8': { display: '0.40', zone: 'red' },

  '0.3_0.05': { display: '0.02', zone: 'green' },
  '0.3_0.1': { display: '0.03', zone: 'green' },
  '0.3_0.2': { display: '0.06', zone: 'yellow' },
  '0.3_0.4': { display: '0.12', zone: 'yellow' },
  '0.3_0.8': { display: '0.24', zone: 'red' },

  '0.1_0.05': { display: '0.01', zone: 'green' },
  '0.1_0.1': { display: '0.01', zone: 'green' },
  '0.1_0.2': { display: '0.02', zone: 'green' },
  '0.1_0.4': { display: '0.04', zone: 'green' },
  '0.1_0.8': { display: '0.08', zone: 'yellow' },
};

export const VisualRiskMatrix: React.FC<VisualRiskMatrixProps> = ({
  headerBadge,
  title,
  markers = [],
  conclusionText,
  onSelectCell,
}) => {
  const getCellStyle = (zone: 'green' | 'yellow' | 'red', isMarked: boolean) => {
    if (isMarked) {
      if (zone === 'red') {
        return 'bg-[#F08C90] dark:bg-rose-500 text-slate-950 ring-2 ring-[#1E293B] dark:ring-white font-extrabold shadow-sm z-10';
      }
      if (zone === 'green') {
        return 'bg-[#8FD6A8] dark:bg-emerald-400 text-slate-950 ring-2 ring-[#1E293B] dark:ring-white font-extrabold shadow-sm z-10';
      }
      return 'bg-[#F3D44C] dark:bg-amber-400 text-slate-950 ring-2 ring-[#1E293B] dark:ring-white font-extrabold shadow-sm z-10';
    }

    switch (zone) {
      case 'green':
        return 'bg-[#CBEAD6] dark:bg-emerald-900/65 text-slate-900 dark:text-emerald-100';
      case 'yellow':
        return 'bg-[#F7E8A4] dark:bg-amber-800/60 text-slate-900 dark:text-amber-100';
      case 'red':
        return 'bg-[#F4B6B8] dark:bg-rose-900/70 text-slate-900 dark:text-rose-100';
    }
  };

  const getStatusPillClass = (tone: 'green' | 'yellow' | 'red') => {
    switch (tone) {
      case 'green':
        return 'bg-[#8FD6A8] dark:bg-emerald-500/30 text-slate-950 dark:text-emerald-200';
      case 'yellow':
        return 'bg-[#F5D547] dark:bg-amber-500/30 text-slate-950 dark:text-amber-200';
      case 'red':
        return 'bg-[#F4979A] dark:bg-rose-500/30 text-slate-950 dark:text-rose-200';
    }
  };

  return (
    <div className="rounded-2xl bg-[#F4F5F7] dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
      {/* Slide Title Header */}
      <div className="text-right space-y-0.5">
        {headerBadge && (
          <div className="text-sm sm:text-base font-extrabold text-[#B91C1C] dark:text-rose-400">
            {headerBadge}
          </div>
        )}
        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
          {title}
        </h4>
      </div>

      {/* Main Content: Cards on Right (in RTL) + Visual Matrix Table on Left (matching slide) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Right Column in RTL: Breakdown Cards (أ , ب , ...) */}
        {markers.length > 0 && (
          <div className="lg:col-span-6 space-y-3 order-1">
            {markers.map((m, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-start gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#111C2D] dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-sm flex items-center justify-center shrink-0">
                    {m.badgeLetter}
                  </span>
                  <h5 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {m.cardTitle}
                  </h5>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 pt-0.5">
                  <span>{m.probText}</span>
                  <span>{m.consText}</span>
                </div>

                <div
                  dir="ltr"
                  className="text-center font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white"
                >
                  {m.equationText}
                </div>

                <div className="flex justify-center pt-0.5">
                  <span
                    className={`px-4 py-1 rounded-full text-xs sm:text-sm font-extrabold ${getStatusPillClass(
                      m.statusTone
                    )}`}
                  >
                    {m.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Left Column in RTL: Exact 5x5 Visual Risk Matrix Grid */}
        <div
          className={`${
            markers.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'
          } order-2 overflow-x-auto`}
        >
          <div dir="ltr" className="min-w-[310px] max-w-[440px] mx-auto select-none">
            <div className="grid grid-cols-6 gap-1 text-center">
              {/* Top Header Row */}
              <div className="bg-[#DCE1E9] dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md py-2 px-1 text-xs sm:text-sm font-extrabold flex items-center justify-center">
                الاحتمال
              </div>
              <div
                dir="rtl"
                className="col-span-5 bg-[#DCE1E9] dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md py-2 px-2 text-xs sm:text-sm font-extrabold flex items-center justify-center"
              >
                درجة الخطورة = الاحتمال × العاقبة
              </div>

              {/* 5 Probability Rows (0.9 down to 0.1) */}
              {PROB_ROWS.map((p) => (
                <React.Fragment key={p}>
                  {/* Probability Header Cell */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-md py-2.5 px-1 font-mono text-xs sm:text-sm font-extrabold flex items-center justify-center">
                    {p.toFixed(1)}
                  </div>

                  {/* 5 Consequence Cells */}
                  {CONS_COLS.map((c) => {
                    const cellKey = `${p}_${c}`;
                    const cellInfo = MATRIX_CELLS[cellKey];
                    const matchingMarkers = markers.filter(
                      (m) => Math.abs(m.p - p) < 0.001 && Math.abs(m.c - c) < 0.001
                    );
                    const isMarked = matchingMarkers.length > 0;
                    const markerLabel = matchingMarkers.map((m) => m.badgeLetter).join(' ، ');

                    return (
                      <div
                        key={cellKey}
                        onClick={() => onSelectCell && onSelectCell(p, c)}
                        className={`relative rounded-md py-2 px-1 font-mono text-xs sm:text-sm font-bold flex flex-col items-center justify-center transition-transform ${
                          onSelectCell ? 'cursor-pointer hover:scale-105' : ''
                        } ${getCellStyle(cellInfo.zone, isMarked)}`}
                      >
                        {isMarked && (
                          <span
                            dir="rtl"
                            className="text-[11px] leading-none font-sans font-extrabold text-slate-950 mb-0.5"
                          >
                            {markerLabel}
                          </span>
                        )}
                        <span className="leading-tight">{cellInfo.display}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Bottom Consequence Row */}
              <div className="bg-[#DCE1E9] dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md py-2 px-1 text-xs sm:text-sm font-extrabold flex items-center justify-center">
                العاقبة
              </div>
              {CONS_COLS.map((c) => (
                <div
                  key={c}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-md py-2 px-1 font-mono text-xs sm:text-sm font-extrabold flex items-center justify-center"
                >
                  {c.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Slide Conclusion Line */}
      {conclusionText && (
        <p className="text-center text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-1">
          {conclusionText}
        </p>
      )}
    </div>
  );
};

// Ready-to-use Presets for all course examples & sheet questions
export const RISK_MATRIX_PRESETS = {
  resignationVsFire: {
    headerBadge: 'مثال محلول (1)',
    title: 'استقالة الموظفين مقابل نشوب حريق هائل',
    markers: [
      {
        p: 0.5,
        c: 0.2,
        badgeLetter: 'أ',
        cardTitle: 'استقالة الموظفين فجأة',
        probText: 'الاحتمال: متوسط ← 0.5',
        consText: 'العاقبة: متوسطة ← 0.2',
        equationText: '0.5 × 0.2 = 0.10',
        statusLabel: 'أصفر : خطر متوسط',
        statusTone: 'yellow' as const,
      },
      {
        p: 0.1,
        c: 0.8,
        badgeLetter: 'ب',
        cardTitle: 'نشوب حريق هائل',
        probText: 'الاحتمال: نادر ← 0.1',
        consText: 'العاقبة: كارثية ← 0.8',
        equationText: '0.1 × 0.8 = 0.08',
        statusLabel: 'أصفر : خطر متوسط',
        statusTone: 'yellow' as const,
      },
    ],
    conclusionText:
      'الخطران مختلفان تماماً في طبيعتهما، لكن درجتيهما متقاربتان؛ ولهذا وُصف كلاهما بأنه "متوسط".',
  },

  aswanVsHighDam: {
    headerBadge: 'مثال محلول (2)',
    title: 'حدوث زلزال في المباني العادية بأسوان مقارنةً بالسد العالي وخزان أسوان',
    markers: [
      {
        p: 0.1,
        c: 0.4,
        badgeLetter: 'أ',
        cardTitle: 'المباني العادية بأسوان',
        probText: 'الاحتمال: نادر جداً ← 0.1',
        consText: 'العاقبة: كبيرة ← 0.4',
        equationText: '0.1 × 0.4 = 0.04',
        statusLabel: 'أخضر : خطر منخفض',
        statusTone: 'green' as const,
      },
      {
        p: 0.1,
        c: 0.8,
        badgeLetter: 'ب',
        cardTitle: 'السد العالي وخزان أسوان',
        probText: 'الاحتمال: نادر جداً ← 0.1',
        consText: 'العاقبة: كارثية ← 0.8',
        equationText: '0.1 × 0.8 = 0.08',
        statusLabel: 'أصفر : خطر متوسط (خطة حماية لازمة)',
        statusTone: 'yellow' as const,
      },
    ],
    conclusionText:
      'مع ثبات الاحتمال (0.1)، مضاعفة العاقبة من 0.4 إلى 0.8 نقلت الخطر من المنطقة الخضراء إلى الصفراء ذات الأولوية.',
  },

  towerCraneMaintenance: {
    headerBadge: 'مثال تطبيقي (أثر إجراءات التخفيف)',
    title: 'تعطل الرافعة البرجية قبل وبعد إبرام عقد الصيانة الوقائية',
    markers: [
      {
        p: 0.7,
        c: 0.4,
        badgeLetter: 'أ',
        cardTitle: 'قبل الصيانة الوقائية',
        probText: 'الاحتمال: مرتفع ← 0.7',
        consText: 'العاقبة: كبيرة ← 0.4',
        equationText: '0.7 × 0.4 = 0.28',
        statusLabel: 'أحمر : خطر شديد (أولوية قصوى)',
        statusTone: 'red' as const,
      },
      {
        p: 0.3,
        c: 0.4,
        badgeLetter: 'ب',
        cardTitle: 'بعد عقد الصيانة الوقائية',
        probText: 'الاحتمال: منخفض ← 0.3',
        consText: 'العاقبة: كبيرة ← 0.4',
        equationText: '0.3 × 0.4 = 0.12',
        statusLabel: 'أصفر : خطر متوسط',
        statusTone: 'yellow' as const,
      },
    ],
    conclusionText:
      'خفض الاحتمال من 0.7 إلى 0.3 عبر الصيانة الوقائية نقل الخطر من المنطقة الحمراء (0.28) إلى الصفراء (0.12).',
  },

  threeEvaluatorsDiff: {
    headerBadge: 'مثال اختلاف المقيّمين (حدود المصفوفة)',
    title: 'تقييم 3 أشخاص لنفس خطر «تأخر توريد مواد البناء»',
    markers: [
      {
        p: 0.5,
        c: 0.1,
        badgeLetter: 'أ',
        cardTitle: 'مدير المشروع (متفائل)',
        probText: 'الاحتمال: متوسط ← 0.5',
        consText: 'العاقبة: طفيفة ← 0.1',
        equationText: '0.5 × 0.1 = 0.05',
        statusLabel: 'أصفر : أولوية منخفضة نسبياً',
        statusTone: 'yellow' as const,
      },
      {
        p: 0.7,
        c: 0.2,
        badgeLetter: 'ب',
        cardTitle: 'مهندس الموقع (واقعي)',
        probText: 'الاحتمال: مرتفع ← 0.7',
        consText: 'العاقبة: متوسطة ← 0.2',
        equationText: '0.7 × 0.2 = 0.14',
        statusLabel: 'أصفر : خطر متوسط مرتفع',
        statusTone: 'yellow' as const,
      },
      {
        p: 0.7,
        c: 0.4,
        badgeLetter: 'ج',
        cardTitle: 'مالك المشروع (متحفظ)',
        probText: 'الاحتمال: مرتفع ← 0.7',
        consText: 'العاقبة: كبيرة ← 0.4',
        equationText: '0.7 × 0.4 = 0.28',
        statusLabel: 'أحمر : خطر شديد',
        statusTone: 'red' as const,
      },
    ],
    conclusionText:
      'نفس الخطر حصل على 3 درجات مختلفة (0.05 ، 0.14 ، 0.28) بسبب الذاتية واختلاف زاوية الرؤية وعدم تعريف المقياس بالأرقام.',
  },
};
