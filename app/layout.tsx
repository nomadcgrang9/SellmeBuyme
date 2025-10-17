import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "셀미바이미 - 교육 인력 매칭 플랫폼",
  description: "학교와 강사를 연결하는 AI 기반 매칭 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
