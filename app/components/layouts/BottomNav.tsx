"use client";

import Icon from "../Icon";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/context/CheckOutContext";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";

const BottomNav: React.FC = () => {
  const router = useRouter();
  const {
    total,
    placeOrder,
    placeOrderWithCustomerInfo, // NEW: Get the new function
    placeRewardOrder,
    cart,
    rewards,
    paymentMethod,
    selectedAddress,
    customerInfo, // NEW: Get customer info for validation
  } = useCheckout();
  const [activePage, setActivePage] = useState<"home" | "chat">("home");
  const { t } = useLanguage();

  const { user } = useAuth();
  const pathname = usePathname();
  const isCheckoutPage = pathname === "/checkout";

  const isCartEmpty = cart.length === 0 && rewards.length === 0;
  const isPaymentMissing = !paymentMethod;
  const isAddressMissing = !selectedAddress;
  
  // NEW: Check if customer info is complete
  const isCustomerInfoIncomplete = () => {
    if (user?.role === "sale") {
      // For sale users: customer name, phone, and coordinates are required
      return !customerInfo?.name?.trim() || 
             !customerInfo?.phone?.trim() || 
             !customerInfo?.coordinates;
    } else {
      // For regular users: name and coordinates are required, phone is optional if in account
      const hasPhone = customerInfo?.phone?.trim() || user?.phone || user?.mobile;
      return !customerInfo?.name?.trim() || 
             !customerInfo?.coordinates ||
             !hasPhone;
    }
  };

  const formatPrice = (value: number) =>
    typeof value !== "number" || isNaN(value) ? "$0.00" : `$${value.toFixed(2)}`;

  const handleClickCheckout = async () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (isCheckoutPage) {
      const errors: string[] = [];
      
      // Basic validation
      if (cart.length > 0 && rewards.length > 0) {
        errors.push("Cannot mix products and rewards!");
      }
      if (cart.length === 0 && rewards.length === 0) {
        errors.push(t.yourCartIsEmpty);
      }
      if (isPaymentMissing) {
        errors.push(t.pleaseSelectAPaymentMethod);
      }
      if (user?.role !== "sale" && isAddressMissing) {
        errors.push(t.pleaseSelectAShippingAddress);
      }
      
      // NEW: Customer info validation
      if (isCustomerInfoIncomplete()) {
        if (user?.role === "sale") {
          if (!customerInfo?.name?.trim()) errors.push("Please enter customer name");
          if (!customerInfo?.phone?.trim()) errors.push("Please enter customer phone");
        } else {
          if (!customerInfo?.name?.trim()) errors.push("Please enter your name");
          if (!customerInfo?.phone?.trim() && !(user?.phone || user?.mobile)) {
            errors.push("Please enter your phone number");
          }
        }
        if (!customerInfo?.coordinates) {
          errors.push("Please select a location on the map");
        }
      }

      if (errors.length > 0) {
        errors.forEach((err) => toast.error(err));
        return;
      }

      try {
        // For reward orders, use the original function
        if (rewards.length > 0) {
          await placeRewardOrder?.();
        } 
        // For regular orders with customer info, use the new function
        else if (cart.length > 0) {
          await placeOrderWithCustomerInfo?.();
        }
      } catch (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to place order. Please try again.");
      }
    } else {
      router.push("/checkout");
    }
  };

  const handleChatRedirect = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/telegram-link`,
        { withCredentials: true }
      );
  
      if (res.data?.telegram_link) {
        window.location.href = res.data.telegram_link;
      } else {
        toast.error("Telegram link not found!");
      }
    } catch (error) {
      toast.error("Failed to open Telegram chat");
    }
  };

  const iconColor = (page: "home" | "chat") =>
    activePage === page ? "#1E40AF" : "#6B7280";

  // Page translations mapping
  const getPageName = (page: string) => {
    const pageTranslations: Record<string, string> = {
      home: t.home || "Home",
      chat: t.chat || "Chat",
    };
    return pageTranslations[page] || page.charAt(0).toUpperCase() + page.slice(1);
  };

  // Show warning if customer info is incomplete
  const showCustomerInfoWarning = isCheckoutPage && isCustomerInfoIncomplete();

  return (
    <section className="flex items-center justify-between my-2">
      <div className="flex items-center gap-4">
        {["home", "chat"].map((page) => (
          <div
            key={page}
            onClick={() => {
              if (page === "chat") {
                handleChatRedirect();
                return;
              }
              router.push(`/${page === "home" ? "" : page}`);
              setActivePage(page as "home" | "chat");
            }}
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Icon
              icon={
                page === "home"
                  ? "solar:home-2-linear"
                  : page === "chat"
                  ? "solar:chat-dots-linear"
                  : "lets-icons:order-light"
              }
              width={24}
              height={24}
              style={{ color: iconColor(page as "home" | "chat") }}
            />
            <p
              className="text-[13px] font-medium"
              style={{ color: iconColor(page as "home" | "chat") }}
            >
              {getPageName(page)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center">
        <p className="text-[17px] font-semibold leading-none">{formatPrice(total)}</p>
        <p className="text-[13px] leading-none pt-1 text-gray-500">{t.total}</p>
        
        {/* NEW: Show warning if customer info is incomplete */}
        {showCustomerInfoWarning && (
          <p className="text-xs text-red-500 mt-1 text-center max-w-[120px]">
            Complete customer info
          </p>
        )}
      </div>

      <button
        onClick={handleClickCheckout}
        disabled={isCartEmpty}
        className={`border rounded-[8px] px-6 py-3 font-semibold shadow-sm transition ${
          isCartEmpty 
            ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
            : "bg-[#1E40AF] text-white hover:opacity-80 active:scale-95"
        }`}
      >
        {t.checkout}
      </button>
    </section>
  );
};

export default BottomNav;