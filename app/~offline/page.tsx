import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline - OpenIPTV" };

/** Served by the service worker when the network is unreachable. */
export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 text-center p-6">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        OpenIPTV needs a network connection to stream channels. Your playlists and settings are saved locally and will
        be right here when you reconnect.
      </p>
    </div>
  );
}
