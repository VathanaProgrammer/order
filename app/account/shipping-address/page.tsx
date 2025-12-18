"use client";

import React, { useState } from "react";
import Header from "@/components/layouts/Header";
import { GoogleMap, Marker } from "@react-google-maps/api";
import api from "@/api/api";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";

export type Address = {
  id?: number;
  api_user_id: number | undefined,
  label: string;
  phone?: string;
  details?: string;
  coordinates?: { lat: number; lng: number };
};



const containerStyle = { width: "100%", height: "400px" };


export default function ShippingAddressPage() {

  const { user } = useAuth();
  const { setLoading } = useLoading();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  async function fetchAddress() {
    setLoading(true);
    try {
      const res = await api.get<{ status: string; data: Address[] }>("/addresses/all");
      let fetchedProducts = res.data.data;


      setSavedAddresses(fetchedProducts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {

    fetchAddress();
  }, [setLoading])

  const [newAddress, setNewAddress] = useState<Address>({
    label: "",
    phone: "",
    details: "",
    coordinates: undefined,
    api_user_id: user?.id || undefined
  });

  const handleSaveAddress = async () => {
    if (!newAddress.label || !newAddress.phone || !newAddress.details || !newAddress.coordinates) {
      alert("Please fill in all required fields and select location on map.");
      return;
    }

    try {
      const res = await api.post("/addresses", newAddress);

      const saved: Address = res.data.data; // ✅ FIX

      setSavedAddresses(prev => [...prev, saved]);
      setSelectedAddress(saved.id ?? null);

      setNewAddress({
        label: "",
        phone: "",
        details: "",
        api_user_id: user?.id,
        coordinates: undefined,
      });

      setIsAdding(false);
      setShowMap(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save address");
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Shipping Address" />

      {/* Saved Addresses */}
      <div className="flex flex-col gap-3">
        {savedAddresses.map((addr) => (
          <div
            key={addr.id}
            className={`p-4 rounded-xl border flex justify-between items-start gap-4 shadow hover:shadow-md transition cursor-pointer ${selectedAddress === addr.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            onClick={() => setSelectedAddress(addr.id!)}
          >
            <div>
              <p className="font-semibold text-lg">{addr.label}</p>
              <p className="text-gray-600 text-sm mt-1">{addr.details}</p>
              <p className="text-gray-600 text-sm mt-1">Phone: {addr.phone}</p>
              {addr.coordinates && (
                <p className="text-gray-500 text-xs mt-1">
                  Lat: {addr.coordinates.lat.toFixed(5)}, Lng: {addr.coordinates.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Address */}
      {isAdding ? (
        <div className="border rounded-xl p-4 flex flex-col gap-3 bg-white shadow-md mt-4">
          <input
            type="text"
            placeholder="Label (Home, Work)"
            className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full"
            value={newAddress.label}
            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone"
            className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full"
            value={newAddress.phone}
            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
          />
          <textarea
            placeholder="Details"
            className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full"
            value={newAddress.details}
            onChange={(e) => setNewAddress({ ...newAddress, details: e.target.value })}
          />
          <input
            type="text"
            placeholder="Click to select location on map"
            className="bg-gray-50 border border-gray-300 rounded-lg p-2 w-full cursor-pointer"
            readOnly
            value={
              newAddress.coordinates
                ? `Lat: ${newAddress.coordinates.lat.toFixed(5)}, Lng: ${newAddress.coordinates.lng.toFixed(5)}`
                : ""
            }
            onClick={() => setShowMap(true)}
          />

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAddress}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Address
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full font-semibold"
        >
          + Add New Address
        </button>
      )}

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-4 w-[90%] max-w-lg">
            <h3 className="text-lg font-semibold mb-2">Select Location</h3>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={newAddress.coordinates || { lat: 11.567, lng: 104.928 }}
              zoom={15}
              onClick={(e) => {
                if (e.latLng)
                  setNewAddress({
                    ...newAddress,
                    coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                  });
              }}
            >
              {newAddress.coordinates && (
                <Marker
                  position={newAddress.coordinates}
                  draggable
                  onDragEnd={(e) =>
                    setNewAddress({
                      ...newAddress,
                      coordinates: { lat: e.latLng!.lat(), lng: e.latLng!.lng() },
                    })
                  }
                />
              )}
            </GoogleMap>


            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowMap(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowMap(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
