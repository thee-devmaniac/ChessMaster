import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Trainer",
  description: "Review your games and learn from your mistakes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
