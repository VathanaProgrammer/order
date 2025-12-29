

import type { Metadata } from "next";
import LayoutWrapper from "./LayoutWrapper";
import { CheckoutProvider } from "./context/CheckOutContext";
import { AuthProvider } from "./context/AuthContext";
import GoogleMapsProvider from "@/provider/GoogleMapsProvider";
import { LoadingProvider } from "@/context/LoadingContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import { Koulen } from 'next/font/google';

export const metadata: Metadata = {
  title: "SOB-Ecommerce",
  description: "Best online shop for all products",
};

const koulen = Koulen({
  weight: '400',
  subsets: ['khmer'],
  display: 'swap',
  variable: '--font-koulen',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" className={`h-full ${koulen.variable}`}>
      <body className="h-full m-0">
        <LanguageProvider>
        <GoogleMapsProvider>
          <AuthProvider>
            <CheckoutProvider>
              <LoadingProvider>
                <LayoutWrapper>{children}</LayoutWrapper>

                {/* ✅ Toastify container (instead of Toaster) */}
                <ToastContainer
                  position="top-center"
                  autoClose={2500}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  pauseOnHover
                  draggable
                  theme="colored"
                />
              </LoadingProvider>
            </CheckoutProvider>
          </AuthProvider>
        </GoogleMapsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
