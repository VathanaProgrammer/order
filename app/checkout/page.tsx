"use client";

import React, { useState, useEffect } from "react";
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

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto hide-scrollbar">
      <Header title="Checkout" />

      {/* ===== Order Summary ===== */}
      <section className="flex flex-col gap-3 px-4">
        <h2 className="text-2xl font-semibold text-gray-800">Order Summary</h2>
        {cart.length === 0 && <p>Your cart is empty</p>}
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b border-gray-500 p-3 gap-3"
          >
            <img
              src={item.image && item.image.trim() !== "" ? IMAGE_URL + item.image : "/img/default.png"}
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
      <section className="flex flex-col gap-3 px-4 mt-6">
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
      <section className="flex flex-col gap-3 px-4 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">Payment Method</h2>
        {paymentMethods.map((method) => {
          const isSelected = paymentMethod === method.name;
          return (
            <div
              key={method.name}
              onClick={() => setPaymentMethod(method.name)}
              className={`cursor-pointer border rounded-xl p-5 flex flex-col gap-2 transition-shadow duration-200 ${
                isSelected ? "border-blue-500 bg-blue-50 shadow-lg" : "border-gray-200 hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-4">
                <img src={method.image} alt={method.name} className="w-12 h-12 object-contain" />
                <p className="font-semibold text-gray-700">{method.name}</p>
              </div>
              {isSelected && (
                <p className="text-sm text-gray-500 mt-3">
                  {method.name === "QR"
                    ? "Scan the QR code with your banking app to complete the payment."
                    : "You will pay with cash upon delivery."}
                </p>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default CombinedCheckoutPage;
