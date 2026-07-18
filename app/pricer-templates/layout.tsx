import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Pricer UI Template Studio",
  description: "Load, visualize, edit, and compare PricerUITemplate JSON files.",
};

// Applied before paint to avoid a flash of the wrong theme when entering the
// Pricer Templates feature. Mirrors the logic in ThemeProvider/lib/theme.
const noFlash = `(function(){try{
  var c = localStorage.getItem('pricer-theme') || 'system';
  var dark = ['midnight','ocean','nord'];
  var id = c === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'daylight')
    : c;
  var root = document.documentElement;
  root.setAttribute('data-theme', id);
  if (dark.indexOf(id) > -1) root.classList.add('dark');
}catch(e){}})();`;

export default function PricerTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      {children}
    </ThemeProvider>
  );
}
