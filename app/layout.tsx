import type { Metadata } from "next";
import "./globals.css";
import "./forms.css";
export const metadata:Metadata={title:"ミッションビンゴ",description:"家族や友人と挑戦を集めて、写真と思い出を残すビンゴゲーム"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
