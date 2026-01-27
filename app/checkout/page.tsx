"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/layouts/Header";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useCheckout, Address as ContextAddress } from "@/context/CheckOutContext";
import { useAuth } from "@/context/AuthContext";
import { useLoading } from "@/context/LoadingContext";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";

// Define the API Address type
type APIAddress = {
  id?: number;
  api_user_id: number | undefined;
  label: string;
  phone?: string;
  details?: string;
  coordinates?: { lat: number; lng: number };
};

// Extended type that includes both context and API properties
type ExtendedAddress = ContextAddress & {
  api_user_id?: number;
};

const containerStyle = { width: "100%", height: "400px" };

const CombinedCheckoutPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const {
    cart,
    total,
    updateItemQty,
    selectedAddress,
    currentAddress,
    setSelectedAddress,
    setCurrentAddress,
    detectCurrentLocation,
    paymentMethod,
    setPaymentMethod,
  } = useCheckout();

  const { setLoading } = useLoading();

  const [savedAddresses, setSavedAddresses] = useState<ExtendedAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [tempAddress, setTempAddress] = useState<Partial<APIAddress>>({
    label: "",
    phone: "",
    details: "",
    coordinates: { lat: 11.567, lng: 104.928 },
    api_user_id: user?.id,
  });
  const [showQRPopup, setShowQRPopup] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const { t } = useLanguage();

  const paymentMethods = [
    { name: t.QR, image: "/qr.jpg" },
    { name: t.cash, image: "/cash.jpg" },
  ];

  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL!;

  const currentSelectedAddress = selectedAddress === "current" ? currentAddress : selectedAddress;

  // Fetch saved addresses
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      setLoading(true);
      try {
        const res = await api.get("/addresses/all");
        const addresses: ExtendedAddress[] = res.data?.data.map((addr: any) => ({
          ...addr,
        })) || [];
        setSavedAddresses(addresses);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load addresses");
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchSavedAddresses();
    }
  }, [setLoading, user]);

  // Update tempAddress when user changes
  useEffect(() => {
    if (user && !tempAddress.api_user_id) {
      setTempAddress((prev) => ({
        ...prev,
        api_user_id: user.id,
        phone: user?.role === "sale" ? "" : getPhoneFromUser(user) || "",
      }));
    }
  }, [user]);

  // Helper to extract phone from user object
  const getPhoneFromUser = (userData: any): string | null => {
    if (!userData) return null;

    if (userData.phone && userData.phone.trim()) return userData.phone.trim();
    if (userData.mobile && userData.mobile.trim()) return userData.mobile.trim();
    if (userData.contact?.mobile && userData.contact.mobile.trim()) return userData.contact.mobile.trim();
    if (userData.contact?.phone && userData.contact.phone.trim()) return userData.contact.phone.trim();

    return null;
  };

  const userPhone = getPhoneFromUser(user);

  const handleDetectCurrentLocation = async () => {
    setIsDetectingLocation(true);
    try {
      await detectCurrentLocation();
      setSelectedAddress("current");
      toast.success("Current location detected!");
    } catch (err: any) {
      toast.error(err.message || "Failed to detect location");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSelectSavedAddress = (addr: ExtendedAddress) => {
    setSelectedAddress(addr);
    setIsAdding(false);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setTempAddress({
        ...tempAddress,
        coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
      });
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setTempAddress({
        ...tempAddress,
        coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
      });
    }
  };

  // Save new address – now supports custom phone for sales role
  const handleSaveNewAddress = async () => {
    if (!tempAddress.label?.trim()) {
      toast.error("Please enter a name/label");
      return;
    }
    if (!tempAddress.details?.trim()) {
      toast.error("Please enter address details");
      return;
    }
    if (!tempAddress.coordinates) {
      toast.error("Please select a location on the map");
      return;
    }

    const finalPhone = user?.role === "sale" ? tempAddress.phone?.trim() : userPhone?.trim();

    if (!finalPhone) {
      toast.error(
        user?.role === "sale"
          ? "Please enter customer's phone number"
          : "Please add your phone number in account settings"
      );
      return;
    }

    if (!tempAddress.api_user_id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);

    try {
      const addressData: APIAddress = {
        label: tempAddress.label.trim(),
        phone: finalPhone,
        details: tempAddress.details.trim(),
        coordinates: tempAddress.coordinates,
        api_user_id: tempAddress.api_user_id,
      };

      console.log("Saving address:", addressData);

      const res = await api.post("/addresses", addressData);
      const apiResponse = res.data?.data;

      const newAddress: ExtendedAddress = {
        ...apiResponse,
        id: apiResponse.id,
        label: apiResponse.label,
        phone: apiResponse.phone,
        details: apiResponse.details,
        coordinates: apiResponse.coordinates,
        api_user_id: apiResponse.api_user_id,
      };

      setSavedAddresses((prev) => [...prev, newAddress]);
      setSelectedAddress(newAddress);
      setIsAdding(false);

      setTempAddress({
        label: "",
        phone: user?.role === "sale" ? "" : userPhone || "",
        details: "",
        coordinates: { lat: 11.567, lng: 104.928 },
        api_user_id: user?.id,
      });

      toast.success("Address saved successfully");
    } catch (err: any) {
      console.error("Save address error:", err);
      toast.error(err.response?.data?.message || "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = (methodName: string) => {
    setPaymentMethod(methodName);
    if (methodName === "QR") {
      setShowQRPopup(true);
    }
  };

  const handleDownloadQR = () => {
    try {
      const link = document.createElement("a");
      link.download = "payment-qr-code.png";
      link.href = "/qr.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code downloaded");
    } catch (error) {
      toast.error("Failed to download QR code");
    }
  };

  // Checkout handler (you might want to adjust phone for current location too when role=sale)
  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("Your cart is empty");
    if (!selectedAddress) return toast.error("Please select a shipping address");
    if (!paymentMethod) return toast.error("Please select a payment method");

    setIsSubmittingOrder(true);
    setLoading(true);

    try {
      const orderData: any = {
        api_user_id: user?.id,
        address_type: selectedAddress === "current" ? "current" : "saved",
        paymentMethod,
        total_qty: cart.reduce((sum, item) => sum + item.qty, 0),
        total,
        items: cart.map((item) => ({
          product_id: item.id,
          qty: item.qty,
          price_at_order: item.price,
          total_line: item.price * item.qty,
          image_url: item.image || null,
        })),
      };

      if (selectedAddress === "current") {
        if (!currentAddress?.coordinates) {
          toast.error("Please detect your current location first");
          return;
        }

        const phoneForCurrent =
          user?.role === "sale" && tempAddress.phone?.trim()
            ? tempAddress.phone.trim()
            : userPhone;

        if (!phoneForCurrent) {
          toast.error(
            user?.role === "sale"
              ? "Please enter customer's phone number"
              : "Please add your phone in account settings"
          );
          return;
        }

        orderData.address = {
          label: "Current Location",
          phone: phoneForCurrent,
          details: `Current location at ${currentAddress.coordinates.lat.toFixed(6)}, ${currentAddress.coordinates.lng.toFixed(6)}`,
          coordinates: currentAddress.coordinates,
        };
      } else {
        orderData.saved_address_id = (selectedAddress as ExtendedAddress).id;
      }

      const response = await api.post("/orders", orderData);

      if (response.data.success) {
        toast.success("Order placed successfully!");
        const orderId = response.data.order_id;
        router.push(orderId ? `/order-confirmation/${orderId}` : "/order-confirmation");
      } else {
        toast.error(response.data.message || "Failed to place order");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setIsSubmittingOrder(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto hide-scrollbar pb-24">
      <Header title={t.checkout} />

      {/* Order Summary */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">{t.orderSummary}</h2>
        {cart.length === 0 && <p>{t.yourCartIsEmpty}</p>}

        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b border-gray-300 p-3 gap-3"
          >
            <img
              src={item.image && item.image.trim() ? IMAGE_URL + item.image : "https://syspro.asia/img/default.png"}
              alt={item.title}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-gray-600">
                ${item.price.toFixed(2)} × {item.qty} = ${(item.price * item.qty).toFixed(2)}
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

        {cart.length > 0 && (
          <div className="pt-4 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{t.total}:</span>
              <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Shipping Address Section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">{t.shippingAddress}</h2>

        {/* Current Location */}
        <div
          onClick={handleDetectCurrentLocation}
          className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition ${
            selectedAddress === "current" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
          } ${isDetectingLocation ? "opacity-70" : ""}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-blue-500 text-xl">📍</span>
            <div>
              <p className="font-semibold">{t.currentLocation || "Current Location"}</p>
              <p className="text-sm text-gray-500">
                {isDetectingLocation
                  ? t.detectingYourCurrentLocation
                  : currentAddress
                  ? t.clickToUseYourCurrentLocation
                  : t.clickToDetectYourCurrentLocation}
              </p>
            </div>
          </div>
          {isDetectingLocation && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          )}
        </div>

        {/* Saved Addresses */}
        {savedAddresses.map((addr) => (
          <div
            key={addr.id}
            onClick={() => handleSelectSavedAddress(addr)}
            className={`p-4 rounded-xl border cursor-pointer flex flex-col transition ${
              currentSelectedAddress && (currentSelectedAddress as ExtendedAddress).id === addr.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{addr.label}</p>
                <p className="text-sm text-gray-600 mt-1">{addr.details}</p>
                {addr.phone && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t.phone}: {addr.phone}
                  </p>
                )}
              </div>
              <span className="text-blue-500 text-lg">📍</span>
            </div>
          </div>
        ))}

        {/* Add New Address Button / Form */}
        {isAdding ? (
          <div className="bg-white flex flex-col gap-4 p-4 border border-gray-200 rounded-xl">
            {/* Name / Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {user?.role === "sale" ? "Customer Name" : "Label"} *
              </label>
              <input
                type="text"
                placeholder={
                  user?.role === "sale" ? "Enter customer name" : "Home, Work, etc."
                }
                value={tempAddress.label || ""}
                onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.phone} *
              </label>
              {user?.role === "sale" ? (
                <input
                  type="tel"
                  placeholder="Customer phone number"
                  value={tempAddress.phone || ""}
                  onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="w-full p-3 border rounded-lg bg-gray-50 text-gray-700">
                  {userPhone ? `${userPhone} (from account)` : "No phone in profile"}
                </div>
              )}
            </div>

            {/* Address Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.details || "Address Details"} *
              </label>
              <textarea
                placeholder="Street, building, floor, notes..."
                value={tempAddress.details || ""}
                onChange={(e) => setTempAddress({ ...tempAddress, details: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {/* Location Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.clickToSelectLocation} *
              </label>
              <input
                type="text"
                readOnly
                value={
                  tempAddress.coordinates
                    ? `Lat: ${tempAddress.coordinates.lat.toFixed(5)}, Lng: ${tempAddress.coordinates.lng.toFixed(5)}`
                    : ""
                }
                onClick={() => setShowMap(true)}
                className="w-full p-3 border rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                placeholder={t.clickToSelectLocation}
              />
              {!tempAddress.coordinates && (
                <p className="text-sm text-red-500 mt-1">{t.pleaseSelectALocationOnTheMap}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveNewAddress}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={
                  !tempAddress.label?.trim() ||
                  !tempAddress.details?.trim() ||
                  !tempAddress.coordinates ||
                  (user?.role === "sale" ? !tempAddress.phone?.trim() : !userPhone?.trim())
                }
              >
                {t.saveAddress}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setTempAddress({
                    label: "",
                    phone: user?.role === "sale" ? "" : userPhone || "",
                    details: "",
                    coordinates: { lat: 11.567, lng: 104.928 },
                    api_user_id: user?.id,
                  });
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 w-full py-3 bg-gray-100 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            {user?.role === "sale" ? "Add New Customer Address" : t.addNewAddress}
          </button>
        )}
      </section>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-[90%] max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t.selectLocation}</h3>
              <button
                onClick={() => setShowMap(false)}
                className="text-gray-500 hover:text-gray-700 text-xl p-1"
              >
                ✕
              </button>
            </div>

            <GoogleMap
              mapContainerStyle={containerStyle}
              center={tempAddress.coordinates || { lat: 11.567, lng: 104.928 }}
              zoom={15}
              onClick={handleMapClick}
            >
              {tempAddress.coordinates && (
                <Marker
                  position={tempAddress.coordinates}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                />
              )}
            </GoogleMap>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{t.selectedCoordinates}:</p>
              {tempAddress.coordinates ? (
                <p className="text-sm text-gray-600 mt-1">
                  Lat: {tempAddress.coordinates.lat.toFixed(6)}
                  <br />
                  Lng: {tempAddress.coordinates.lng.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">{t.clickToSelectLocation}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setTempAddress({ ...tempAddress, coordinates: undefined })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                {t.clear}
              </button>
              <button
                onClick={() => setShowMap(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t.select}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">{t.paymentMethod}</h2>
        {paymentMethods.map((method) => (
          <div
            key={method.name}
            onClick={() => handlePaymentMethodSelect(method.name)}
            className={`cursor-pointer border rounded-xl p-5 flex flex-col gap-2 transition-shadow ${
              paymentMethod === method.name
                ? "border-blue-500 bg-blue-50 shadow-lg"
                : "border-gray-200 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-4">
              <img
                src={method.image}
                alt={method.name}
                className="w-12 h-12 object-contain"
                onError={(e) => (e.currentTarget.src = "https://syspro.asia/img/default.png")}
              />
              <p className="font-semibold text-gray-700">{method.name}</p>
            </div>
            {paymentMethod === method.name && method.name !== "QR" && (
              <p className="text-sm text-gray-500 mt-2">
                You will pay with cash upon delivery
              </p>
            )}
          </div>
        ))}
      </section>

      {/* QR Popup */}
      {showQRPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Scan QR Code</h3>
                <p className="text-sm text-gray-500">Scan with your bank app to pay</p>
              </div>
              <button
                onClick={() => setShowQRPopup(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1"
              >
                ×
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="mb-4 p-4 border rounded-lg bg-white inline-block">
                <img
                  src="/qr.jpg"
                  alt="Payment QR Code"
                  className="w-64 h-64 mx-auto"
                  onError={(e) => (e.currentTarget.src = "https://syspro.asia/img/default.png")}
                />
                <p className="text-xs text-gray-500 mt-2">Amount: ${total.toFixed(2)}</p>
              </div>

              <button
                onClick={handleDownloadQR}
                className="py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 w-full flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR
              </button>
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