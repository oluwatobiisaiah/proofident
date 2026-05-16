"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: "always",
      retry: 1,
      staleTime: 0,
      gcTime: 0,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
