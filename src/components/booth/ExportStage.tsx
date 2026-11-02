'use client';

import React, { useEffect, useState } from 'react';
import { useBoothStore } from '@/store/useBoothStore';
import { renderHighResPhotostrip } from '@/utils/canvasRenderer';
import { sounds } from '@/utils/audio';
import confetti from 'canvas-confetti';
import {
  Download,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const ExportStage: React.FC = () => {
  const {
    selectedFrame,
    photos,
    stickers,
    customBgColor,
    customFooterText,
    selectedFilter,
    finalExportUrl,
    setFinalExportUrl,
    resetBooth,
  } = useBoothStore();

  const [isPrinting, setIsPrinting] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // High-Res Render & Printing Animation
  useEffect(() => {
    let isMounted = true;

    async function generateExport() {
      try {
        sounds.playPrint();
        const dataUrl = await renderHighResPhotostrip({
          frame: selectedFrame,
          photos,
          stickers,
          customBgColor,
          customFooterText,
          filter: selectedFilter,
        });

        if (isMounted) {
          setFinalExportUrl(dataUrl);

          // Finish printing after 1.8s mechanical animation
          setTimeout(() => {
            if (isMounted) {
              setIsPrinting(false);
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#C92A2A', '#E5B869', '#E0533C', '#FCF5E8'],
              });
            }
          }, 1800);
        }
      } catch (err) {
        console.error('Failed to composite photostrip:', err);
        if (isMounted) setIsPrinting(false);
      }
    }

    generateExport();

    return () => {
      isMounted = false;
    };
  }, [
    selectedFrame,
    photos,
    stickers,
    customBgColor,
    customFooterText,
    selectedFilter,
    setFinalExportUrl,
  ]);

  // Handle Instant Download
  const handleDownload = () => {
    if (!finalExportUrl) return;
    const a = document.createElement('a');
    a.href = finalExportUrl;
    a.download = `inframe-photobooth-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle Automated Email Delivery Bot
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !finalExportUrl || isSendingEmail) return;

    setEmailSuccessMsg(null);
    setEmailErrorMsg(null);
    setIsSendingEmail(true);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          imageBase64: finalExportUrl,
          frameName: selectedFrame.name,
          takenAt: new Date().toLocaleString('en-US'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setEmailSuccessMsg(data.message || 'Photostrip successfully sent to your email!');
      setEmailInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'System communication error';
      setEmailErrorMsg(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-4 py-4 max-w-4xl mx-auto w-full">
      {/* Kiosk Printer Mechanical Feed Slot */}
      <div className="w-full max-w-md bg-theater-dark border-t-4 border-b-4 border-cinema-red rounded-lg p-2 text-center shadow-2xl relative mb-2">
        <div className="h-2 bg-black rounded-full shadow-inner mx-auto w-3/4 mb-1" />
        <span className="text-[10px] font-mono text-cinema-gold uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-cinema-ember animate-pulse" />
          <span>{isPrinting ? 'In Frame Kiosk Motor Printing...' : 'Print Ready • Keep It Candid'}</span>
        </span>
      </div>

      {/* Photostrip Ejection Paper Container */}
      <div className="relative flex items-center justify-center my-3 max-h-[50vh] overflow-hidden">
        {finalExportUrl ? (
          <div
            className={`transition-all duration-700 ease-out ${
              isPrinting ? 'animate-print-eject' : 'scale-100'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={finalExportUrl}
              alt="In Frame Photobooth Strip"
              className="max-h-[48vh] w-auto rounded-xl shadow-2xl border-2 border-theater-border"
            />
          </div>
        ) : (
          <div className="w-48 h-96 bg-theater-surface rounded-xl border-2 border-dashed border-theater-border flex flex-col items-center justify-center text-cinema-muted">
            <Loader2 className="w-8 h-8 animate-spin text-cinema-gold mb-2" />
            <span className="text-xs font-mono">Rendering High-Res...</span>
          </div>
        )}
      </div>

      {/* Action Controls & Email Bot Form */}
      {!isPrinting && (
        <div className="flex flex-col items-center gap-4 w-full max-w-md mt-2">
          {/* Instant Download PNG Button */}
          <button
            onClick={handleDownload}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cinema-red to-cinema-ember text-cinema-cream font-bold text-sm md:text-base shadow-xl shadow-cinema-red/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>Download Full-Res .PNG (1200px)</span>
          </button>

          {/* Email Bot Card (Vintage Ticket Form) */}
          <div className="w-full bg-theater-surface/90 border border-theater-border rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-cinema-gold" />
              <span className="text-xs font-bold font-mono text-cinema-cream uppercase tracking-wider">
                Send via In Frame Automated Bot 🎟️
              </span>
            </div>
            <p className="text-[11px] text-cinema-muted mb-3">
              Enter your email to receive your print-ready file directly in your inbox.
            </p>

            <form onSubmit={handleSendEmail} className="flex gap-2">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="yourname@domain.com"
                disabled={isSendingEmail}
                className="flex-1 bg-theater-dark border border-theater-border rounded-xl px-3.5 py-2.5 text-xs text-cinema-cream placeholder-cinema-muted/60 focus:outline-none focus:border-cinema-gold font-mono"
              />
              <button
                type="submit"
                disabled={isSendingEmail || !emailInput}
                className="px-4 py-2.5 rounded-xl bg-theater-elevated border border-cinema-gold/40 text-cinema-gold font-bold text-xs hover:bg-cinema-gold hover:text-theater-dark transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>

            {/* Email Success Feedback */}
            {emailSuccessMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            {/* Email Error Feedback */}
            {emailErrorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{emailErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Reset Kiosk Button */}
          <button
            onClick={resetBooth}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-cinema-muted hover:text-cinema-cream transition-colors mt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start New Photo Session ↺</span>
          </button>
        </div>
      )}
    </div>
  );
};
