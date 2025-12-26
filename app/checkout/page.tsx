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

// Define the API Address type based on your ShippingAddressPage
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

const paymentMethods = [
  { name: "QR", image: "/qr.jpg" },
  { name: "Cash", image: "/cash.jpg" },
];

const containerStyle = { width: "100%", height: "400px" };

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
  const { t } = useLanguage();

  const IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL!;
  
  const currentSelectedAddress = selectedAddress === "current" 
    ? currentAddress 
    : selectedAddress;

  // Fetch saved addresses
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      setLoading(true);
      try {
        const res = await api.get("/addresses/all");
        // Map API response to ExtendedAddress type
        const addresses: ExtendedAddress[] = res.data?.data.map((addr: any) => ({
          ...addr,
          // Add any missing properties needed by ContextAddress
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

  useEffect(() => {
    // Update tempAddress with user ID when user is available
    if (user && !tempAddress.api_user_id) {
      setTempAddress(prev => ({
        ...prev,
        api_user_id: user.id
      }));
    }
  }, [user]);

  const handleSelectSavedAddress = (addr: ExtendedAddress) => {
    setSelectedAddress(addr);
    setIsAdding(false);
  };

  const handleSelectCurrentLocation = () => {
    setSelectedAddress("current");
    setIsAdding(false);
  };

  // Handle map click to select coordinates
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setTempAddress({
        ...tempAddress,
        coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
      });
    }
  };

  // Handle marker drag
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setTempAddress({
        ...tempAddress,
        coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
      });
    }
  };

  // Save new address to backend
  const handleSaveNewAddress = async () => {
    if (!tempAddress.label?.trim() || !tempAddress.phone?.trim() || !tempAddress.details?.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!tempAddress.coordinates) {
      toast.error("Please select a location on the map");
      return;
    }

    if (!tempAddress.api_user_id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      // Prepare the address data matching your API structure
      const addressData: APIAddress = {
        label: tempAddress.label,
        phone: tempAddress.phone,
        details: tempAddress.details,
        coordinates: tempAddress.coordinates,
        api_user_id: tempAddress.api_user_id,
      };

      // Save address to backend
      const res = await api.post("/addresses", addressData);
      
      // Convert API response to ExtendedAddress
      const apiResponse = res.data?.data;
      const newAddress: ExtendedAddress = {
        ...apiResponse,
        // Ensure all required ContextAddress properties are present
        id: apiResponse.id,
        label: apiResponse.label,
        phone: apiResponse.phone,
        details: apiResponse.details,
        coordinates: apiResponse.coordinates,
        api_user_id: apiResponse.api_user_id,
      };
      
      // Update saved addresses list
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
        api_user_id: user?.id,
      });
      
      toast.success("Address saved successfully!");
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
            className="flex items-center justify-between border-b border-gray-300 p-3 gap-3"
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

      {/* Shipping Address */}
      <section className="flex flex-col gap-3 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t.shippingAddress}</h2>

        {/* Current Location Option */}
        {currentAddress && (
          <div
            onClick={handleSelectCurrentLocation}
            className={`p-4 rounded-xl border cursor-pointer flex flex-col transition ${
              selectedAddress === "current"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="font-semibold flex items-center gap-2">
              <span className="text-blue-500">📍</span>
              {t.currentLocation || "Current Location"}
            </p>
            <p className="text-sm text-gray-600 mt-1">{currentAddress.details}</p>
            {currentAddress.phone && (
              <p className="text-sm text-gray-600 mt-1">{t.phone}: {currentAddress.phone}</p>
            )}
          </div>
        )}

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
            <p className="font-semibold">{addr.label}</p>
            <p className="text-sm text-gray-600 mt-1">{addr.details}</p>
            {addr.phone && (
              <p className="text-sm text-gray-600 mt-1">{t.phone}: {addr.phone}</p>
            )}
          </div>
        ))}

        {/* Add New Address Form */}
        {isAdding ? (
          <div className="bg-white flex flex-col gap-4 p-4 border border-gray-200 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.label || "Label"} *
              </label>
              <input
                type="text"
                placeholder="Home, Office, etc."
                value={tempAddress.label || ""}
                onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.phone || "Phone"} *
              </label>
              <input
                type="text"
                placeholder="Phone number"
                value={tempAddress.phone || ""}
                onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.details || "Address Details"} *
              </label>
              <textarea
                placeholder="Full address details"
                value={tempAddress.details || ""}
                onChange={(e) => setTempAddress({ ...tempAddress, details: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.clickToSelectLocation || "Click to select location"} *
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
                placeholder="Click to open map and select location"
              />
              {!tempAddress.coordinates && (
                <p className="text-sm text-red-500 mt-1">
                  Please select a location on the map
                </p>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveNewAddress}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={!tempAddress.label?.trim() || !tempAddress.phone?.trim() || !tempAddress.details?.trim() || !tempAddress.coordinates}
              >
                {t.saveAddress || "Save Address"}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setTempAddress({
                    label: "",
                    phone: "",
                    details: "",
                    coordinates: { lat: 11.567, lng: 104.928 },
                    api_user_id: user?.id,
                  });
                }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                {t.cancel || "Cancel"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 w-full py-3 bg-gray-100 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
          >
            + {t.addNewAddress || "Add New Address"}
          </button>
        )}
      </section>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-[90%] max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t.selectLocation || "Select Location"}
              </h3>
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
              <p className="text-sm font-medium text-gray-700">
                Selected Coordinates:
              </p>
              {tempAddress.coordinates ? (
                <p className="text-sm text-gray-600 mt-1">
                  Latitude: {tempAddress.coordinates.lat.toFixed(6)}
                  <br />
                  Longitude: {tempAddress.coordinates.lng.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  Click on the map to select a location
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setTempAddress({
                    ...tempAddress,
                    coordinates: undefined,
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                {t.clear || "Clear"}
              </button>
              <button
                onClick={() => setShowMap(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t.select || "Select"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method */}
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
              <img 
                src={method.image} 
                alt={method.name} 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://syspro.asia/img/default.png";
                }}
              />
              <p className="font-semibold text-gray-700">{method.name}</p>
            </div>
            {paymentMethod === method.name && method.name !== "QR" && (
              <p className="text-sm text-gray-500 mt-2">
                {t.YouWillPayWithCashUponDelivery || "You will pay with cash upon delivery"}
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
                <h3 className="text-xl font-semibold text-gray-800">
                  {t.scanQRCode || "Scan QR Code"}
                </h3>
                <p className="text-sm text-gray-500">
                  {t.scanWithYourBankApp || "Scan with your bank app to pay"}
                </p>
              </div>
              <button 
                onClick={() => setShowQRPopup(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl p-1"
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
                  onError={(e) => {
                    e.currentTarget.src = "https://syspro.asia/img/default.png";
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t.amount || "Amount"}: ${total.toFixed(2)}
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleDownloadQR}
                  className="py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t.downloadQR || "Download QR"}
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setShowQRPopup(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t.close || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombinedCheckoutPage;