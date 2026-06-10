"use client";

interface ChannelNumberOverlayProps {
  value: string;
}

/** Big on-screen digits while typing a channel number on the remote. */
export function ChannelNumberOverlay({ value }: ChannelNumberOverlayProps) {
  if (!value) return null;

  return (
    <div className="fixed top-6 right-6 z-[60] px-5 py-3 rounded-xl bg-black/80 backdrop-blur-sm border border-white/10 animate-scale-in">
      <span className="text-4xl font-bold font-mono text-white tracking-widest">{value}</span>
    </div>
  );
}
