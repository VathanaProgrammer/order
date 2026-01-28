// "use client";

// import { useState, useEffect } from "react";
// import { GoogleMap, Marker } from "@react-google-maps/api";
// import { useCheckout, Address as ContextAddress } from "@/context/CheckOutContext";
// import { useAuth } from "@/context/AuthContext";
// import { useLoading } from "@/context/LoadingContext";
// import api from "@/api/api";
// import { toast } from "react-toastify";
// import { useLanguage } from "@/context/LanguageContext";

// // Define the API Address type
// type APIAddress = {
//   id?: number;
//   api_user_id: number | undefined;
//   label: string;
//   phone?: string;
//   details?: string;
//   coordinates?: { lat: number; lng: number };
// };

// // Extended type that includes both context and API properties
// type ExtendedAddress = ContextAddress & {
//   api_user_id?: number;
// };

// const containerStyle = { width: "100%", height: "400px" };

// interface UserInformationFormProps {
//   onComplete: (userData: {
//     customerName?: string;
//     customerPhone?: string;
//     address: any;
//     paymentMethod?: string;
//   }) => void;
//   initialData?: {
//     customerName?: string;
//     customerPhone?: string;
//     address?: any;
//     paymentMethod?: string;
//   };
// }

// const UserInformationForm = ({ onComplete, initialData }: UserInformationFormProps) => {
//   const { user } = useAuth();
//   const {
//     selectedAddress,
//     currentAddress,
//     setSelectedAddress,
//     detectCurrentLocation,
//     paymentMethod,
//     setPaymentMethod,
//   } = useCheckout();

//   const { setLoading } = useLoading();
//   const { t } = useLanguage();

//   const [savedAddresses, setSavedAddresses] = useState<ExtendedAddress[]>([]);
//   const [isAdding, setIsAdding] = useState(false);
//   const [showMap, setShowMap] = useState(false);
//   const [tempAddress, setTempAddress] = useState<Partial<APIAddress>>({
//     label: "",
//     phone: "",
//     details: "",
//     coordinates: { lat: 11.567, lng: 104.928 },
//     api_user_id: user?.id,
//   });
  
//   const [isDetectingLocation, setIsDetectingLocation] = useState(false);
//   const [customerName, setCustomerName] = useState(initialData?.customerName || "");
//   const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || "");

//   const paymentMethods = [
//     { name: t.QR, image: "/qr.jpg" },
//     { name: t.cash, image: "/cash.jpg" },
//   ];

//   // Fetch saved addresses
//   useEffect(() => {
//     const fetchSavedAddresses = async () => {
//       setLoading(true);
//       try {
//         const res = await api.get("/addresses/all");
//         const addresses: ExtendedAddress[] = res.data?.data.map((addr: any) => ({
//           ...addr,
//         })) || [];
//         setSavedAddresses(addresses);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load addresses");
//       } finally {
//         setLoading(false);
//       }
//     };
//     if (user) {
//       fetchSavedAddresses();
//     }
//   }, [setLoading, user]);

//   // Update tempAddress when user changes
//   useEffect(() => {
//     if (user && !tempAddress.api_user_id) {
//       setTempAddress((prev) => ({
//         ...prev,
//         api_user_id: user.id,
//         phone: user?.role === "sale" ? customerPhone || "" : getPhoneFromUser(user) || "",
//       }));
//     }
//   }, [user, customerPhone]);

//   // Helper to extract phone from user object
//   const getPhoneFromUser = (userData: any): string | null => {
//     if (!userData) return null;

//     if (userData.phone && userData.phone.trim()) return userData.phone.trim();
//     if (userData.mobile && userData.mobile.trim()) return userData.mobile.trim();
//     if (userData.contact?.mobile && userData.contact.mobile.trim()) return userData.contact.mobile.trim();
//     if (userData.contact?.phone && userData.contact.phone.trim()) return userData.contact.phone.trim();

//     return null;
//   };

//   const userPhone = getPhoneFromUser(user);

