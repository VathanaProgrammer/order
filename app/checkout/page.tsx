"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/layouts/Header";
import { useCheckout, Address } from "@/context/CheckOutContext";
import { useAuth } from "@/context/AuthContext";
import { useLoading } from "@/context/LoadingContext";
import api from "@/api/api";
import { toast } from "react-toastify";

const paymentMethods = [
  { name: "QR", image: "/qr.jpg" },
  { name: "Cash", image: "/cash.jpg" },
];

const CombinedCheckoutPage = () => {
  const { user } = useAuth();
  const {
    cart,
    total,
    updateItemQty,
    selectedAddress,
    currentAddress,
    setSelectedAddress,
    setCurrentAddress,
    paymentMethod,
    setPaymentMethod,
  } = useCheckout();

  const { setLoading } = useLoading();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [tempAddress, setTempAddress] = useState<Address>({
    label: "",
    phone: "",
    details: "",
    coordinates: { lat: 11.567, lng: 104.928 },
  });
  const [showQRPopup, setShowQRPopup] = useState(false); // New state for QR popup

  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL!;
  const currentSelectedAddress =
    selectedAddress === "current" ? currentAddress : selectedAddress;

  // Fetch saved addresses
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      setLoading(true);
      try {
        const res = await api.get("/addresses/all");
        setSavedAddresses(res.data?.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load addresses");
      } finally {
        setLoading(false);
      }
    };
    fetchSavedAddresses();
  }, [setLoading]);

  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddress(addr);
    setIsAdding(false);
  };

  const handleSelectCurrentAddress = () => {
    if (!tempAddress.label || !tempAddress.phone || !tempAddress.details) {
      toast.error("Please fill all fields and select a location.");
      return;
    }
    const shortAddress = `${tempAddress.details}, ${tempAddress.coordinates!.lat.toFixed(
      5
    )}, ${tempAddress.coordinates!.lng.toFixed(5)}`;
    setCurrentAddress({ ...tempAddress, short_address: shortAddress });
    setSelectedAddress("current");
    setIsAdding(false);
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (methodName: string) => {
    setPaymentMethod(methodName);
    if (methodName === "QR") {
      setShowQRPopup(true); // Show QR popup when QR is selected
    }
  };

  // Handle QR code download
  const handleDownloadQR = () => {
    try {
      // Replace with your actual QR image path
      const qrImageUrl = "/qr-code.png"; // Update this to your actual QR image path
      const link = document.createElement("a");
      link.download = "payment-qr-code.png";
      link.href = qrImageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download QR code");
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto hide-scrollbar">
      <Header title="Checkout" />

      {/* ===== Order Summary ===== */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">Order Summary</h2>
        {cart.length === 0 && <p>Your cart is empty</p>}
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b border-gray-500 p-3 gap-3"
          >
            <img
              src={item.image && item.image.trim() !== "" ? IMAGE_URL + item.image : "https://syspro.asia/img/default.png"}
              alt={item.title}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-gray-600">
                ${item.price.toFixed(2)} x {item.qty} = ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateItemQty(item.id, Math.max(1, item.qty - 1))}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                -
              </button>
              <span className="w-6 text-center">{item.qty}</span>
              <button
                onClick={() => updateItemQty(item.id, item.qty + 1)}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Shipping Address & Payment */}
      <section className="flex flex-col gap-3 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">Shipping Address</h2>

        {savedAddresses.map((addr) => (
          <div
            key={addr.id}
            onClick={() => handleSelectSavedAddress(addr)}
            className={`p-4 rounded-xl border cursor-pointer flex flex-col transition ${
              currentSelectedAddress && (currentSelectedAddress as Address).id === addr.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200"
            }`}
          >
            <p className="font-semibold">{addr.label}</p>
            <p className="text-sm text-gray-600">{addr.details}</p>
            <p className="text-sm text-gray-600">Phone: {addr.phone}</p>
          </div>
        ))}

        {isAdding && (
          <div className="bg-white flex flex-col gap-2">
            <input
              type="text"
              placeholder="Label"
              value={tempAddress.label}
              onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Phone"
              value={tempAddress.phone}
              onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <textarea
              placeholder="Details"
              value={tempAddress.details}
              onChange={(e) => setTempAddress({ ...tempAddress, details: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              readOnly
              value={`Lat: ${tempAddress.coordinates!.lat.toFixed(
                5
              )}, Lng: ${tempAddress.coordinates!.lng.toFixed(5)}`}
              onClick={() => setShowMap(true)}
              className="w-full p-2 border rounded cursor-pointer"
            />
            <button
              onClick={handleSelectCurrentAddress}
              className="w-full py-3 bg-blue-600 text-white rounded"
            >
              Use This Address
            </button>
          </div>
        )}

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 w-full py-3 bg-gray-200 rounded"
          >
            + Add / Use Current Location
          </button>
        )}
      </section>

      {/* Payment */}
      <section className="flex flex-col gap-3 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">Payment Method</h2>
        {paymentMethods.map((method) => (
          <div
            key={method.name}
            onClick={() => handlePaymentMethodSelect(method.name)}
            className={`cursor-pointer border rounded-xl p-5 flex flex-col gap-2 transition-shadow duration-200 ${
              paymentMethod === method.name 
                ? "border-blue-500 bg-blue-50 shadow-lg" 
                : "border-gray-200 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-4">
              <img src={method.image} alt={method.name} className="w-12 h-12 object-contain" />
              <p className="font-semibold text-gray-700">{method.name}</p>
            </div>
            {paymentMethod === method.name && method.name !== "QR" && (
              <p className="text-sm text-gray-500 mt-2">
                You will pay with cash upon delivery.
              </p>
            )}
          </div>
        ))}
      </section>

      {/* Checkout Button */}
      <div className="sticky bottom-0 bg-white border-t p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
        </div>
        <button
          onClick={() => {
            if (!currentSelectedAddress) {
              toast.error("Please select a shipping address");
              return;
            }
            if (!paymentMethod) {
              toast.error("Please select a payment method");
              return;
            }
            // Handle checkout logic here
            toast.success("Order placed successfully!");
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
        >
          Place Order
        </button>
      </div>

      {/* QR Popup Modal */}
      {showQRPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Scan QR Code</h3>
                <p className="text-sm text-gray-500">Scan with your banking app</p>
              </div>
              <button 
                onClick={() => setShowQRPopup(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="text-center mb-6">
              {/* Replace with your actual QR image */}
              <div className="mb-4 p-4 border rounded-lg bg-white inline-block">
                <img 
                  src="/qr-code.png" // Update this path to your actual QR image
                  alt="Payment QR Code"
                  className="w-64 h-64 mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2">Amount: ${total.toFixed(2)}</p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <div className="flex space-x-3">
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download QR
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setShowQRPopup(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombinedCheckoutPage;