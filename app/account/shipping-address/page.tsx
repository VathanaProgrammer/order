"use client";

import React, { useState } from "react";
import Header from "@/components/layouts/Header";
import { GoogleMap, Marker } from "@react-google-maps/api";
import api from "@/api/api";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newAddress, setNewAddress] = useState<Address>({
    label: "",
    phone: "",
    details: "",
    coordinates: undefined,
    api_user_id: user?.id || undefined
  });

  async function fetchAddress() {
    setLoading(true);
    try {
      const res = await api.get<{ status: string; data: Address[] }>("/addresses/all");
      console.log("Fetched addresses:", res.data.data);
      setSavedAddresses(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAddress();
  }, [setLoading]);

  const handleSaveAddress = async () => {
    if (!newAddress.label || !newAddress.phone || !newAddress.details || !newAddress.coordinates) {
      toast.error("Please fill in all required fields and select location on map.");
      return;
    }

    if (!newAddress.api_user_id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingId) {
        // Edit existing address using PUT
        console.log("Editing address ID:", editingId, "Data:", newAddress);
        
        // Prepare data for PUT request
        const updateData = {
          ...newAddress,
          _method: 'PUT' // Some Laravel setups need this for PUT via POST
        };
        
        const res = await api.put(`/addresses/${editingId}`, updateData);
        const updated: Address = res.data.data;
        console.log("Updated address:", updated);
        
        setSavedAddresses(prev => 
          prev.map(addr => addr.id === editingId ? updated : addr)
        );
        setSelectedAddress(updated.id ?? null);
        toast.success("Address updated successfully!");
      } else {
        // Add new address
        console.log("Adding new address:", newAddress);
        const res = await api.post("/addresses", newAddress);
        const saved: Address = res.data.data;
        console.log("Saved address:", saved);
        
        setSavedAddresses(prev => [...prev, saved]);
        setSelectedAddress(saved.id ?? null);
        toast.success("Address saved successfully!");
      }

      // Reset form
      resetForm();
    } catch (err: any) {
      console.error("Save/Edit error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      // Check for specific error messages
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.response?.data?.errors) {
        // Laravel validation errors
        const errors = err.response.data.errors;
        const firstError = Object.values(errors)[0] as string[];
        toast.error(firstError[0] || "Validation error");
      } else {
        toast.error(err.response?.data?.message || "Failed to save address");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    console.log("Editing address:", address);
    setNewAddress({
      ...address,
      api_user_id: user?.id || undefined
    });
    setEditingId(address.id || null);
    setIsEditing(true);
    setIsAdding(true);
    setSelectedAddress(address.id || null);
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    setLoading(true);
    try {
      console.log("Deleting address ID:", id);
      
      // Delete using DELETE method (matches your Laravel route)
      await api.delete(`/addresses/${id}`);
      
      setSavedAddresses(prev => prev.filter(addr => addr.id !== id));
      
      if (selectedAddress === id) {
        setSelectedAddress(null);
      }
      
      toast.success("Address deleted successfully!");
    } catch (err: any) {
      console.error("Delete error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      // More specific error messages
      if (err.response?.status === 404) {
        toast.error("Address not found or already deleted");
      } else if (err.response?.status === 403) {
        toast.error("You don't have permission to delete this address");
      } else if (err.response?.status === 401) {
        toast.error("Please login again to delete address");
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to delete address");
      }
      
      // Refresh the list in case of error
      fetchAddress();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewAddress({
      label: "",
      phone: "",
      details: "",
      coordinates: undefined,
      api_user_id: user?.id || undefined
    });
    setIsAdding(false);
    setIsEditing(false);
    setEditingId(null);
    setShowMap(false);
  };

  const handleCancel = () => {
    resetForm();
  };

  // Test API endpoints directly
  const testApiEndpoints = async () => {
    console.log("Testing API endpoints...");
    
    // Test if we can get a single address first
    if (savedAddresses.length > 0) {
      const testId = savedAddresses[0].id;
      try {
        console.log(`Testing GET /addresses/${testId}`);
        const res = await api.get(`/addresses/${testId}`);
        console.log("Single address response:", res.data);
      } catch (err) {
        console.error("GET single address error:", err);
      }
    }
    
    // Test POST with minimal data
    const testData = {
      label: "Test Address",
      phone: "1234567890",
      details: "Test location",
      coordinates: { lat: 11.567, lng: 104.928 },
      api_user_id: user?.id
    };
    
    try {
      console.log("Testing POST /addresses with:", testData);
      const res = await api.post("/addresses", testData);
      console.log("POST response:", res.data);
      
      // Clean up: delete the test address
      if (res.data.data?.id) {
        await api.delete(`/addresses/${res.data.data.id}`);
        console.log("Test address cleaned up");
      }
    } catch (err) {
      console.error("POST test error:", err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title={t.shippingAddress} />

      {/* Test button - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={testApiEndpoints}
          className="text-xs p-2 bg-yellow-100 border border-yellow-300 rounded mb-2"
        >
          Test API Endpoints
        </button>
      )}

      {/* Saved Addresses */}
      <div className="flex flex-col gap-3">
        {savedAddresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No saved addresses yet. Add your first address below.
          </div>
        ) : (
          savedAddresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-4 rounded-xl border flex justify-between items-start gap-4 shadow hover:shadow-md transition cursor-pointer relative ${
                selectedAddress === addr.id 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 bg-white"
              }`}
              onClick={() => setSelectedAddress(addr.id!)}
            >
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{addr.label}</span>
                      {isEditing && editingId === addr.id && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          Editing...
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{addr.details}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      {t.phone}: {addr.phone}
                    </p>
                    {addr.coordinates && (
                      <p className="text-gray-500 text-xs mt-1">
                        Lat: {addr.coordinates.lat.toFixed(5)}, Lng: {addr.coordinates.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAddress(addr);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm"
                    >
                      {t.edit || "Edit"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAddress(addr.id!);
                      }}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                    >
                      {t.delete || "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Address Form */}
      {isAdding ? (
        <div className="border rounded-xl p-4 flex flex-col gap-3 bg-white shadow-md mt-4">
          <h3 className="text-lg font-semibold mb-2">
            {isEditing ? t.editAddress || "Edit Address" : t.addNewAddress}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.label} *
            </label>
            <input
              type="text"
              placeholder={t.labelHomeWork}
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newAddress.label}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.phone} *
            </label>
            <input
              type="text"
              placeholder={t.phone}
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newAddress.phone}
              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.details} *
            </label>
            <textarea
              placeholder={t.details}
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newAddress.details}
              onChange={(e) => setNewAddress({ ...newAddress, details: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.clickToSelectLocation} *
            </label>
            <input
              type="text"
              placeholder={t.clickToSelectLocation}
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 w-full cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              readOnly
              value={
                newAddress.coordinates
                  ? `Lat: ${newAddress.coordinates.lat.toFixed(5)}, Lng: ${newAddress.coordinates.lng.toFixed(5)}`
                  : ""
              }
              onClick={() => setShowMap(true)}
            />
            {!newAddress.coordinates && (
              <p className="text-sm text-red-500 mt-1">
                {t.pleaseSelectALocationOnTheMap}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSaveAddress}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={!newAddress.label || !newAddress.phone || !newAddress.details || !newAddress.coordinates}
            >
              {isEditing ? t.saveChanges || "Save Changes" : t.saveAddress}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-4 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 w-full font-semibold flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          {t.addNewAddress}
        </button>
      )}

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
                      coordinates: { 
                        lat: e.latLng!.lat(), 
                        lng: e.latLng!.lng() 
                      },
                    })
                  }
                />
              )}
            </GoogleMap>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">
                {t.selectedCoordinates}:
              </p>
              {newAddress.coordinates ? (
                <p className="text-sm text-gray-600 mt-1">
                  {t.latitude}: {newAddress.coordinates.lat.toFixed(6)}
                  <br />
                  {t.longtitude}: {newAddress.coordinates.lng.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  {t.clickToSelectLocation}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setNewAddress({
                    ...newAddress,
                    coordinates: undefined,
                  });
                }}
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
    </div>
  );
}