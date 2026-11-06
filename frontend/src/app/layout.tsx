import "./globals.css";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ToastProvider } from "../components/Toast";
import { Web3Provider } from "../context/Web3Context";

export const metadata = {
  title: "VESTOR | Institutional Real World Asset (RWA) Tokenization & Settlement on Whitechain",
  description:
    "Institutional RWA credit facility and continuous settlement desk deployed on Whitechain Sepolia (Chain ID: 1874).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white overflow-x-hidden">
        <ToastProvider>
          <Web3Provider>
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
              {children}
            </main>
            <Footer />
          </Web3Provider>
        </ToastProvider>
      </body>
    </html>
  );
}
