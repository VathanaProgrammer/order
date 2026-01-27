"use client";
import React from "react";
import Header from "@/components/layouts/Header";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/context/CheckOutContext";

const ReviewPage = () => {
  const router = useRouter();
  const { cart, total, selectedAddress, currentAddress, paymentMethod, placeOrder } = useCheckout();
  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL!;


  const address = selectedAddress === "current" ? currentAddress : selectedAddress;

  return (
    <div className="flex flex-col h-full gap-6 ">
      <Header title="Checkout" />

      <h2 className="text-2xl font-bold text-gray-800 text-start">Review Your Order</h2>

      {/* Cart Items */}
      <div className="flex flex-col gap-3">
        {cart.length > 0 ? (
          cart.map(item => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-300 p-4">
              <div className="flex items-center gap-4">
                <img src={IMAGE_URL + item.image} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
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

      {/* Shipping Address Display */}
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

      {/* Place Order Button */}
      <div className="mt-auto">
        <button
          onClick={placeOrder}
          className="w-full px-6 py-3 rounded-[5px] font-semibold text-white shadow-lg transition-colors bg-gray-600 hover:bg-gray-700"
        >
          Place Order
        </button>
      </div>
    </div>
  );
};

export default ReviewPage;