//   const handleDetectCurrentLocation = async () => {
//     setIsDetectingLocation(true);
//     try {
//       await detectCurrentLocation();
//       setSelectedAddress("current");
//       toast.success("Current location detected!");
//     } catch (err: any) {
//       toast.error(err.message || "Failed to detect location");
//     } finally {
//       setIsDetectingLocation(false);
//     }
//   };

//   const handleSelectSavedAddress = (addr: ExtendedAddress) => {
//     setSelectedAddress(addr);
//     setIsAdding(false);
//   };

//   const handleMapClick = (e: google.maps.MapMouseEvent) => {
//     if (e.latLng) {
//       setTempAddress({
//         ...tempAddress,
//         coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
//       });
//     }
//   };

//   const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
//     if (e.latLng) {
//       setTempAddress({
//         ...tempAddress,
//         coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
//       });
//     }
//   };

//   // Save new address
//   const handleSaveNewAddress = async () => {
//     // Validate for sale role
//     if (user?.role === "sale") {
//       if (!customerName.trim()) {
//         toast.error("Please enter customer name");
//         return;
//       }
//       if (!customerPhone.trim()) {
//         toast.error("Please enter customer phone number");
//         return;
//       }
//     } else {
//       if (!tempAddress.label?.trim()) {
//         toast.error("Please enter a name/label");
//         return;
//       }
//     }
    
//     if (!tempAddress.details?.trim()) {
//       toast.error("Please enter address details");
//       return;
//     }
//     if (!tempAddress.coordinates) {
//       toast.error("Please select a location on the map");
//       return;
//     }

//     const finalPhone = user?.role === "sale" ? customerPhone.trim() : userPhone?.trim();

//     if (!finalPhone) {
//       toast.error(
//         user?.role === "sale"
//           ? "Please enter customer's phone number"
//           : "Please add your phone number in account settings"
//       );
//       return;
//     }

//     if (!tempAddress.api_user_id) {
//       toast.error("User not authenticated");
//       return;
//     }

//     setLoading(true);

//     try {
//       const addressData: APIAddress = {
//         label: user?.role === "sale" ? customerName.trim() : tempAddress.label.trim(),
//         phone: finalPhone,
//         details: tempAddress.details.trim(),
//         coordinates: tempAddress.coordinates,
//         api_user_id: tempAddress.api_user_id,
//       };

//       const res = await api.post("/addresses", addressData);
//       const apiResponse = res.data?.data;

//       const newAddress: ExtendedAddress = {
//         ...apiResponse,
//         id: apiResponse.id,
//         label: apiResponse.label,
//         phone: apiResponse.phone,
//         details: apiResponse.details,
//         coordinates: apiResponse.coordinates,
//         api_user_id: apiResponse.api_user_id,
//       };

//       setSavedAddresses((prev) => [...prev, newAddress]);
//       setSelectedAddress(newAddress);
//       setIsAdding(false);

//       setTempAddress({
//         label: "",
//         phone: user?.role === "sale" ? "" : userPhone || "",
//         details: "",
//         coordinates: { lat: 11.567, lng: 104.928 },
//         api_user_id: user?.id,
//       });

//       toast.success("Address saved successfully");
//     } catch (err: any) {
//       console.error("Save address error:", err);
//       toast.error(err.response?.data?.message || "Failed to save address");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePaymentMethodSelect = (methodName: string) => {
//     setPaymentMethod(methodName);
//   };

//   const handleContinue = () => {
//     // Validate required fields
//     if (!selectedAddress) {
//       toast.error("Please select a shipping address");
//       return;
//     }

//     if (!paymentMethod) {
//       toast.error("Please select a payment method");
//       return;
//     }

//     // Additional validation for sale role
//     if (user?.role === "sale") {
//       if (selectedAddress === "current") {
//         if (!customerName.trim() || !customerPhone.trim()) {
//           toast.error("Please enter customer name and phone number");
//           return;
//         }
//       } else {
//         // For saved addresses in sale role, check if we have customer info
//         const savedAddr = selectedAddress as ExtendedAddress;
//         if (!savedAddr.label?.trim() || !savedAddr.phone?.trim()) {
//           toast.error("Please select an address with customer information");
//           return;
//         }
//       }
//     }

