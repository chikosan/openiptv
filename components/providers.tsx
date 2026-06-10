"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { RemindersWatcher } from "@/components/epg/reminders-watcher";
import { ThemeApplier } from "@/components/theme-applier";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeApplier />
        <RemindersWatcher />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
