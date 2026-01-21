"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import api, { isSafari } from "@/api/api";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  phone?: string | null;
  mobile?: string | null;
  profile_url?: string | null;
  reward_points: {
    total: number;
    used: number;
    expired: number;
    available: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🔹 Store phone number in localStorage
  const storePhone = (phone: string) => {
    localStorage.setItem('user_phone', phone);
  };

  const getStoredPhone = (): string | null => {
    return localStorage.getItem('user_phone');
  };

  const clearStoredPhone = () => {
    localStorage.removeItem('user_phone');
  };

  // 🔹 Unified function to extract user data
  const extractUserFromResponse = (responseData: any): User | null => {
    if (!responseData) return null;
    
    let userData;
    
    if (responseData.user) {
      userData = responseData.user;
    } else if (responseData.id) {
      userData = responseData;
    } else {
      return null;
    }
    
    return {
      id: userData.id || 0,
      name: userData.name || '',
      phone: userData.phone || userData.mobile || null,
      mobile: userData.mobile || userData.phone || null,
      profile_url: userData.profile_url || null,
      reward_points: userData.reward_points || {
        total: 0,
        used: 0,
        expired: 0,
        available: 0
      }
    };
  };

  // 🔹 Restore user on mount using stored phone
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedPhone = getStoredPhone();
        
        if (!storedPhone) {
          console.log('No stored phone number found');
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log('🔄 Fetching user using stored phone:', storedPhone);
        
        // Use the getUserByPhone endpoint with query parameter
        const res = await api.get(`/user/phone?phone=${encodeURIComponent(storedPhone)}`);
        
        const userData = extractUserFromResponse(res.data);
        
        if (userData) {
          console.log('✅ User restored from stored phone');
          setUser(userData);
        } else {
          console.log('❌ No valid user data');
          clearStoredPhone();
          setUser(null);
        }
      } catch (err: any) {
        console.error("Auth restore failed:", err.message);
        clearStoredPhone();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // 🔹 Refresh user data
  const refreshUser = async (): Promise<void> => {
    try {
      const storedPhone = getStoredPhone();
      
      if (!storedPhone) {
        setUser(null);
        return;
      }
      
      const response = await api.get(`/user/phone?phone=${encodeURIComponent(storedPhone)}`);
      const newUser = extractUserFromResponse(response.data);
      
      if (!newUser) {
        clearStoredPhone();
        setUser(null);
        return;
      }
      
      setUser(newUser);
      
    } catch (error: any) {
      console.error('Failed to refresh user:', error.message);
      
      if (error.response?.status === 404 || error.response?.status === 401) {
        clearStoredPhone();
        setUser(null);
      }
      
      throw error;
    }
  };

  // 🔹 Update user data
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  // 🔹 Enhanced login with phone storage
  const login = async (phone: string, username: string) => {
    setLoading(true);
    
    try {
      console.log('🔐 Attempting login with:', { phone, username });
      
      // Clean phone number
      const cleanPhone = phone.replace(/\D+/g, '');
      
      // Use the login endpoint
      const res = await api.post("/login", { 
        phone: cleanPhone, 
        name: username
      });
      
      console.log('✅ Login successful');
      
      // Store phone number in localStorage
      storePhone(cleanPhone);
      
      // Extract user data from response
      const userData = extractUserFromResponse(res.data);
      
      if (userData) {
        console.log('✅ User loaded after login:', userData.name);
        setUser(userData);
        router.push("/");
      } else {
        // Fallback: fetch user by phone
        try {
          const userRes = await api.get(`/user/phone?phone=${encodeURIComponent(cleanPhone)}`);
          const fetchedUser = extractUserFromResponse(userRes.data);
          
          if (fetchedUser) {
            setUser(fetchedUser);
            router.push("/");
          } else {
            throw new Error('Could not fetch user data');
          }
        } catch (fetchErr) {
          console.warn('⚠️ Could not fetch user after login, but phone is stored');
          router.push("/");
        }
      }
      
    } catch (err: any) {
      console.error('🔴 Login failed:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      
      // Clear stored phone on failed login
      clearStoredPhone();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Enhanced Logout
  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (error: any) {
      console.error("Logout error:", error);
    }
    
    // Always clear stored phone
    clearStoredPhone();
    setUser(null);
    router.push("/sign-in");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      refreshUser, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
};