//     // Prepare user data
//     const userData = {
//       customerName: user?.role === "sale" ? customerName : undefined,
//       customerPhone: user?.role === "sale" ? customerPhone : undefined,
//       address: selectedAddress,
//       paymentMethod,
//     };

//     onComplete(userData);
//   };

//   const currentSelectedAddress = selectedAddress === "current" ? currentAddress : selectedAddress;

//   return (
//     <div className="space-y-6">
//       {/* Customer Information Section (for sale role) */}
//       {user?.role === "sale" && (
//         <div className="bg-white p-6 rounded-xl border border-gray-200">
//           <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
          
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Customer Name *
//               </label>
//               <input
//                 type="text"
//                 value={customerName}
//                 onChange={(e) => setCustomerName(e.target.value)}
//                 placeholder="Enter customer name"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Customer Phone *
//               </label>
//               <input
//                 type="tel"
//                 value={customerPhone}
//                 onChange={(e) => setCustomerPhone(e.target.value)}
//                 placeholder="Enter customer phone number"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 required
//               />
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Shipping Address Section */}
//       <div className="bg-white p-6 rounded-xl border border-gray-200">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-lg font-semibold text-gray-800">Shipping Address</h3>
//           <span className="text-sm text-gray-500">Step 1 of 3</span>
//         </div>

//         {/* Current Location */}
//         {user?.role !== "sale" && (
//           <div
//             onClick={handleDetectCurrentLocation}
//             className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition mb-4 ${
//               selectedAddress === "current" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
//             } ${isDetectingLocation ? "opacity-70" : ""}`}
//           >
//             <div className="flex items-center gap-3">
//               <span className="text-blue-500 text-xl">📍</span>
//               <div>
//                 <p className="font-semibold">Current Location</p>
//                 <p className="text-sm text-gray-500">
//                   {isDetectingLocation
//                     ? "Detecting your location..."
//                     : currentAddress
//                     ? "Click to use current location"
//                     : "Click to detect location"}
//                 </p>
//               </div>
//             </div>
//             {isDetectingLocation && (
//               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
//             )}
//           </div>
//         )}

//         {/* Saved Addresses */}
//         <div className="space-y-3 mb-4">
//           {savedAddresses.map((addr) => (
//             <div
//               key={addr.id}
//               onClick={() => handleSelectSavedAddress(addr)}
//               className={`p-4 rounded-xl border cursor-pointer transition ${
//                 currentSelectedAddress && (currentSelectedAddress as ExtendedAddress).id === addr.id
//                   ? "border-blue-500 bg-blue-50"
//                   : "border-gray-200 hover:bg-gray-50"
//               }`}
//             >
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="font-semibold">{addr.label}</p>
//                   <p className="text-sm text-gray-600 mt-1">{addr.details}</p>
//                   {addr.phone && (
//                     <p className="text-sm text-gray-600 mt-1">
//                       Phone: {addr.phone}
//                     </p>
//                   )}
//                 </div>
//                 <span className="text-blue-500 text-lg">📍</span>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Add New Address Button / Form */}
//         {isAdding ? (
//           <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
//             <h4 className="font-medium text-gray-700 mb-3">
//               {user?.role === "sale" ? "Add Customer Address" : "Add New Address"}
//             </h4>
            
//             {/* Address Details */}
//             {user?.role !== "sale" && (
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Address Label *
//                 </label>
//                 <input
//                   type="text"
//                   placeholder="Home, Work, etc."
//                   value={tempAddress.label || ""}
//                   onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//               </div>
//             )}

//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Address Details *
//               </label>
//               <textarea
//                 placeholder="Street, building, floor, notes..."
//                 value={tempAddress.details || ""}
//                 onChange={(e) => setTempAddress({ ...tempAddress, details: e.target.value })}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 rows={3}
//               />
//             </div>

