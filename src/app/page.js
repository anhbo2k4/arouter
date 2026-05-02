import CheckUsageHomePage from "./_components/CheckUsageHomePage";

export const metadata = {
  title: "ARouter - AI Token Distribution Platform",
  description: "Mua token AI theo tuần. Check usage ngay không cần đăng nhập.",
  alternates: {
    canonical: "https://arouter.alterdev.site/",
  },
  openGraph: {
    title: "ARouter - Token API Platform",
    description: "Mua token AI theo tuần. Check usage ngay không cần đăng nhập.",
    url: "https://arouter.alterdev.site/",
    siteName: "ARouter",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ARouter weekly token plans",
      },
    ],
  },
};

const productStructuredData = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "ARouter Weekly Token Plans",
  description: "AI token distribution platform powered by ARouter",
  offers: [
    { "@type": "Offer", name: "Starter", price: "200000", priceCurrency: "VND" },
    { "@type": "Offer", name: "Popular", price: "400000", priceCurrency: "VND" },
    { "@type": "Offer", name: "Power", price: "1000000", priceCurrency: "VND" },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }} />
      <CheckUsageHomePage />
    </>
  );
}
