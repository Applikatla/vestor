import "./globals.css";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ToastProvider } from "../components/Toast";
import { Web3Provider } from "../context/Web3Context";

export const metadata = {
  title: "InventoryCredit | Institutional Warehouse Asset Tokenization & Settlement",
  description:
    "Enterprise RWA credit facility and continuous settlement desk deployed on Whitechain Sepolia (Chain ID: 1874).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
        <ToastProvider>
          <Web3Provider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <Footer />
          </Web3Provider>
        </ToastProvider>
      </body>
    </html>
  );
}
