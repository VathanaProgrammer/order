"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { 
  apiGet, 
  apiPost, 
  setAuthToken, 
  clearAuthToken, 
  getAuthToken,
  isSafari,
  refreshToken 
} from "@/api/api";
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

  // Extract user data
  const extractUserFromResponse = useCallback((responseData: any): User | null => {
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
  }, []);

  // Fetch user with retry logic
  const fetchUser = useCallback(async (retryCount = 0): Promise<User | null> => {
    try {
      console.log(`🔄 Fetching user (attempt ${retryCount + 1})...`);
      
      const response = await apiGet("/user");
      const userData = extractUserFromResponse(response.data);
      
      if (userData) {
        console.log('✅ User fetched:', userData.name);
        return userData;
      }
      
      return null;
    } catch (error: any) {
      console.error(`🔴 Fetch user failed (attempt ${retryCount + 1}):`, error.message);
      
      // If 401 and Safari, try to refresh token once
      if (error.response?.status === 401 && isSafari() && retryCount === 0) {
        try {
          console.log('🔄 Token expired, attempting refresh...');
          await refreshToken();
          // Retry once after refresh
          return fetchUser(1);
        } catch (refreshError) {
          console.error('🔴 Token refresh failed:', refreshError);
          clearAuthToken();
          return null;
        }
      }
      
      return null;
    }
  }, [extractUserFromResponse]);

  // Initial user fetch
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userData = await fetchUser();
        setUser(userData);
      } catch (error) {
        console.error('🔴 Initial auth failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUser]);

  // Refresh user
  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await fetchUser();
      setUser(userData);
    } catch (error) {
      console.error('🔴 Refresh user failed:', error);
      throw error;
    }
  };

  // Update user
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  // Login - SIMPLE and RELIABLE
  const login = async (phone: string, username: string) => {
    setLoading(true);
    try {
      console.log('🔐 Logging in...');
      
      const response = await apiPost("/login", { phone, name: username });
      
      if (response.data.success) {
        console.log('✅ Login successful');
        
        // Save token if returned (for Safari)
        if (response.data.token) {
          setAuthToken(response.data.token);
        }
        
        // Fetch user data immediately
        const userData = await fetchUser();
        
        if (userData) {
          setUser(userData);
          router.push("/");
        } else {
          throw new Error("Could not fetch user data after login");
        }
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      console.error('🔴 Login failed:', error.message);
      clearAuthToken();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await apiPost("/logout", {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    
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