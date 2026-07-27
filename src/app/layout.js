import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata = {
  title: "GitLab Pipeline Trigger",
  description: "Trigger GitLab CI pipelines and watch their status live.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
