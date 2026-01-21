"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { 
  apiGet, 
  apiPost, 
  setAuthToken, 
  clearAuthToken,
  isSafari 
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
  const extractUserFromResponse = (responseData: any): User | null => {
    if (!responseData) return null;
    
    let userData;
    
    if (responseData.user) {
      userData = responseData.user;
    } else if (responseData.data?.user) {
      userData = responseData.data.user;
    } else if (responseData.data) {
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

  // Fetch user data
  const fetchUserData = async (): Promise<User | null> => {
    try {
      console.log('🔄 Fetching user data...');
      
      const response = await apiGet("/user");
      
      console.log('📥 User response:', response.data);
      
      const userData = extractUserFromResponse(response.data);
      
      if (userData) {
        console.log('✅ User data loaded:', userData.name);
        return userData;
      }
      
      return null;
    } catch (error: any) {
      console.error('🔴 Failed to fetch user:', error.message);
      
      // If 401, clear token and return null
      if (error.response?.status === 401) {
        console.log('🔴 Unauthorized, clearing token');
        if (isSafari()) {
          clearAuthToken();
        }
      }
      
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserData();
        setUser(userData);
      } catch (error) {
        console.error('🔴 Initial load failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login - SIMPLE AND EFFECTIVE
  const login = async (phone: string, username: string) => {
    setLoading(true);
    
    try {
      console.log('🔐 Logging in...');
      
      // Step 1: Call login endpoint
      const loginResponse = await apiPost("/login", { 
        phone, 
        name: username 
      });
      
      console.log('✅ Login response:', loginResponse.data);
      
      if (!loginResponse.data.success) {
        throw new Error(loginResponse.data.message || "Login failed");
      }
      
      // Step 2: Save token if provided (for Safari)
      if (loginResponse.data.token) {
        setAuthToken(loginResponse.data.token);
        console.log('🔑 Token saved');
      }
      
      // Step 3: Try to get user data
      let userData;
      
      if (loginResponse.data.user) {
        // If user data is in login response, use it
        userData = extractUserFromResponse(loginResponse.data);
        console.log('✅ User data from login response');
      } else {
        // Otherwise fetch from /user endpoint
        userData = await fetchUserData();
        console.log('✅ User data from /user endpoint');
      }
      
      if (userData) {
        setUser(userData);
        router.push("/");
      } else {
        throw new Error("Could not get user data");
      }
      
    } catch (error: any) {
      console.error('🔴 Login failed:', error.message);
      
      // Clean up on failure
      if (isSafari()) {
        clearAuthToken();
      }
      
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
    
    // Always clear local state
    clearAuthToken();
    setUser(null);
    router.push("/sign-in");
  };

  // Refresh user
  const refreshUser = async () => {
    try {
      const userData = await fetchUserData();
      setUser(userData);
    } catch (error) {
      console.error('Refresh failed:', error);
      throw error;
    }
  };

  // Update user
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
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