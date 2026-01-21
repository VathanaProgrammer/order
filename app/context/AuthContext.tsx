"use client";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import api from "@/api/api";
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
  refreshUser: () => Promise<void>; // Keep as Promise<void>
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🔹 Unified function to extract user data from API response
  const extractUserFromResponse = (responseData: any): User | null => {
    console.log('Extracting user from:', responseData);
    
    let userData;
    
    // Check different possible structures
    if (responseData.user) {
      userData = responseData.user;
      console.log('Found user in responseData.user');
    } else if (responseData.data) {
      userData = responseData.data;
      console.log('Found user in responseData.data');
    } else if (responseData.id) {
      userData = responseData;
      console.log('Found user directly in responseData');
    } else {
      console.log('No user data found in response');
      return null;
    }
    
    console.log('Raw user data:', userData);
    
    // Format the user object
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

  // 🔹 Restore user from cookie on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔄 Fetching user on mount...');
        const res = await api.get("/user", { withCredentials: true });
        
        console.log('📥 User API response:', res.data);
        
        const userData = extractUserFromResponse(res.data);
        
        if (userData) {
          console.log('✅ Setting user in context:', userData);
          console.log('Points available:', userData.reward_points.available);
          setUser(userData);
        } else {
          console.log('❌ No valid user data in response');
          setUser(null);
        }
      } catch (err) {
        console.error("Auth restore failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // 🔹 Refresh user data - Returns Promise<void>
  const refreshUser = async (): Promise<void> => {
    console.log('🔄 refreshUser() called at', new Date().toISOString());
    
    try {
      // Force fresh request with cache busting
      const timestamp = Date.now();
      const response = await api.get(`/user?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('📥 Refresh API response:', response.data);
      
      const newUser = extractUserFromResponse(response.data);
      
      if (!newUser) {
        console.warn('⚠️ No user data in refresh response');
        setUser(null);
        return; // Return void
      }
      
      console.log('🔄 New user data:', newUser);
      console.log('🔄 Old user points:', user?.reward_points?.available);
      console.log('🔄 New user points:', newUser.reward_points.available);
      
      // Force update by creating completely new object
      const updatedUser: User = {
        ...newUser,
        reward_points: { ...newUser.reward_points }
      };
      
      // Use functional update to ensure React detects change
      setUser(prevUser => {
        // Check if data actually changed
        if (prevUser && prevUser.id === updatedUser.id) {
          const pointsChanged = prevUser.reward_points.available !== updatedUser.reward_points.available;
          console.log('📊 Points changed?', pointsChanged);
        }
        return updatedUser;
      });
      
      console.log('✅ User refreshed successfully');
      
      // Dispatch global event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userRefreshed', {
          detail: { 
            userId: updatedUser.id,
            points: updatedUser.reward_points.available,
            timestamp: Date.now()
          }
        }));
      }
      
    } catch (error) {
      console.error('🔴 AuthContext: Failed to refresh user', error);
      setUser(null);
      throw error;
    }
  };

  // 🔹 Update user data
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates
      };
      console.log('📝 Updating user context:', updatedUser);
      setUser(updatedUser);
    }
  };

  // 🔹 Login and set cookie
  const login = async (phone: string, username: string) => {
    setLoading(true);
    try {
      const res = await api.post(
        "/login",
        { phone, name: username },
        { withCredentials: true }
      );

      console.log('Login response:', res.data);
      
      if (res.data.success && res.data.user) {
        const userData = extractUserFromResponse(res.data);
        if (userData) {
          setUser(userData);
          await refreshUser(); // Force a refresh after login
          router.push("/");
        } else {
          throw new Error("Invalid user data in response");
        }
      } else {
        throw new Error(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Logout
  const logout = async () => {
    try {
      await api.post("/logout", {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
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