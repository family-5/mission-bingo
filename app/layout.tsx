import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./forms.css";
export const metadata:Metadata={
  title:"ミッションビンゴ",
  description:"家族や友人と挑戦を集めて、写真と思い出を残すビンゴゲーム",
  manifest:"/mission-bingo/manifest.webmanifest",
  appleWebApp:{capable:true,statusBarStyle:"default",title:"ミッションビンゴ"},
  icons:{icon:"/mission-bingo/icons/icon-192.png",apple:"/mission-bingo/icons/icon-192.png"},
};
export const viewport:Viewport={themeColor:"#18a999",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
