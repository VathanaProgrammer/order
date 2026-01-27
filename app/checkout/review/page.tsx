"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/layouts/Header";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/context/CheckOutContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const ReviewPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, total, selectedAddress, currentAddress, paymentMethod, placeOrder } = useCheckout();
  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL!;
  
  // State to track customer info (if entered in checkout page)
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    phone: string;
    addressDetails: string;
    coordinates?: { lat: number; lng: number };
  } | null>(null);

  // Try to get customer info from localStorage or session
  useEffect(() => {
    if (user?.role === "sale") {
      const savedCustomerInfo = localStorage.getItem("customerInfo");
      if (savedCustomerInfo) {
        try {
          setCustomerInfo(JSON.parse(savedCustomerInfo));
        } catch (e) {
          console.error("Failed to parse customer info", e);
        }
      }
    }
  }, [user]);

  const address = selectedAddress === "current" ? currentAddress : selectedAddress;

  const handlePlaceOrder = () => {
    // For sale role, check if customer info is available
    if (user?.role === "sale") {
      if (!customerInfo) {
        toast.error("Customer information is missing. Please go back to checkout.");
        return;
      }
      
      if (!customerInfo.name || !customerInfo.phone || !customerInfo.addressDetails || !customerInfo.coordinates) {
        toast.error("Customer information is incomplete");
        return;
      }
      
      // Call placeOrder with customer info
      placeOrder({
        name: customerInfo.name,
        phone: customerInfo.phone,
        addressDetails: customerInfo.addressDetails,
        coordinates: customerInfo.coordinates,
      });
      
      // Clear customer info after order
      localStorage.removeItem("customerInfo");
    } else {
      // For regular users
      if (!selectedAddress) {
        toast.error("Please select a shipping address");
        return;
      }
      
      placeOrder();
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 ">
      <Header title="Checkout" />

      <h2 className="text-2xl font-bold text-gray-800 text-start">Review Your Order</h2>

      {/* For sale role: Show customer info */}
      {user?.role === "sale" && customerInfo && (
        <div className="flex flex-col gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-lg text-gray-700">Customer Information</p>
            <button
              className="text-blue-600 text-sm hover:underline"
              onClick={() => router.push("/checkout")}
            >
              Edit
            </button>
          </div>
          <div className="text-gray-500 text-sm space-y-1">
            <p className="text-m font-medium">Name: {customerInfo.name}</p>
            <p className="text-m font-medium">Phone: {customerInfo.phone}</p>
            <p className="text-m font-medium">Address: {customerInfo.addressDetails}</p>
            {customerInfo.coordinates && (
              <p className="text-xs text-gray-400">
                Location: {customerInfo.coordinates.lat.toFixed(5)}, {customerInfo.coordinates.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex flex-col gap-3">
        {cart.length > 0 ? (
          cart.map(item => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-300 p-4">
              <div className="flex items-center gap-4">
                <img 
                  src={item.image && item.image.trim() ? IMAGE_URL + item.image : "https://syspro.asia/img/default.png"} 
                  alt={item.title} 
                  className="w-16 h-16 object-cover rounded-lg" 
                />
                <div>
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  <p className="text-md text-gray-500">x {item.qty}</p>
                </div>
              </div>
              <p className="font-semibold text-gray-800">
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
          ))
        ) : (
          <p className="p-4 text-gray-500">Your cart is empty</p>
        )}
      </div>

      {/* Shipping Address Display - For regular users only */}
      {user?.role !== "sale" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-lg text-gray-700">Shipping Address</p>
            <button
              className="text-blue-600 text-sm hover:underline"
              onClick={() => router.push("/checkout/shipping")}
            >
              Edit
            </button>
          </div>

          <div className="text-gray-500 text-sm space-y-1 border-b border-gray-300 pb-4">
            {address ? (
              <>
                {/* Label */}
                <p className="text-m font-medium">{address.label}</p>

                {/* Details */}
                {address.details && (
                  <p className="text-m font-medium">{address.details}</p>
                )}

                {/* Phone */}
                {address.phone && (
                  <p className="text-m font-medium">Phone: {address.phone}</p>
                )}
              </>
            ) : (
              <p className="text-gray-500">No address selected</p>
            )}
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div className="flex flex-col gap-3 border-b border-gray-300 pb-4">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-lg text-gray-700">Payment Method</p>
          <button
            className="text-blue-600 text-sm hover:underline"
            onClick={() => router.push("/checkout/payment")}
          >
            Edit
          </button>
        </div>
        <p className="text-gray-500 text-md font-medium">{paymentMethod}</p>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center rounded-xl font-semibold text-gray-800 text-lg">
        <p>Total</p>
        <p>${total.toFixed(2)}</p>
      </div>

      {/* Validation message for sale role */}
      {user?.role === "sale" && !customerInfo && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            Customer information is missing. Please go back to checkout page to enter customer details.
          </p>
          <button
            onClick={() => router.push("/checkout")}
            className="mt-2 text-blue-600 text-sm hover:underline"
          >
            Go to Checkout
          </button>
        </div>
      )}

      {/* Place Order Button */}
      <div className="mt-auto">
        <button
          onClick={handlePlaceOrder}
          disabled={user?.role === "sale" && !customerInfo}
          className={`w-full px-6 py-3 rounded-[5px] font-semibold text-white shadow-lg transition-colors ${
            user?.role === "sale" && !customerInfo
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {user?.role === "sale" ? "Place Order for Customer" : "Place Order"}
        </button>
      </div>
    </div>
  );
};

export default ReviewPage;