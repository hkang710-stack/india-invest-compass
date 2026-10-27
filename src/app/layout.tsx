import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "인도 주별 투자 나침반",
  description: "진출 산업과 조건으로 인도 8개 주의 투자 환경을 비교하고 추천합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body>
        <nav className="topnav">
          <Link href="/" className="brand">
            인도 투자 나침반
          </Link>
          <span>
            <Link href="/">지도</Link>
            <Link href="/recommend">주 추천</Link>
          </span>
        </nav>
        {children}
      </body>
    </html>
  );
}
