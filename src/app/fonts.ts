import { Inter, Playfair_Display } from "next/font/google";

export const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
