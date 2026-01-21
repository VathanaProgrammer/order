"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import api, { setAuthToken, clearAuthToken, getAuthToken } from "@/api/api";
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

  // 🔹 Extract user data from API response
  const extractUserFromResponse = (responseData: any): User | null => {
    if (!responseData) return null;
    
    let userData;
    
    if (responseData.user) {
      userData = responseData.user;
    } else if (responseData.data?.user) {
      userData = responseData.data.user;
    } else if (responseData.data?.id) {
      userData = responseData.data;
    } else if (responseData.id) {
      userData = responseData;
    } else {
      return null;
    }
    
    return {
      id: userData.id || 0,
      name: userData.name || 'Unknown User',
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

  // 🔹 Restore user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔄 Fetching user on mount...');
        console.log('🔑 Current token:', getAuthToken() ? 'Exists' : 'None');
        
        const res = await api.get("/user");
        
        console.log('📥 User API response:', res.data);
        
        const userData = extractUserFromResponse(res.data);
        
        if (userData) {
          console.log('✅ User found:', userData.name);
          setUser(userData);
        } else {
          console.log('❌ No user data in response');
          setUser(null);
        }
      } catch (err: any) {
        console.error("🔴 Auth restore failed:", err.message);
        console.error("🔴 Error status:", err.response?.status);
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
      const response = await api.get("/user");
      const newUser = extractUserFromResponse(response.data);
      
      if (newUser) {
        setUser(newUser);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('🔴 Failed to refresh user:', error.message);
      setUser(null);
      throw error;
    }
  };

  // 🔹 Update user data
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  // 🔹 Login - CRITICAL FIX FOR SAFARI
  const login = async (phone: string, username: string) => {
    setLoading(true);
    try {
      console.log('🔐 Attempting login...');
      
      const res = await api.post("/login", { phone, name: username });

      console.log('✅ Login response:', res.data);
      
      if (res.data.success) {
        // SAFARI: Save token if returned
        if (res.data.token) {
          setAuthToken(res.data.token);
        }
        
        // Try to get user data immediately
        try {
          const userResponse = await api.get("/user");
          const userData = extractUserFromResponse(userResponse.data);
          
          if (userData) {
            console.log('✅ User data loaded:', userData.name);
            setUser(userData);
            router.push("/");
          } else {
            throw new Error("Could not load user data");
          }
        } catch (userError: any) {
          console.warn('⚠️ Could not fetch user immediately:', userError.message);
          // Still proceed with login
          if (res.data.user) {
            const userData = extractUserFromResponse(res.data);
            setUser(userData);
          }
          router.push("/");
        }
      } else {
        throw new Error(res.data.message || "Login failed");
      }
    } catch (err: any) {
      console.error("🔴 Login error:", err.message);
      console.error("🔴 Error details:", err.response?.data);
      
      // Clear any stored token on login failure
      clearAuthToken();
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Logout
  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (error: any) {
      console.error("Logout error:", error.message);
    }
    
    // Always clear local auth state
    clearAuthToken();
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