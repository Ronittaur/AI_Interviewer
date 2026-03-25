import "./globals.css";

export const metadata = {
  title: "AI Interviewer",
  description: "End to end AI application to interview candidates",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
