import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceNav } from "@/components/workspace-nav";
import { origin } from "@/lib/seo";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: "Toolroom — A little less busywork.",
    template: "%s · Toolroom",
  },
  description: "Focused online tools for images, websites and everyday work.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="workspace-body">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <WorkspaceNav />
        <main id="main">{children}</main>
        <footer>
          <div className="footer-top">
            <div>
              <Link href="/" className="brand">
                toolroom
              </Link>
              <p>Useful tools. Thoughtfully made.</p>
            </div>
            <div className="footer-links">
              <Link href="/tools">Explore tools</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/marketplace">Marketplace roadmap</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Toolroom</span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/copyright">Copyright</Link>
            </div>
            <span>Built for the work in front of you.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
