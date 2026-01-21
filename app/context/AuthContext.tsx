"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useRef,
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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      phone: userData.phone || null,
      mobile: userData.mobile || null,
      profile_url: userData.profile_url || null,
      reward_points: userData.reward_points || {
        total: 0,
        used: 0,
        expired: 0,
        available: 0
      }
    };
  };

  // 🔹 Restore user on mount - SIMPLIFIED
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔄 Fetching user on mount...');
        
        const res = await api.get("/user");
        
        const userData = extractUserFromResponse(res.data);
        
        if (userData) {
          console.log('✅ User found');
          setUser(userData);
        } else {
          console.log('❌ No valid user data');
          setUser(null);
        }
      } catch (err: any) {
        console.error("Auth restore failed:", err.message);
        
        // Don't automatically redirect - let components handle
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    
    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // 🔹 Refresh user data - SIMPLIFIED
  const refreshUser = async (): Promise<void> => {
    try {
      const response = await api.get(`/user`);
      
      const newUser = extractUserFromResponse(response.data);
      
      if (!newUser) {
        setUser(null);
        return;
      }
      
      setUser(newUser);
      
    } catch (error: any) {
      console.error('Failed to refresh user:', error.message);
      
      // Only clear user if it's an auth error
      if (error.response?.status === 401) {
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

  // 🔹 Login - SIMPLIFIED
  const login = async (phone: string, username: string) => {
    setLoading(true);
    try {
      const res = await api.post("/login", { phone, name: username });

      if (res.data.success) {
        const userData = extractUserFromResponse(res.data);
        if (userData) {
          setUser(userData);
          router.push("/");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Logout
  const logout = async () => {
    try {
      await api.post("/logout");
      
      if (isSafari()) {
        localStorage.removeItem('auth_token');
      }
    } catch (error: any) {
      console.error("Logout error:", error.message);
    }
    
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