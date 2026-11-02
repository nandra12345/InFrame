'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useBoothStore } from '@/store/useBoothStore';
import { CandidFilter, TrackingEffect, DetectedFace } from '@/types/booth';
import { sounds } from '@/utils/audio';
import {
  MultiFaceTracker,
  trackingEffectsList,
  drawTrackingOnCanvas,
} from '@/utils/faceTracker';
import {
  Camera,
  FlipHorizontal,
  Timer,
  Sparkles,
  Upload,
  RefreshCw,
  ArrowRight,
  Zap,
  Image as ImageIcon,
  Smile,
  Film,
  Users,
} from 'lucide-react';

export const filterPresets: {
  id: CandidFilter;
  name: string;
  author: string;
  badge: string;
  cssFilter: string;
}[] = [
  {
    id: 'cpm35',
    name: 'CPM35',
    author: 'by simxmargo',
    badge: 'CPM35',
    cssFilter: 'contrast(1.15) brightness(1.08) saturate(1.05) sepia(0.08) hue-rotate(-5deg)',
  },
  {
    id: 'blur-gabiiidd',
    name: 'blur',
    author: 'de gabiiidd',
    badge: 'blur',
    cssFilter: 'contrast(1.05) brightness(1.12) saturate(1.15) sepia(0.12) hue-rotate(-8deg)',
  },
  {
    id: 'diffusion-ii',
    name: 'Diffusion II',
    author: 'by _johnmarknavarro',
    badge: 'Diffusion II',
    cssFilter: 'contrast(0.95) brightness(1.15) saturate(0.85) sepia(0.15) hue-rotate(20deg)',
  },
  {
    id: 'light-grunge',
    name: 'Light grunge',
    author: 'by leuvxse',
    badge: 'Light grunge',
    cssFilter: 'contrast(1.35) brightness(0.92) saturate(1.18) sepia(0.25) hue-rotate(-12deg)',
  },
  {
    id: 'noir-classic',
    name: 'Noir B&W',
    author: 'Classic Monochrome',
    badge: 'Noir B&W',
    cssFilter: 'grayscale(1) contrast(1.30) brightness(0.96)',
  },
  {
    id: 'warm-candid',
    name: 'Warm 35mm',
    author: 'In Frame Candid',
    badge: 'Warm 35mm',
    cssFilter: 'sepia(0.18) saturate(1.15) contrast(1.08) brightness(1.02)',
  },
  {
    id: 'none',
    name: 'Raw Natural',
    author: 'Unfiltered',
    badge: 'Raw',
    cssFilter: 'none',
  },
];

