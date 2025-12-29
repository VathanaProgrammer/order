"use client";

import { IconProvider } from "@/context/IconContext";
import { usePathname } from "next/navigation";
import TopNav from "@/components/layouts/TopNav";
import BottomNav from "@/components/layouts/BottomNav";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const noTopBarRoutes = [
    "/checkout",
    "/sign-up",
    "/sign-in",
    "/checkout/payment",
    "/checkout/review",
    "/checkout/success",
    "/account",
    "/verify-otp",
    "/checkout/address",
    '/account/shipping-address',
    '/checkout/order-success',
    '/account/reward',
    '/account/edit-profile'
  ];

  const hideTopBar = noTopBarRoutes.includes(pathname);

  const noBottomBarRoutes = ["/verify-otp", "/sign-in", "/sign-up" ];
  const hideBottomBar = noBottomBarRoutes.includes(pathname);

  return (
    <IconProvider value={{ width: 32, height: 32, color: "blue" }}>
      <div className="flex justify-center items-center h-full bg-gray-200 m-0 p-0">
        <div className="relative p-6 w-full h-full max-w-[430px] bg-white shadow-xl overflow-hidden flex flex-col">
          {!hideTopBar && <TopNav />}
          <main className="flex-1 overflow-auto hide-scrollbar">
            {children}
          </main>
          {!hideBottomBar && <BottomNav />}
        </div>
      </div>
    </IconProvider>
  );
}
