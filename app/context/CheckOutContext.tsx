"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";
import { getShortAddress } from "./utils/geocode";
import { useRouter } from "next/navigation";

export type CartItem = {
  id: number;
  title: string;
  price: number;
  image?: string;
  qty: number;
};

export type RewardItem = {
  product_id: number;
  name: string;
  points_at_reward: number;
  qty: number;
  image?: string;
};

export type Address = {
  id?: number;
  label: string;
  details?: string;
  phone?: string;
  coordinates?: { lat: number; lng: number };
  short_address?: string;
};

type Coordinates = {
  lat: number;
  lng: number;
} | null;

// NEW: Customer Information Type
export type CustomerInfo = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  coordinates: Coordinates; 
};

type CheckoutContextType = {
  cart: CartItem[];
  total: number;
  addToCart: (product: Omit<CartItem, "qty">, deltaQty: number) => void;
  updateItemQty: (id: number, qty: number) => void;
  removeItem: (id: number) => void;

  rewards: RewardItem[];
  totalPoints: number;
  addReward: (reward: Omit<RewardItem, "qty">, deltaQty: number) => void;
  updateRewardQty: (product_id: number, qty: number) => void;
  removeReward: (product_id: number) => void;

  selectedAddress: Address | "current" | null;
  setSelectedAddress: (addr: Address | "current") => void;
  currentAddress: Address;
  setCurrentAddress: (addr: Address) => void;
  detectCurrentLocation: () => Promise<Address>;

  // NEW: Customer Information State
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo | ((prev: CustomerInfo) => CustomerInfo)) => void;
  updateCustomerInfo: (field: keyof CustomerInfo, value: any) => void;

  paymentMethod: string;
  setPaymentMethod: (method: string) => void;

  placeOrder: () => Promise<void>;
  placeOrderWithCustomerInfo: () => Promise<void>; // NEW: For orders with customer info
  placeRewardOrder: () => Promise<void>;
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const [selectedAddress, setSelectedAddress] = useState<Address | "current" | null>(null);
  const [currentAddress, setCurrentAddress] = useState<Address>({
    label: "Current Location",
    details: "",
    phone: user?.phone || user?.mobile || "",
    coordinates: { lat: 0, lng: 0 },
  });

  // NEW: Customer Information State
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    notes: "",
    coordinates: { lat: 0, lng: 0 },
  });

  const [paymentMethod, setPaymentMethod] = useState("QR");
  const userPoints = user?.reward_points?.available || 0;

  // Update currentAddress phone and customer info when user changes
  useEffect(() => {
    if (user) {
      const userPhone = user.phone || user.mobile;
      const userName = user.name || "";
      
      // Update current address phone
      if (userPhone && userPhone !== currentAddress.phone) {
        setCurrentAddress(prev => ({
          ...prev,
          phone: userPhone
        }));
      }

      // Auto-fill customer info for regular users
      if (user?.role !== "sale") {
        setCustomerInfo(prev => ({
          ...prev,
          name: userName || prev.name,
          phone: userPhone || prev.phone
        }));
      }
    }
  }, [user]);

  // NEW: Helper to update specific customer info field
  const updateCustomerInfo = (field: keyof CustomerInfo, value: any) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const recalcTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const recalcTotalPoints = (items: RewardItem[]) => items.reduce((sum, i) => sum + i.points_at_reward * i.qty, 0);

  // --- CART METHODS ---
  const addToCart = (product: Omit<CartItem, "qty">, deltaQty: number) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === product.id);
      if (idx === -1 && deltaQty > 0) {
        const newItems = [...prev, { ...product, qty: deltaQty }];
        setTotal(recalcTotal(newItems));
        return newItems;
      }
      if (idx === -1) return prev;

      const existing = prev[idx];
      const newQty = existing.qty + deltaQty;
      if (newQty <= 0) {
        const newItems = prev.filter(i => i.id !== product.id);
        setTotal(recalcTotal(newItems));
        return newItems;
      }
      const updated = { ...existing, qty: newQty };
      const newItems = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      setTotal(recalcTotal(newItems));
      return newItems;
    });
  };

  const updateItemQty = (id: number, qty: number) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx === -1) return prev;
      if (qty <= 0) {
        const newItems = prev.filter(i => i.id !== id);
        setTotal(recalcTotal(newItems));
        return newItems;
      }
      const updated = { ...prev[idx], qty };
      const newItems = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      setTotal(recalcTotal(newItems));
      return newItems;
    });
  };

  const removeItem = (id: number) => {
    setCart(prev => {
      const newItems = prev.filter(i => i.id !== id);
      setTotal(recalcTotal(newItems));
      return newItems;
    });
  };

  // --- REWARD METHODS ---
  const addReward = (reward: Omit<RewardItem, "qty">, deltaQty: number) => {
    setRewards(prev => {
      const idx = prev.findIndex(r => r.product_id === reward.product_id);
      const existingQty = idx === -1 ? 0 : prev[idx].qty;
      const newQty = existingQty + deltaQty;

      const newTotalPoints = prev.reduce((sum, r, i) => {
        if (i === idx) return sum + newQty * reward.points_at_reward;
        return sum + r.qty * r.points_at_reward;
      }, 0) + (idx === -1 ? deltaQty * reward.points_at_reward : 0);

      if (newTotalPoints > userPoints) {
        setTimeout(() => {
          toast.error("You don't have enough reward points!", { autoClose: 2000 });
        }, 0);
        return prev;
      }

      if (idx === -1 && deltaQty > 0) return [...prev, { ...reward, qty: deltaQty }];
      if (newQty <= 0) return prev.filter(r => r.product_id !== reward.product_id);

      const updated = { ...prev[idx], qty: newQty };
      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
    });
  };

  const updateRewardQty = (product_id: number, qty: number) => {
    setRewards(prev => {
      const idx = prev.findIndex(r => r.product_id === product_id);
      if (idx === -1) return prev;
      if (qty <= 0) {
        const newItems = prev.filter(r => r.product_id !== product_id);
        setTotalPoints(recalcTotalPoints(newItems));
        return newItems;
      }
      const updated = { ...prev[idx], qty };
      const newItems = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      setTotalPoints(recalcTotalPoints(newItems));
      return newItems;
    });
  };

  const removeReward = (product_id: number) => {
    setRewards(prev => {
      const newItems = prev.filter(r => r.product_id !== product_id);
      setTotalPoints(recalcTotalPoints(newItems));
      return newItems;
    });
  };

  // --- PLACE ORDER (ORIGINAL) ---
// NEW: Place Order with Customer Information
const placeOrder= async () => {
  // Validate customer information
  if (user?.role === "sale") {
    // For sale role, validate customer info
    if (!customerInfo.name.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error("Please enter customer phone number");
      return;
    }
  } else {
    // For regular users, validate their info
    if (!customerInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerInfo.phone.trim() && !(user?.phone || user?.mobile)) {
      toast.error("Please enter your phone number");
      return;
    }
  }

  // Validate coordinates
  if (!customerInfo.coordinates || !customerInfo.coordinates.lat || !customerInfo.coordinates.lng) {
    toast.error("Please select a location on the map");
    return;
  }

  if (cart.length === 0) {
    toast.error("Your cart is empty");
    return;
  }

  if (!paymentMethod) {
    toast.error("Please select a payment method");
    return;
  }

  // For new customer info flow, we still need an address
  let addressToSend: Address | null = null;
  if (selectedAddress === "current") {
    if (!currentAddress.coordinates) {
      toast.error("Current address coordinates not set!");
      return;
    }
    
    const userPhone = user?.phone || user?.mobile;
    if (!userPhone) {
      toast.error("Please add your phone number in your account settings");
      return;
    }
    
    const short_address = await getShortAddress(currentAddress.coordinates.lat, currentAddress.coordinates.lng);
    addressToSend = { 
      ...currentAddress, 
      short_address,
      phone: userPhone
    };
  } else {
    addressToSend = selectedAddress as Address;
  }

  if (!addressToSend) {
    toast.error("Please select a shipping address");
    return;
  }

  // Prepare the payload - Using existing /store-order structure
  const payload = {
    api_user_id: user?.id,
    saved_address_id: selectedAddress !== "current" ? addressToSend.id : undefined,
    address: selectedAddress === "current" ? addressToSend : undefined,
    address_type: selectedAddress === "current" ? "current" : "saved",
    paymentMethod,
    total_qty: cart.reduce((sum, i) => sum + i.qty, 0),
    total,
    items: cart.map(i => ({
      product_id: i.id,
      qty: i.qty,
      price_at_order: i.price,
      total_line: Number((i.price * i.qty).toFixed(2)),
      image_url: (i.image ?? "").split("/").pop(),
    })),
    // ADD customer info to the existing payload structure
    customer_info: {
      name: customerInfo.name.trim(),
      phone: customerInfo.phone.trim() || user?.phone || user?.mobile || "",
      email: customerInfo.email?.trim() || "",
      notes: customerInfo.notes?.trim() || "",
      latitude: customerInfo.coordinates.lat,
      longitude: customerInfo.coordinates.lng,
    },
  };

  try {
    console.log("Sending order with customer info payload:", payload);
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sales-order/save-customer-info`, payload, {
      withCredentials: true,
      headers: { Accept: "application/json" },
    });
    
    if (res.data?.success) {
      toast.success("Order placed successfully!");
      
      // Show customer info for sale role
      if (user?.role === "sale") {
        toast.info(`Customer: ${customerInfo.name}, Phone: ${customerInfo.phone}`);
      }
      
      // Clear cart and customer info
      setCart([]);
      setTotal(0);
      setCustomerInfo({
        name: "",
        phone: "",
        email: "",
        notes: "",
        coordinates: { lat: 0, lng: 0 },
      });
      
      router.push(`/checkout/order-success?telegram=${encodeURIComponent(res.data.telegram_start_link)}`);
    } else {
      toast.error(res.data?.message || "Failed to place order");
    }
  } catch (err: any) {
    console.error("Order error:", err.response?.data || err);
    toast.error(err.response?.data?.message || "Order failed. Please try again.");
  }
};

  // NEW: Place Order with Customer Information
  const placeOrderWithCustomerInfo = async () => {
    // Validate customer information
    if (user?.role === "sale") {
      // For sale role, validate customer info
      if (!customerInfo.name.trim()) {
        toast.error("Please enter customer name");
        return;
      }
      if (!customerInfo.phone.trim()) {
        toast.error("Please enter customer phone number");
        return;
      }
    } else {
      // For regular users, validate their info
      if (!customerInfo.name.trim()) {
        toast.error("Please enter your name");
        return;
      }
      if (!customerInfo.phone.trim() && !(user?.phone || user?.mobile)) {
        toast.error("Please enter your phone number");
        return;
      }
    }

    // Validate coordinates
    if (!customerInfo.coordinates) {
      toast.error("Please select a location on the map");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      const payload = {
        api_user_id: user?.id,
        user_role: user?.role,
        
        // ✅ Send customer info at ROOT LEVEL (not nested)
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        customer_email: customerInfo.email?.trim() || "",
        customer_notes: customerInfo.notes?.trim() || "",
        latitude: customerInfo.coordinates?.lat || 0,
        longitude: customerInfo.coordinates?.lng || 0,
        
        // Order Information
        payment_method: paymentMethod,
        total_qty: cart.reduce((sum, item) => sum + item.qty, 0),
        total_amount: total, 
        cart_items: cart.map((item) => ({
          product_id: item.id,
          qty: item.qty,
          price_at_order: item.price,
          total_line: item.price * item.qty,
          image_url: item.image || null,
        })),
      };
  
      console.log("Sending order with customer info (ROOT LEVEL):", payload);
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sales-order/complete-order`, payload, {
        withCredentials: true,
        headers: { 
          Accept: "application/json",
          'Content-Type': 'application/json'
        },
      });
      
      if (res.data?.success) {
        toast.success("Order placed successfully!");
        
        // Show customer info for sale role
        if (user?.role === "sale") {
          toast.info(`Customer: ${customerInfo.name}, Phone: ${customerInfo.phone}`);
        }
        
        // Clear cart and customer info
        setCart([]);
        setTotal(0);
        setCustomerInfo({
          name: "",
          phone: "",
          email: "",
          notes: "",
          coordinates: { lat: 0, lng: 0 },
        });
        
        // Redirect to confirmation page
        const orderId = res.data.order_id;
        router.push(`/checkout/order-success?telegram=${encodeURIComponent(res.data.telegram_start_link)}`);
      } else {
        toast.error(res.data?.message || "Failed to place order");
      }
    } catch (err: any) {
      console.error("Order with customer info error:", err.response?.data || err);
      toast.error(err.response?.data?.message || "Order failed. Please try again.");
    }
  };

  // --- PLACE REWARD ORDER ---
  const placeRewardOrder = async () => {
    if (rewards.length === 0) {
      toast.error("No reward products selected!");
      return;
    }
    const payload = {
      api_user_id: user?.id,
      total_points: totalPoints,
      items: rewards.map(r => ({
        product_id: r.product_id,
        qty: r.qty,
        points_at_reward: r.points_at_reward,
      })),
    };

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/store-reward-order`, payload, {
        withCredentials: true,
        headers: { Accept: "application/json" },
      });
      if (res.data?.success) {
        toast.success("Reward order placed successfully!");
        setRewards([]);
        setTotalPoints(0);
        router.push(`/checkout/reward-success`);
      }
    } catch (err: any) {
      toast.error("Reward order failed. Please try again.");
      console.error(err);
    }
  };

  const detectCurrentLocation = async () => {
    return new Promise<Address>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coordinates = { lat: latitude, lng: longitude };

          const userPhone = user?.phone || user?.mobile;
  
          try {
            const short_address = await getShortAddress(latitude, longitude);
  
            const currentAddr: Address = {
              label: "Current Location",
              details: short_address || "Your current position",
              phone: userPhone || "",
              coordinates,
              short_address,
            };
  
            setCurrentAddress(currentAddr);
            
            // Also update customer coordinates if they haven't selected one yet
            if (!customerInfo.coordinates) {
              setCustomerInfo(prev => ({
                ...prev,
                coordinates: { lat: latitude, lng: longitude }
              }));
            }
            
            resolve(currentAddr);
          } catch (err) {
            const fallbackAddr: Address = {
              label: "Current Location",
              details: "Detected location",
              phone: userPhone || "",
              coordinates,
            };
            setCurrentAddress(fallbackAddr);
            resolve(fallbackAddr);
          }
        },
        (error) => {
          let message = "Unable to retrieve your location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied. Please enable it in browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out.";
              break;
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  };

  return (
    <CheckoutContext.Provider
      value={{
        cart,
        total,
        addToCart,
        updateItemQty,
        removeItem,
        rewards,
        totalPoints,
        addReward,
        updateRewardQty,
        removeReward,
        selectedAddress,
        setSelectedAddress,
        currentAddress,
        setCurrentAddress,
        detectCurrentLocation,
        customerInfo, // NEW
        setCustomerInfo, // NEW
        updateCustomerInfo, // NEW
        paymentMethod,
        setPaymentMethod,
        placeOrder,
        placeOrderWithCustomerInfo, // NEW
        placeRewardOrder,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error("useCheckout must be used within CheckoutProvider");
  return context;
};