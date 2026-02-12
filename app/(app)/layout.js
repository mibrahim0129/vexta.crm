import AppHeader from "@/components/AppHeader";

export default function AppLayout({ children }) {
  return (
    <>
      <AppHeader />
      <div className="wrap" style={{ paddingTop: 18, paddingBottom: 40 }}>
        {children}
      </div>
    </>
  );
}
