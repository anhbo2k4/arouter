import DocsPage from "../_components/DocsPage";

export const metadata = {
  title: "ARouter Docs - CLI Tool Setup Guides",
  description: "Step-by-step instructions to connect Claude Code, Codex CLI, Cursor, Continue, and more to ARouter.",
  alternates: {
    canonical: "https://arouter.alterdev.site/docs",
  },
  openGraph: {
    title: "ARouter Docs - CLI Tool Setup Guides",
    description: "Connect your favorite coding tools to ARouter with one endpoint and step-by-step setup guides.",
    url: "https://arouter.alterdev.site/docs",
    siteName: "ARouter",
  },
};

export default function DocsRoutePage() {
  return <DocsPage />;
}
