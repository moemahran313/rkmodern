import React, { useState, useEffect } from 'react';
import { Volume2, Square, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { FLASHCARDS_DATA } from '../data/courseData';

export type SaudiVoiceGender = 'male' | 'female';

export interface OfflineVoicePackStatus {
  cachedCount: number;
  totalCount: number;
  isDownloading: boolean;
}

type SpeechListener = (
  activeId: string | null,
  loadingId: string | null,
  currentRate: number,
  voiceGender: SaudiVoiceGender,
  packStatus: OfflineVoicePackStatus
) => void;

const IDB_NAME = 'risk_cram_saudi_tts_db_v3';
const IDB_STORE = 'audio_clips';
const GENDER_STORAGE_KEY = 'risk_cram_saudi_voice_gender_v2';

interface CachedAudioRecord {
  audioBase64: string;
  mimeType: string;
  isNeuralSaudi?: boolean;
}

function hashTextKey(text: string, gender: SaudiVoiceGender): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `txt_${gender}_${(h >>> 0).toString(36)}_${text.length}`;
}

function openAudioCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedAudio(cacheKey: string): Promise<CachedAudioRecord | null> {
  try {
    const db = await openAudioCacheDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(cacheKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function setCachedAudio(cacheKey: string, value: CachedAudioRecord): Promise<void> {
  try {
    const db = await openAudioCacheDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, cacheKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore cache storage errors
  }
}

class ArabicSpeechManager {
  private activeId: string | null = null;
  private loadingId: string | null = null;
  private rate: number = 1.0;
  private voiceGender: SaudiVoiceGender = 'male';
  private listeners: Set<SpeechListener> = new Set();
  private currentAudio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private isCancelled = false;

  private packCachedCount = 0;
  private packTotalCount = FLASHCARDS_DATA.length;
  private isDownloadingPack = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedGender = localStorage.getItem(GENDER_STORAGE_KEY);
        if (savedGender === 'female' || savedGender === 'male') {
          this.voiceGender = savedGender;
        }
      } catch {
        // Ignore
      }
      // Request persistent storage so the browser never evicts offline Saudi voice clips
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
      setTimeout(() => {
        this.refreshOfflinePackCount();
      }, 400);
    }
  }

  private getPackStatus(): OfflineVoicePackStatus {
    return {
      cachedCount: this.packCachedCount,
      totalCount: this.packTotalCount,
      isDownloading: this.isDownloadingPack,
    };
  }

  public subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    listener(
      this.activeId,
      this.loadingId,
      this.rate,
      this.voiceGender,
      this.getPackStatus()
    );
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status = this.getPackStatus();
    this.listeners.forEach((l) =>
      l(this.activeId, this.loadingId, this.rate, this.voiceGender, status)
    );
  }

  public getRate(): number {
    return this.rate;
  }

  public setRate(newRate: number) {
    this.rate = newRate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = newRate;
    }
    this.notify();
  }

  public getVoiceGender(): SaudiVoiceGender {
    return this.voiceGender;
  }

  public setVoiceGender(gender: SaudiVoiceGender) {
    this.voiceGender = gender;
    try {
      localStorage.setItem(GENDER_STORAGE_KEY, gender);
    } catch {
      // Ignore
    }
    this.refreshOfflinePackCount();
    this.notify();
  }

  public stop() {
    this.isCancelled = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeId = null;
    this.loadingId = null;
    this.notify();
  }

  public formatForNaturalSaudiSpeech(textSegments: string[]): string {
    return textSegments
      .map((seg) =>
        seg
          .replace(/[←→↔✓⚠️🎬🔑💡•]/g, ' ، ')
          .replace(/\$/g, ' دولار ')
          .replace(/%/g, ' بالمئة ')
          .replace(/×/g, ' ضرب ')
          .replace(/÷/g, ' تقسيم ')
          .replace(/≥/g, ' أكبر من أو يساوي ')
          .replace(/≤/g, ' أقل من أو يساوي ')
          .replace(/\b0?1\./g, ' أولاً: ')
          .replace(/\b0?2\./g, ' ثانياً: ')
          .replace(/\b0?3\./g, ' ثالثاً: ')
          .replace(/\b0?4\./g, ' رابعاً: ')
          .replace(/\b0?5\./g, ' خامساً: ')
          .replace(/\b1\)/g, ' أولاً: ')
          .replace(/\b2\)/g, ' ثانياً: ')
          .replace(/\b3\)/g, ' ثالثاً: ')
          .replace(/\b4\)/g, ' رابعاً: ')
          .replace(/\b5\)/g, ' خامساً: ')
          .trim()
      )
      .filter((s) => s.length > 0)
      .join(' . ');
  }

  // Checks how many flashcards have their Saudi voice saved in IndexedDB for offline use
  public async refreshOfflinePackCount(): Promise<void> {
    let count = 0;
    for (const card of FLASHCARDS_DATA) {
      const idKey = `fc-full-${card.id}__${this.voiceGender}__v3`;
      const existing = await getCachedAudio(idKey);
      if (existing && existing.audioBase64) {
        count++;
      }
    }
    this.packCachedCount = count;
    this.packTotalCount = FLASHCARDS_DATA.length;
    this.notify();
  }

  // Pre-fetches and stores a single item in IndexedDB without playing it aloud
  public async prefetchAudioItem(id: string, textSegments: string[]): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const cleanFullText = this.formatForNaturalSaudiSpeech(textSegments);
    if (!cleanFullText) return false;

    const idKey = `${id}__${this.voiceGender}__v3`;
    const textKey = hashTextKey(cleanFullText, this.voiceGender);

    const existing = (await getCachedAudio(idKey)) || (await getCachedAudio(textKey));
    if (existing && existing.audioBase64) {
      return true;
    }

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanFullText,
          voiceGender: this.voiceGender,
        }),
      });

      if (!response.ok) return false;
      const data = (await response.json()) as {
        audioBase64: string;
        mimeType: string;
        isNeuralSaudi?: boolean;
      };
      if (!data.audioBase64) return false;

      const record: CachedAudioRecord = {
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/wav',
        isNeuralSaudi: data.isNeuralSaudi !== false,
      };
      await setCachedAudio(idKey, record);
      await setCachedAudio(textKey, record);
      return true;
    } catch {
      return false;
    }
  }

  // Downloads all Flashcard voices into IndexedDB so they work 100% offline in Airplane mode
  public async downloadOfflineVoicePack(): Promise<void> {
    if (this.isDownloadingPack) return;
    this.isDownloadingPack = true;
    this.notify();

    try {
      let count = 0;
      for (const card of FLASHCARDS_DATA) {
        const fullSegments = [
          `السؤال: ${card.question}`,
          `الخلاصة الفورية: ${card.shortAnswer}`,
          ...card.bulletPoints,
          `شفرة الحفظ: ${card.mnemonic}`,
        ];
        const shortSegments = [
          `السؤال: ${card.question}`,
          `شفرة الحفظ السريع: ${card.mnemonic}`,
        ];

        const okFull = await this.prefetchAudioItem(`fc-full-${card.id}`, fullSegments);
        await this.prefetchAudioItem(`fc-q-${card.id}`, shortSegments);

        if (okFull) {
          count++;
          this.packCachedCount = count;
          this.notify();
        }
      }
    } finally {
      this.isDownloadingPack = false;
      await this.refreshOfflinePackCount();
      this.notify();
    }
  }

  public async speak(id: string, textSegments: string[]) {
    if (this.activeId === id || this.loadingId === id) {
      this.stop();
      return;
    }

    this.stop();
    this.isCancelled = false;

    const cleanFullText = this.formatForNaturalSaudiSpeech(textSegments);
    if (!cleanFullText) return;

    const idKey = `${id}__${this.voiceGender}__v3`;
    const legacyKey = `${id}__${this.voiceGender}__v2`;
    const textKey = hashTextKey(cleanFullText, this.voiceGender);

    this.loadingId = id;
    this.notify();

    // Unlock an HTMLAudioElement synchronously inside the user click gesture
    // so mobile Safari / Chrome allows .play() after async fetch completes
    const unlockedAudio = new Audio();
    unlockedAudio.preload = 'auto';
    try {
      unlockedAudio.load();
    } catch {
      // Ignore
    }
    this.currentAudio = unlockedAudio;

    try {
      // 1. Check IndexedDB offline cache first (by ID, text hash, or legacy key)
      let audioPayload =
        (await getCachedAudio(idKey)) ||
        (await getCachedAudio(textKey)) ||
        (await getCachedAudio(legacyKey));

      // 2. If not cached yet, request voice from /api/tts
      if (!audioPayload) {
        this.abortController = new AbortController();
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanFullText,
            voiceGender: this.voiceGender,
          }),
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`TTS HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          audioBase64: string;
          mimeType: string;
          isNeuralSaudi?: boolean;
        };

        if (!data.audioBase64) {
          throw new Error('Empty audio payload');
        }

        audioPayload = {
          audioBase64: data.audioBase64,
          mimeType: data.mimeType || 'audio/wav',
          isNeuralSaudi: data.isNeuralSaudi !== false,
        };

        // Save in IndexedDB under both ID and text hash so it plays 100% offline forever
        await setCachedAudio(idKey, audioPayload);
        await setCachedAudio(textKey, audioPayload);
        this.refreshOfflinePackCount();
      }

      if (this.isCancelled || this.loadingId !== id) {
        return;
      }

      // 3. Play the audio via Blob URL on the gesture-unlocked HTMLAudioElement
      const byteCharacters = atob(audioPayload.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: audioPayload.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      unlockedAudio.src = blobUrl;
      unlockedAudio.playbackRate = this.rate;
      this.currentAudio = unlockedAudio;
      this.loadingId = null;
      this.activeId = id;
      this.notify();

      unlockedAudio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        if (this.activeId === id) {
          this.activeId = null;
          this.currentAudio = null;
          this.notify();
        }
      };

      unlockedAudio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        if (this.activeId === id) {
          this.activeId = null;
          this.currentAudio = null;
          this.notify();
        }
      };

      await unlockedAudio.play();
    } catch {
      if (this.isCancelled) return;
      this.speakWithDeviceFallback(id, cleanFullText);
    }
  }

  private speakWithDeviceFallback(id: string, text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.loadingId = null;
      this.activeId = null;
      this.notify();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      // Prefer ar-SA (Saudi Arabic) or high-quality natural Arabic voices
      const arVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
      const preferredVoice =
        arVoices.find(
          (v) =>
            v.lang.toLowerCase().includes('sa') &&
            (v.name.toLowerCase().includes('natural') ||
              v.name.toLowerCase().includes('hamed') ||
              v.name.toLowerCase().includes('zariyah') ||
              v.name.toLowerCase().includes('maged') ||
              v.name.toLowerCase().includes('tarik'))
        ) ||
        arVoices.find((v) => v.lang.toLowerCase().includes('sa')) ||
        arVoices.find((v) => v.name.toLowerCase().includes('natural')) ||
        arVoices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = 'ar-SA';
      }

      utterance.rate = this.rate;
      utterance.pitch = 1.0;

      this.loadingId = null;
      this.activeId = id;
      this.notify();

      utterance.onend = () => {
        if (this.activeId === id) {
          this.activeId = null;
          this.notify();
        }
      };

      utterance.onerror = () => {
        if (this.activeId === id) {
          this.activeId = null;
          this.notify();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.loadingId = null;
      this.activeId = null;
      this.notify();
    }
  }
}

export const speechManager = new ArabicSpeechManager();

export function useArabicSpeech() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(speechManager.getRate());
  const [voiceGender, setVoiceGender] = useState<SaudiVoiceGender>(
    speechManager.getVoiceGender()
  );
  const [packStatus, setPackStatus] = useState<OfflineVoicePackStatus>({
    cachedCount: 0,
    totalCount: FLASHCARDS_DATA.length,
    isDownloading: false,
  });

  useEffect(() => {
    return speechManager.subscribe((id, loading, currentRate, gender, status) => {
      setActiveId(id);
      setLoadingId(loading);
      setRate(currentRate);
      setVoiceGender(gender);
      setPackStatus(status);
    });
  }, []);

  return {
    activeId,
    loadingId,
    rate,
    voiceGender,
    packStatus,
    speak: (id: string, segments: string[]) => speechManager.speak(id, segments),
    stop: () => speechManager.stop(),
    setRate: (r: number) => speechManager.setRate(r),
    setVoiceGender: (g: SaudiVoiceGender) => speechManager.setVoiceGender(g),
    downloadOfflineVoicePack: () => speechManager.downloadOfflineVoicePack(),
  };
}

interface ArabicVoiceButtonProps {
  id: string;
  segments: string[];
  label?: string;
  activeLabel?: string;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'subtle';
  onClickStopPropagation?: boolean;
}

export const ArabicVoiceButton: React.FC<ArabicVoiceButtonProps> = ({
  id,
  segments,
  label = 'استمع بالصوت',
  activeLabel = 'إيقاف الصوت',
  size = 'sm',
  variant = 'subtle',
  onClickStopPropagation = true,
}) => {
  const { activeId, loadingId, speak } = useArabicSpeech();
  const isPlaying = activeId === id;
  const isLoading = loadingId === id;

  const handleClick = (e: React.MouseEvent) => {
    if (onClickStopPropagation) {
      e.stopPropagation();
    }
    speak(id, segments);
  };

  const sizeClasses =
    size === 'md'
      ? 'min-h-[42px] px-3.5 py-2 text-xs sm:text-sm rounded-xl gap-2'
      : 'min-h-[36px] px-3 py-1.5 text-xs rounded-xl gap-1.5';

  const variantClasses = isPlaying
    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 font-bold shadow-xs'
    : isLoading
    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
    : variant === 'primary'
    ? 'bg-emerald-600 hover:bg-emerald-500 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold shadow-xs'
    : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 font-bold';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0 ${sizeClasses} ${variantClasses}`}
      title={isPlaying ? activeLabel : label}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>جاري تحضير الصوت...</span>
        </>
      ) : isPlaying ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>{activeLabel}</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export const VoiceSpeedSelector: React.FC = () => {
  const {
    rate,
    setRate,
    activeId,
    loadingId,
    stop,
    packStatus,
    downloadOfflineVoicePack,
  } = useArabicSpeech();

  const cycleRate = () => {
    const nextRate = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    setRate(nextRate);
  };

  const isAllCached =
    packStatus.totalCount > 0 && packStatus.cachedCount >= packStatus.totalCount;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={cycleRate}
        className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
        title="تغيير سرعة القراءة الصوتية"
      >
        <span>السرعة: </span>
        <span className="font-mono text-emerald-700 dark:text-amber-400">{rate}x</span>
      </button>

      <button
        type="button"
        onClick={downloadOfflineVoicePack}
        disabled={packStatus.isDownloading || isAllCached}
        className={`min-h-[36px] px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
          isAllCached
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
            : packStatus.isDownloading
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
        }`}
        title="تنزيل الأصوات الطبيعية على جهازك لتعمل بدون إنترنت"
      >
        {packStatus.isDownloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              جاري حفظ الصوت أوفلاين ({packStatus.cachedCount}/{packStatus.totalCount})
            </span>
          </>
        ) : isAllCached ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>الصوت محفوظ أوفلاين ✓</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400 shrink-0" />
            <span>
              حفظ الصوت أوفلاين ({packStatus.cachedCount}/{packStatus.totalCount})
            </span>
          </>
        )}
      </button>

      {(activeId || loadingId) && (
        <button
          type="button"
          onClick={stop}
          className="min-h-[36px] px-2.5 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>إيقاف</span>
        </button>
      )}
    </div>
  );
};
