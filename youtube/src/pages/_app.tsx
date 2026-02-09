import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import { UserProvider, useUser } from "../lib/AuthContext";
import { ThemeProvider } from "../lib/ThemeContext";
import type { AppProps } from "next/app";

type AppContentProps = Pick<AppProps, "Component" | "pageProps">;

function AppContent({ Component, pageProps }: AppContentProps) {
  const { theme } = useUser();
  
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-background text-foreground transition-colors duration-300`}>
      <Header />
      <Toaster />
      <div className="flex">
        <Sidebar />
        <Component {...pageProps} />
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ThemeProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </ThemeProvider>
    </UserProvider>
  );
}