//             {/* Location Picker */}
//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Select Location on Map *
//               </label>
//               <input
//                 type="text"
//                 readOnly
//                 value={
//                   tempAddress.coordinates
//                     ? `Lat: ${tempAddress.coordinates.lat.toFixed(5)}, Lng: ${tempAddress.coordinates.lng.toFixed(5)}`
//                     : ""
//                 }
//                 onClick={() => setShowMap(true)}
//                 className="w-full p-3 border border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50"
//                 placeholder="Click to select location"
//               />
//             </div>

//             <div className="flex gap-3">
//               <button
//                 onClick={handleSaveNewAddress}
//                 className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
//                 disabled={
//                   !tempAddress.details?.trim() ||
//                   !tempAddress.coordinates ||
//                   (user?.role === "sale" 
//                     ? (!customerName.trim() || !customerPhone.trim())
//                     : (!tempAddress.label?.trim() || !userPhone?.trim()))
//                 }
//               >
//                 Save Address
//               </button>
//               <button
//                 onClick={() => setIsAdding(false)}
//                 className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         ) : (
//           <button
//             onClick={() => setIsAdding(true)}
//             className="w-full py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl hover:bg-gray-100 font-medium flex items-center justify-center gap-2"
//           >
//             <span className="text-xl">+</span>
//             {user?.role === "sale" ? "Add New Customer Address" : "Add New Address"}
//           </button>
//         )}
//       </div>

//       {/* Map Modal */}
//       {showMap && (
//         <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
//           <div className="bg-white rounded-lg p-4 w-[90%] max-w-lg max-h-[90vh] overflow-auto">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-lg font-semibold">Select Location</h3>
//               <button
//                 onClick={() => setShowMap(false)}
//                 className="text-gray-500 hover:text-gray-700 text-xl p-1"
//               >
//                 ✕
//               </button>
//             </div>

//             <GoogleMap
//               mapContainerStyle={containerStyle}
//               center={tempAddress.coordinates || { lat: 11.567, lng: 104.928 }}
//               zoom={15}
//               onClick={handleMapClick}
//             >
//               {tempAddress.coordinates && (
//                 <Marker
//                   position={tempAddress.coordinates}
//                   draggable
//                   onDragEnd={handleMarkerDragEnd}
//                 />
//               )}
//             </GoogleMap>

//             <div className="mt-4 p-3 bg-gray-50 rounded-lg">
//               <p className="text-sm font-medium text-gray-700">Selected Coordinates:</p>
//               {tempAddress.coordinates ? (
//                 <p className="text-sm text-gray-600 mt-1">
//                   Lat: {tempAddress.coordinates.lat.toFixed(6)}
//                   <br />
//                   Lng: {tempAddress.coordinates.lng.toFixed(6)}
//                 </p>
//               ) : (
//                 <p className="text-sm text-gray-500 mt-1">Click on the map to select location</p>
//               )}
//             </div>

//             <div className="flex justify-end gap-2 mt-4">
//               <button
//                 onClick={() => setShowMap(false)}
//                 className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//               >
//                 Select Location
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Payment Method Section */}
//       <div className="bg-white p-6 rounded-xl border border-gray-200">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-lg font-semibold text-gray-800">Payment Method</h3>
//           <span className="text-sm text-gray-500">Step 2 of 3</span>
//         </div>

//         <div className="space-y-3">
//           {paymentMethods.map((method) => (
//             <div
//               key={method.name}
//               onClick={() => handlePaymentMethodSelect(method.name)}
//               className={`cursor-pointer border rounded-xl p-4 transition ${
//                 paymentMethod === method.name
//                   ? "border-blue-500 bg-blue-50"
//                   : "border-gray-200 hover:bg-gray-50"
//               }`}
//             >
//               <div className="flex items-center gap-4">
//                 <img
//                   src={method.image}
//                   alt={method.name}
//                   className="w-10 h-10 object-contain"
//                 />
//                 <p className="font-semibold text-gray-700">{method.name}</p>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Continue Button */}
//       <button
//         onClick={handleContinue}
//         disabled={!selectedAddress || !paymentMethod}
//         className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:bg-blue-300 disabled:cursor-not-allowed transition"
//       >
//         Continue to Order Review
//       </button>
//     </div>
//   );
// };

// export default UserInformationForm;