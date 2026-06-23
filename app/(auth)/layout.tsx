import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
        <Link href="/" className="text-lg font-bold text-slate-900 hover:opacity-80 transition-opacity">
          Clinica<span className="text-blue-600">AI</span>
        </Link>
      </header>
      <div className="pt-[61px]">{children}</div>
    </>
  );
}
