import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--miro-font-family",
});

export const metadata: Metadata = {
  title: "ETH Treasury Staking Automation",
  description: "Operator backoffice for DVT, approvals, rewards, and audit.",
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{props.children}</body>
    </html>
  );
}
