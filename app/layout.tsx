

import type { Metadata } from "next";
import LayoutWrapper from "./LayoutWrapper";
import { CheckoutProvider } from "./context/CheckOutContext";
import { AuthProvider } from "./context/AuthContext";
import GoogleMapsProvider from "@/provider/GoogleMapsProvider";
import { LoadingProvider } from "@/context/LoadingContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOB-Ecommerce",
  description: "Best online shop for all products",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0">
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
      </body>
    </html>
  );
}
