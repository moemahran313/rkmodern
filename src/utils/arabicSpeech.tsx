import React, { useState, useEffect } from 'react';
import { Volume2, Square, Loader2, Sparkles } from 'lucide-react';

export type SaudiVoiceGender = 'male' | 'female';

type SpeechListener = (
  activeId: string | null,
  loadingId: string | null,
  currentRate: number,
  voiceGender: SaudiVoiceGender
) => void;

const IDB_NAME = 'risk_cram_saudi_tts_db_v2';
const IDB_STORE = 'audio_clips';
const GENDER_STORAGE_KEY = 'risk_cram_saudi_voice_gender_v2';

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

async function getCachedAudio(
  cacheKey: string
): Promise<{ audioBase64: string; mimeType: string } | null> {
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

async function setCachedAudio(
  cacheKey: string,
  value: { audioBase64: string; mimeType: string }
): Promise<void> {
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
    }
  }

  public subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    listener(this.activeId, this.loadingId, this.rate, this.voiceGender);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) =>
      l(this.activeId, this.loadingId, this.rate, this.voiceGender)
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

  private formatForNaturalSaudiSpeech(textSegments: string[]): string {
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

  public async speak(id: string, textSegments: string[]) {
    if (this.activeId === id || this.loadingId === id) {
      this.stop();
      return;
    }

    this.stop();
    this.isCancelled = false;

    const cleanFullText = this.formatForNaturalSaudiSpeech(textSegments);
    if (!cleanFullText) return;

    const cacheKey = `${id}__${this.voiceGender}__v2`;
    this.loadingId = id;
    this.notify();

    try {
      // 1. Check IndexedDB offline cache first for instant playback
      let audioPayload = await getCachedAudio(cacheKey);

      // 2. If not cached yet, request Natural Saudi Voice from server-side Gemini 3.8 Flash TTS
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
        };

        if (!data.audioBase64) {
          throw new Error('Empty audio payload');
        }

        audioPayload = {
          audioBase64: data.audioBase64,
          mimeType: data.mimeType || 'audio/wav',
        };

        // Save in IndexedDB so it plays 100% offline next time
        await setCachedAudio(cacheKey, audioPayload);
      }

      if (this.isCancelled || this.loadingId !== id) {
        return;
      }

      // 3. Play the natural Saudi WAV audio via Blob URL for reliable mobile playback
      const byteCharacters = atob(audioPayload.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: audioPayload.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const audio = new Audio(blobUrl);
      audio.playbackRate = this.rate;
      this.currentAudio = audio;
      this.loadingId = null;
      this.activeId = id;
      this.notify();

      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        if (this.activeId === id) {
          this.activeId = null;
          this.currentAudio = null;
          this.notify();
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        if (this.activeId === id) {
          this.activeId = null;
          this.currentAudio = null;
          this.notify();
        }
      };

      await audio.play();
    } catch (err: unknown) {
      if (this.isCancelled) return;
      console.error('Gemini Saudi TTS error:', err);
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

  useEffect(() => {
    return speechManager.subscribe((id, loading, currentRate, gender) => {
      setActiveId(id);
      setLoadingId(loading);
      setRate(currentRate);
      setVoiceGender(gender);
    });
  }, []);

  return {
    activeId,
    loadingId,
    rate,
    voiceGender,
    speak: (id: string, segments: string[]) => speechManager.speak(id, segments),
    stop: () => speechManager.stop(),
    setRate: (r: number) => speechManager.setRate(r),
    setVoiceGender: (g: SaudiVoiceGender) => speechManager.setVoiceGender(g),
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
  const { rate, setRate, voiceGender, setVoiceGender, activeId, loadingId, stop } =
    useArabicSpeech();

  const cycleRate = () => {
    const nextRate = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    setRate(nextRate);
  };

  const toggleGender = () => {
    setVoiceGender(voiceGender === 'male' ? 'female' : 'male');
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={toggleGender}
        className="min-h-[36px] px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
        title="تغيير نوع الصوت"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400 shrink-0" />
        <span>
          {voiceGender === 'male' ? 'الصوت: رجالي' : 'الصوت: نسائي'}
        </span>
      </button>

      <button
        type="button"
        onClick={cycleRate}
        className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
        title="تغيير سرعة القراءة الصوتية"
      >
        <span>السرعة: </span>
        <span className="font-mono text-emerald-700 dark:text-amber-400">{rate}x</span>
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
