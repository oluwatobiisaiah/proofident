import type { Metadata } from "next";
import { Montserrat, Inter, PT_Serif } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./Providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const ptserif = PT_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ptserif",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Proofident",
  description: "Unfragmenting Nigeria's informal economy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={cn(
        "h-full",
        "antialiased",
        montserrat.variable,
        inter.variable,
        ptserif.variable,
      )}
    >
      <body className='min-h-full flex flex-col'>
        <Providers>
           <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
      {/* <Toaster position="top-right" closeButton richColors={false} /> */}
    </html>
  );
}
