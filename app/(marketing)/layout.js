import SiteHeader from "@/components/SiteHeader";
import Footer from "@/app/components/Footer"; // keep your existing Footer path

export default function MarketingLayout({ children }) {
  return (
    <>
      <SiteHeader />
      {children}
      <Footer />
    </>
  );
}