export const CameraStage: React.FC = () => {
  const {
    selectedFrame,
    photos,
    activeSlot,
    isMirror,
    countdownDuration,
    isContinuous,
    selectedFilter,
    selectedTracking,
    setPhoto,
    setActiveSlot,
    toggleMirror,
    setCountdownDuration,
    toggleContinuous,
    setSelectedFilter,
    setSelectedTracking,
    loadDemoPhotos,
    setStep,
  } = useBoothStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<MultiFaceTracker>(new MultiFaceTracker());

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownVal, setCountdownVal] = useState<number>(3);
  const [isFlashing, setIsFlashing] = useState(false);
  const [activeTab, setActiveTab] = useState<'filter' | 'tracking'>('filter');
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);

  const cutCount = selectedFrame.cutCount;
  const takenPhotosCount = Object.keys(photos).length;
  const isAllPhotosTaken = takenPhotosCount >= cutCount;

  // Initialize WebRTC Media Stream
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
      setCameraError(null);
    } catch (err: unknown) {
      console.warn('WebRTC camera error:', err);
      setHasCameraPermission(false);
      setCameraError(
        'Camera not detected or permission denied. You can upload photos or use high-res demo mode.'
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Real-time Multi-Face Tracking Animation Loop
  useEffect(() => {
    let animId: number;
    let isCancelled = false;

    const trackLoop = async () => {
      if (isCancelled) return;

      const video = videoRef.current;
      const canvas = liveCanvasRef.current;
      const fallbackCanvas = fallbackCanvasRef.current;

      if (video && video.readyState >= 2 && canvas) {
        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;

        if (canvas.width !== vW || canvas.height !== vH) {
          canvas.width = vW;
          canvas.height = vH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, vW, vH);

          // Detect multiple faces
          if (selectedTracking !== 'none') {
            const faces = await trackerRef.current.detectFaces(
              video,
              fallbackCanvas || undefined
            );
            setDetectedFaces(faces);

            // Draw tracking elements on canvas overlay
            drawTrackingOnCanvas(ctx, selectedTracking, faces, vW, vH, isMirror);
          }
        }
      }

      animId = requestAnimationFrame(trackLoop);
    };

    animId = requestAnimationFrame(trackLoop);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
    };
  }, [selectedTracking, isMirror]);

  // Capture single frame from live video with filter & multi-face tracking baked in
  const takeSnapshot = useCallback(
    (targetSlot: number) => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const W = video.videoWidth || 1280;
      const H = video.videoHeight || 720;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Apply 1:1 Color Filter
      const activeFilter = filterPresets.find((f) => f.id === selectedFilter);
      if (activeFilter && activeFilter.cssFilter !== 'none') {
        ctx.filter = activeFilter.cssFilter;
      }

      ctx.save();
      if (isMirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Reset filter for sharp overlay graphics
      ctx.filter = 'none';

      // Bake face tracking effect on all detected faces
      if (selectedTracking !== 'none' && detectedFaces.length > 0) {
        drawTrackingOnCanvas(ctx, selectedTracking, detectedFaces, W, H, isMirror);
      }

      const dataUrl = canvas.toDataURL('image/png', 0.95);

      // Sound & Screen Flash
      sounds.playShutter();
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 250);

      // Save to state store
      setPhoto(targetSlot, dataUrl);

      // Continuous auto advance
      if (isContinuous && targetSlot < cutCount) {
        setActiveSlot(targetSlot + 1);
        setTimeout(() => {
          runCountdown(targetSlot + 1);
        }, 1200);
      } else if (targetSlot >= cutCount) {
        setTimeout(() => {
          setStep('STEP_FRAME');
        }, 1000);
      }
    },
    [isMirror, isContinuous, cutCount, selectedFilter, selectedTracking, detectedFaces, setPhoto, setActiveSlot, setStep]
  );

  // Trigger Countdown sequence
  const runCountdown = useCallback(
    (slotToCapture: number) => {
      setIsCountingDown(true);
      let count = countdownDuration;
      setCountdownVal(count);
      sounds.playBeep(false);

      const timer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownVal(count);
          sounds.playBeep(false);
        } else {
          clearInterval(timer);
          setIsCountingDown(false);
          sounds.playBeep(true);
          takeSnapshot(slotToCapture);
        }
      }, 1000);
    },
    [countdownDuration, takeSnapshot]
  );

  const handleShutterClick = () => {
    if (isCountingDown) return;
    runCountdown(activeSlot);
  };

  // Upload Photo fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto(activeSlot, dataUrl);
      if (activeSlot < cutCount) {
        setActiveSlot(activeSlot + 1);
      } else {
        setStep('STEP_FRAME');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUseDemoPhotos = () => {
    loadDemoPhotos();
    setStep('STEP_FRAME');
  };

  const activeFilterObj = filterPresets.find((f) => f.id === selectedFilter) || filterPresets[0];

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-3 py-2 max-w-5xl mx-auto w-full">
      {/* Screen Xenon Flash Strobe */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none animate-shutter-flash" />
      )}

      {/* Hidden offscreen canvas for computer vision downsampling */}
      <canvas ref={fallbackCanvasRef} className="hidden" />

      {/* Top Header & Slot Indicator */}
      <div className="flex items-center justify-between w-full mb-1.5 px-1">
        <button
          onClick={() => setStep('STEP_LAYOUT')}
          className="text-xs font-mono text-cinema-muted hover:text-cinema-cream transition-colors"
        >
          ← Change Format
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cinema-gold uppercase tracking-wider">
            Pose #{activeSlot} of {cutCount}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: cutCount }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  photos[i + 1]
                    ? 'bg-cinema-gold shadow-[0_0_8px_#E5B869]'
                    : activeSlot === i + 1
                    ? 'bg-cinema-ember animate-pulse'
                    : 'bg-theater-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Viewport & Live Stream Area */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/10] max-h-[54vh] bg-black rounded-3xl overflow-hidden border-2 border-theater-border shadow-2xl flex items-center justify-center">
        {/* WebRTC Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transition-all duration-300"
          style={{
            transform: isMirror ? 'scaleX(-1)' : 'none',
            filter: activeFilterObj.cssFilter,
          }}
        />

        {/* Real-time Multi-Face Tracking Overlay Canvas */}
        <canvas
          ref={liveCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20"
        />

        {/* Camera Error / Permission Fallback */}
        {hasCameraPermission === false && (
          <div className="absolute inset-0 bg-theater-dark/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <Camera className="w-12 h-12 text-cinema-ember mb-3 opacity-80" />
            <p className="text-cinema-cream font-bold mb-1">Camera Access Inactive</p>
            <p className="text-cinema-muted text-xs max-w-sm mb-4">{cameraError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-cinema-red text-cinema-cream text-xs font-bold hover:bg-cinema-ember transition-colors inline-flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
              </button>
              <button
                onClick={handleUseDemoPhotos}
                className="px-4 py-2 rounded-full bg-theater-elevated border border-cinema-gold text-cinema-gold text-xs font-bold hover:bg-cinema-gold hover:text-theater-dark transition-colors inline-flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Use Demo Photos 📸</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Active Filter Card Badge (Exact TikTok / Instagram Style) */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-cinema-cream shadow-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cinema-gold animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold font-mono leading-tight">{activeFilterObj.badge}</span>
              <span className="text-[9px] text-zinc-400 font-sans leading-none">{activeFilterObj.author}</span>
            </div>
          </div>

          {selectedTracking !== 'none' && (
            <div className="px-2.5 py-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-cinema-gold/40 text-cinema-gold text-xs font-mono shadow-xl flex items-center gap-1.5">
              <span>{trackingEffectsList.find((t) => t.id === selectedTracking)?.icon}</span>
              <Users className="w-3 h-3 text-cinema-gold" />
              <span className="text-[10px] font-bold">Multi-Face AR</span>
            </div>
          )}
        </div>

        {/* Big Countdown Overlay */}
        {isCountingDown && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <span className="text-8xl md:text-9xl font-extrabold text-cinema-gold animate-ping font-mono drop-shadow-[0_0_30px_#E5B869]">
              {countdownVal}
            </span>
          </div>
        )}

        {/* Viewfinder Corners */}
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-lg pointer-events-none" />
        <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg pointer-events-none" />
      </div>

      {/* Filter & Face AR Overlay Suite Navigation */}
      <div className="w-full mt-2 bg-theater-surface/85 rounded-2xl border border-theater-border p-1.5 backdrop-blur-md">
        {/* Tab Toggle: Authentic TikTok Filters vs Multi-Face Tracking */}
        <div className="flex items-center justify-between border-b border-theater-border/60 pb-1.5 mb-1 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('filter')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono transition-all ${
                activeTab === 'filter'
                  ? 'bg-cinema-ember text-cinema-cream font-bold shadow-md shadow-cinema-ember/30'
                  : 'text-cinema-muted hover:text-cinema-cream'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Viral Filters (1:1 Composition)</span>
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono transition-all ${
                activeTab === 'tracking'
                  ? 'bg-cinema-ember text-cinema-cream font-bold shadow-md shadow-cinema-ember/30'
                  : 'text-cinema-muted hover:text-cinema-cream'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Multi-Face AR Tracking</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-cinema-gold hidden sm:inline">
            {activeTab === 'filter' ? activeFilterObj.name : selectedTracking}
          </span>
        </div>

        {/* Tab Content: Filters matching assets/filter */}
        {activeTab === 'filter' && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 w-full no-scrollbar">
            {filterPresets.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`flex flex-col text-left px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 border ${
                  selectedFilter === f.id
                    ? 'bg-theater-elevated text-cinema-gold border-cinema-gold shadow-md scale-105'
                    : 'bg-theater-dark/80 text-cinema-muted border-theater-border hover:text-cinema-cream'
                }`}
              >
                <span className="font-bold">{f.badge}</span>
                <span className="text-[9px] opacity-70 leading-none">{f.author}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab Content: Multi-Face Tracking Overlays from assets/tracking cam */}
        {activeTab === 'tracking' && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 w-full no-scrollbar">
            {trackingEffectsList.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTracking(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                  selectedTracking === t.id
                    ? 'bg-theater-elevated text-cinema-gold border-cinema-gold shadow-md scale-105'
                    : 'bg-theater-dark/80 text-cinema-muted border-theater-border hover:text-cinema-cream'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <div className="flex flex-col text-left">
                  <span className="font-bold leading-tight">{t.label}</span>
                  <span className="text-[9px] opacity-70 leading-none">{t.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls & Shutter Bar */}
      <div className="flex items-center justify-between w-full mt-2 px-3 py-2 rounded-2xl bg-theater-surface/90 border border-theater-border backdrop-blur-md">
        {/* Left: Mirror & Timer */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMirror}
            title="Mirror Camera"
            className={`p-2.5 rounded-xl border transition-colors ${
              isMirror
                ? 'bg-theater-elevated border-cinema-gold/40 text-cinema-gold'
                : 'bg-theater-dark border-theater-border text-cinema-muted hover:text-cinema-cream'
            }`}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const next = countdownDuration === 3 ? 5 : countdownDuration === 5 ? 10 : 3;
              setCountdownDuration(next);
            }}
            title="Countdown Duration"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-theater-dark border border-theater-border text-cinema-cream text-xs font-mono hover:border-cinema-gold/40 transition-colors"
          >
            <Timer className="w-3.5 h-3.5 text-cinema-gold" />
            <span>{countdownDuration}s</span>
          </button>

          <button
            onClick={toggleContinuous}
            title="Auto Continuous Sequence"
            className={`hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-mono transition-colors ${
              isContinuous
                ? 'bg-theater-elevated border-cinema-gold text-cinema-gold'
                : 'bg-theater-dark border-theater-border text-cinema-muted'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto</span>
          </button>
        </div>

        {/* Center: Tactile Shutter */}
        <div className="relative">
          <button
            onClick={handleShutterClick}
            disabled={isCountingDown}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-cinema-red border-4 border-white shadow-lg shadow-cinema-red/50 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            <div className="w-7 h-7 rounded-full bg-cinema-cream shadow-inner" />
          </button>
        </div>

        {/* Right: Upload & Advance */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload from Gallery"
            className="p-2.5 rounded-xl bg-theater-dark border border-theater-border text-cinema-muted hover:text-cinema-cream transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={handleUseDemoPhotos}
            title="Use Demo Photos"
            className="p-2.5 rounded-xl bg-theater-dark border border-theater-border text-cinema-gold hover:text-cinema-cream transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {isAllPhotosTaken && (
            <button
              onClick={() => setStep('STEP_FRAME')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cinema-red to-cinema-ember text-cinema-cream font-bold text-xs shadow-md shadow-cinema-red/30 hover:scale-105 transition-all"
            >
              <span>Frame</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mini-Preview Slots */}
      <div className="flex items-center justify-center gap-2.5 mt-2.5 w-full">
        {Array.from({ length: cutCount }).map((_, idx) => {
          const slotNum = idx + 1;
          const photoUrl = photos[slotNum];
          const isActive = activeSlot === slotNum;

          return (
            <div
              key={slotNum}
              onClick={() => setActiveSlot(slotNum)}
              className={`group relative w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'border-cinema-gold shadow-md shadow-cinema-gold/30 scale-105'
                  : photoUrl
                  ? 'border-cinema-ember/60'
                  : 'border-theater-border bg-theater-surface'
              }`}
            >
              {photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={`Pose ${slotNum}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <RefreshCw className="w-4 h-4 text-cinema-cream" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-cinema-muted text-xs font-mono">
                  <span>#{slotNum}</span>
                </div>
              )}
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/60 text-cinema-cream">
                {slotNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
