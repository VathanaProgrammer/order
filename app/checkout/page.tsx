"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/layouts/Header";
import { useCheckout, Address } from "@/context/CheckOutContext";
import { useAuth } from "@/context/AuthContext";
import { useLoading } from "@/context/LoadingContext";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLanguage } from "@/context/LanguageContext";

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
  const [showQRPopup, setShowQRPopup] = useState(false);
  const { t } = useLanguage();

  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL!;
  
  // Determine the current selected address
  const currentSelectedAddress = selectedAddress === "current" 
    ? currentAddress 
    : selectedAddress;

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

  // NEW: Handle selecting current location as address
  const handleSelectCurrentLocation = () => {
    setSelectedAddress("current");
    setIsAdding(false);
  };

  // NEW: Save new address to backend
  const handleSaveNewAddress = async () => {
    if (!tempAddress.label || !tempAddress.phone || !tempAddress.details) {
      toast.error("Please fill all fields and select a location.");
      return;
    }

    setLoading(true);
    try {
      // Save address to backend
      const res = await api.post("/addresses", tempAddress);
      
      // Update saved addresses list
      const newAddress = res.data?.data;
      setSavedAddresses(prev => [...prev, newAddress]);
      
      // Select the newly saved address
      setSelectedAddress(newAddress);
      setIsAdding(false);
      
      // Reset temp address
      setTempAddress({
        label: "",
        phone: "",
        details: "",
        coordinates: { lat: 11.567, lng: 104.928 },
      });
      
      toast.success("Address saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (methodName: string) => {
    setPaymentMethod(methodName);
    if (methodName === "QR") {
      setShowQRPopup(true);
    }
  };

  // Handle QR code download
  const handleDownloadQR = () => {
    try {
      const qrImageUrl = "/qr.jpg";
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
      <Header title={t.checkout} />

      {/* ===== Order Summary ===== */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">{t.orderSummary}</h2>
        {cart.length === 0 && <p>{t.yourCartIsEmpty}</p>}
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
        <h2 className="text-2xl font-semibold text-gray-800">{t.shippingAddress}</h2>

        {/* Current Location Option */}
        {currentAddress && (
          <div
            onClick={handleSelectCurrentLocation}
            className={`p-4 rounded-xl border cursor-pointer flex flex-col transition ${
              selectedAddress === "current"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200"
            }`}
          >
            <p className="font-semibold">📍 {t.currentLocation}</p>
            <p className="text-sm text-gray-600">{currentAddress.details}</p>
            <p className="text-sm text-gray-600">{t.phone}: {currentAddress.phone}</p>
          </div>
        )}

        {/* Saved Addresses */}
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
            <p className="text-sm text-gray-600">{t.phone}: {addr.phone}</p>
          </div>
        ))}

        {/* Add New Address Form */}
        {isAdding ? (
          <div className="bg-white flex flex-col gap-4 p-4 border border-gray-200 rounded-xl">
            <input
              type="text"
              placeholder={t.label}
              value={tempAddress.label}
              onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder={t.phone}
              value={tempAddress.phone}
              onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <textarea
              placeholder={t.details}
              value={tempAddress.details}
              onChange={(e) => setTempAddress({ ...tempAddress, details: e.target.value })}
              className="w-full p-3 border rounded-lg"
              rows={3}
            />
            <input
              type="text"
              readOnly
              value={`Lat: ${tempAddress.coordinates!.lat.toFixed(
                5
              )}, Lng: ${tempAddress.coordinates!.lng.toFixed(5)}`}
              onClick={() => setShowMap(true)}
              className="w-full p-3 border rounded-lg cursor-pointer bg-gray-50"
            />
            
            <div className="flex gap-3">
              <button
                onClick={handleSaveNewAddress}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t.saveAddress}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setTempAddress({
                    label: "",
                    phone: "",
                    details: "",
                    coordinates: { lat: 11.567, lng: 104.928 },
                  });
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 w-full py-3 bg-gray-100 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50"
          >
            + {t.addNewAddress}
          </button>
        )}
      </section>

      {/* Payment */}
      <section className="flex flex-col gap-3 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t.paymentMethod}</h2>
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
                {t.YouWillPayWithCashUponDelivery}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* QR Popup Modal */}
      {showQRPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{t.scanQRCode}</h3>
                <p className="text-sm text-gray-500">{t.scanWithYourBankApp}</p>
              </div>
              <button 
                onClick={() => setShowQRPopup(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="mb-4 p-4 border rounded-lg bg-white inline-block">
                <img 
                  src="/qr.jpg"
                  alt="Payment QR Code"
                  className="w-64 h-64 mx-auto"
                />
                <p className="text-xs text-gray-500 mt-2">{t.amount}: ${total.toFixed(2)}</p>
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
                    {t.downloadQR}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setShowQRPopup(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombinedCheckoutPage;