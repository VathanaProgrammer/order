"use client";
import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useSalesAuth } from "./SalesAuthContext";
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
  label: any;
  details?: string;
  phone?: string;
  coordinates?: { lat: number; lng: number };
  short_address?: string;
  customer_name?: string;
  customer_email?: string;
  customer_company?: string;
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

  paymentMethod: string;
  setPaymentMethod: (method: string) => void;

  placeOrder: () => Promise<void>;
  placeRewardOrder: () => Promise<void>;
  
  isSalesMode: boolean;
  salespersonName: string;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  setCustomerInfo: (info: { name: string; phone: string; email: string }) => void;
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const { user: regularUser, logout: regularLogout } = useAuth();
  const { salesUser, isSalesAuthenticated, salesLogout } = useSalesAuth();
  const router = useRouter();

  const activeUser = isSalesAuthenticated ? salesUser : regularUser;
  const isSalesMode = isSalesAuthenticated;
  const salespersonName = salesUser?.name || "Sales Staff";

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const [selectedAddress, setSelectedAddress] = useState<Address | "current" | null>(null);
  const [currentAddress, setCurrentAddress] = useState<Address>({
    label: "Current Location",
    details: "",
    phone: activeUser?.phone || "",
    coordinates: { lat: 0, lng: 0 },
  });

  const [paymentMethod, setPaymentMethod] = useState("QR");
  const userPoints = regularUser?.reward_points?.available || 0;

  // Enhanced token retrieval with fallbacks
  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;

    // For sales mode
    if (isSalesMode) {
      // Check localStorage first
      let token = localStorage.getItem('sales_token');
      if (token) return token;
      
      // Check sessionStorage
      token = sessionStorage.getItem('sales_token');
      if (token) return token;
      
      // Check for any token in URL (OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token') || urlParams.get('access_token');
      if (urlToken) {
        localStorage.setItem('sales_token', urlToken);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        return urlToken;
      }
    } 
    // For regular users
    else {
      // Check localStorage
      let token = localStorage.getItem('auth_token');
      if (token) return token;
      
      // Check sessionStorage
      token = sessionStorage.getItem('auth_token');
      if (token) return token;
      
      // Check URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token') || urlParams.get('access_token');
      if (urlToken) {
        localStorage.setItem('auth_token', urlToken);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        return urlToken;
      }
    }

    return null;
  };

  // Function to clear all tokens
  const clearAllTokens = () => {
    if (typeof window === 'undefined') return;
    
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('sales_token');
    localStorage.removeItem('token');
    
    // Clear sessionStorage
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('sales_token');
    sessionStorage.removeItem('token');
    
    // Clear cookies
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'sales_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Clear axios default headers
    delete axios.defaults.headers.common["Authorization"];
    
    console.log('🧹 All tokens cleared');
  };

  // Function to handle 401 errors
  const handleUnauthorizedError = (error: any, isSalesMode: boolean) => {
    console.error('🔐 401 Unauthorized error:', error);
    
    // Clear all tokens
    clearAllTokens();
    
    // Call appropriate logout
    if (isSalesMode) {
      if (salesLogout) salesLogout();
      toast.error("Sales session expired. Please log in again.");
      setTimeout(() => router.push('/sales/login'), 1000);
    } else {
      if (regularLogout) regularLogout();
      toast.error("Session expired. Please log in again.");
      setTimeout(() => router.push('/login'), 1000);
    }
  };

  useEffect(() => {
    if (activeUser) {
      const userPhone = activeUser.phone;
      if (userPhone && userPhone !== currentAddress.phone) {
        setCurrentAddress(prev => ({
          ...prev,
          phone: userPhone
        }));
      }
    }
  }, [activeUser]);

  useEffect(() => {
    if (isSalesMode && selectedAddress && selectedAddress !== "current") {
      const address = selectedAddress as Address;
      if (address.label && address.phone) {
        setCustomerInfo(prev => ({
          ...prev,
          name: address.label || prev.name,
          phone: address.phone || prev.phone
        }));
      }
    }
  }, [selectedAddress, isSalesMode]);

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

  // --- PLACE ORDER ---
  const placeOrder = async () => {
    let addressToSend: Address | null = null;
    let customerName = "";
    let customerPhone = "";
    
    if (selectedAddress === "current") {
      if (!currentAddress.coordinates) {
        toast.error("Current address coordinates not set!");
        return;
      }
      
      if (isSalesMode) {
        if (!customerInfo.name || !customerInfo.phone) {
          toast.error("Please enter customer name and phone number");
          return;
        }
        
        customerName = customerInfo.name;
        customerPhone = customerInfo.phone;
        
        const short_address = await getShortAddress(currentAddress.coordinates.lat, currentAddress.coordinates.lng);
        addressToSend = { 
          ...currentAddress, 
          short_address,
          phone: customerPhone,
          label: customerName,
          details: `Customer address: ${short_address}`,
        };
      } else {
        const userPhone = regularUser?.mobile || regularUser?.phone || "";
        
        if (!userPhone) {
          toast.error("Please add your phone number in your account settings");
          return;
        }
        
        customerName = regularUser?.name || "Customer";
        customerPhone = userPhone;
        
        const short_address = await getShortAddress(currentAddress.coordinates.lat, currentAddress.coordinates.lng);
        addressToSend = { 
          ...currentAddress, 
          short_address,
          phone: customerPhone,
          label: customerName,
        };
      }
    } else {
      addressToSend = selectedAddress as Address;
      
      if (!addressToSend) {
        toast.error("Please select an address!");
        return;
      }
      
      if (isSalesMode) {
        if (addressToSend.label && addressToSend.phone) {
          customerName = addressToSend.label;
          customerPhone = addressToSend.phone;
        } else {
          if (!customerInfo.name || !customerInfo.phone) {
            toast.error("Please enter customer name and phone number");
            return;
          }
          customerName = customerInfo.name;
          customerPhone = customerInfo.phone;
          
          addressToSend.phone = customerPhone;
          addressToSend.label = customerName;
        }
      } else {
        customerName = regularUser?.name || addressToSend.label || "Customer";
        customerPhone = addressToSend.phone || regularUser?.mobile || regularUser?.phone || "";
        
        if (!customerPhone) {
          toast.error("Saved address must have a phone number. Please update your address.");
          return;
        }
        
        if (!addressToSend.phone) {
          addressToSend.phone = customerPhone;
        }
      }
    }

    if (!addressToSend || cart.length === 0) {
      toast.error("Cart is empty or no address selected!");
      return;
    }

    if (!addressToSend.phone) {
      toast.error("Phone number is required for delivery");
      return;
    }

    let apiUserId: number;
    let salesUserId: number | undefined;
    let isSalesOrder = false;
    
    if (isSalesMode && salesUser) {
      isSalesOrder = true;
      salesUserId = salesUser.id;
      apiUserId = 20;
    } else if (regularUser) {
      apiUserId = regularUser.id;
      salesUserId = undefined;
      isSalesOrder = false;
    } else {
      toast.error("You must be logged in to place an order!");
      return;
    }

    const payload: any = {
      api_user_id: apiUserId,
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
    };

    if (isSalesOrder) {
      if (!customerName || !customerPhone) {
        toast.error("For sales orders, please enter customer name and phone");
        return;
      }
      
      payload.customer_info = {
        name: customerName,
        phone: customerPhone,
        email: customerInfo.email || undefined,
      };
      
      payload.sales_user_id = salesUserId;
      payload.sales_person_name = salespersonName;
      payload.is_sales_order = true;
    }

    try {
      const token = getAuthToken();
      
      console.log('🔍 Order Placement Details:', {
        mode: isSalesMode ? 'sales' : 'regular',
        tokenFound: !!token,
        tokenLength: token?.length,
        apiUserId,
        isSalesOrder,
        cartItems: cart.length,
        total,
        paymentMethod
      });
      
      if (!token) {
        toast.error("Authentication token missing. Please log in again.");
        clearAllTokens();
        setTimeout(() => {
          router.push(isSalesMode ? '/sales/login' : '/login');
        }, 1000);
        return;
      }

      // Create axios instance specifically for this request
      const apiInstance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove withCredentials for now to test if it's a cookie issue
      // withCredentials: true,

      const res = await apiInstance.post('/store-order', payload);
      
      if (res.data?.success) {
        toast.success("Order placed successfully!");
        
        if (isSalesOrder) {
          toast.info(`Customer: ${customerName}, Phone: ${customerPhone}`);
          if (res.data.salesperson_info?.name) {
            toast.info(`Salesperson: ${res.data.salesperson_info.name}`);
          }
        }
        
        setCart([]);
        setTotal(0);
        setCustomerInfo({ name: "", phone: "", email: "" });
        
        router.push(`/checkout/order-success?telegram=${encodeURIComponent(res.data.telegram_start_link)}&order_id=${res.data.order_id}`);
      }
    } catch (err: any) {
      console.error("❌ Order error:", err);
      
      if (err.response?.status === 401) {
        handleUnauthorizedError(err, isSalesMode);
        return;
      }
      
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat();
        errorMessages.forEach((msg: any) => toast.error(msg));
      } else if (err.message === 'Network Error') {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("Order failed. Please try again.");
      }
    }
  };

  // --- PLACE REWARD ORDER ---
  const placeRewardOrder = async () => {
    if (rewards.length === 0) {
      toast.error("No reward products selected!");
      return;
    }
    
    let apiUserId: number;
    
    if (isSalesMode && salesUser) {
      apiUserId = 20;
    } else {
      apiUserId = regularUser?.id || 0;
    }
    
    const payload = {
      api_user_id: apiUserId,
      total_points: totalPoints,
      items: rewards.map(r => ({
        product_id: r.product_id,
        qty: r.qty,
        points_at_reward: r.points_at_reward,
      })),
    };

    try {
      const token = getAuthToken();
      
      if (!token) {
        toast.error("Authentication token missing. Please log in again.");
        clearAllTokens();
        setTimeout(() => {
          router.push(isSalesMode ? '/sales/login' : '/login');
        }, 1000);
        return;
      }

      const apiInstance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await apiInstance.post('/store-reward-order', payload);
      
      if (res.data?.success) {
        toast.success("Reward order placed successfully!");
        setRewards([]);
        setTotalPoints(0);
        router.push(`/checkout/reward-success`);
      }
    } catch (err: any) {
      console.error("❌ Reward order error:", err);
      
      if (err.response?.status === 401) {
        handleUnauthorizedError(err, isSalesMode);
        return;
      }
      
      toast.error("Reward order failed. Please try again.");
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

          const userPhone = activeUser?.phone;
  
          try {
            const short_address = await getShortAddress(latitude, longitude);
  
            const currentAddr: Address = {
              label: activeUser?.name || "Current Location",
              details: short_address || "Your current position",
              phone: userPhone || "",
              coordinates,
              short_address,
            };
  
            setCurrentAddress(currentAddr);
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
        paymentMethod,
        setPaymentMethod,
        placeOrder,
        placeRewardOrder,
        isSalesMode,
        salespersonName,
        customerInfo,
        setCustomerInfo,
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