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
  image_url?: string | null; // Frontend expects this
  profile_url?: string | null; // Backend returns this
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

  // ✅ UTILITY: Normalize user data from API
  const normalizeUserData = (apiUser: any): User => {
    return {
      id: apiUser.id,
      name: apiUser.name,
      phone: apiUser.phone,
      mobile: apiUser.mobile,
      // ✅ CRITICAL: Map profile_url to image_url for frontend
      image_url: apiUser.profile_url || apiUser.image_url,
      profile_url: apiUser.profile_url, // Keep original for reference
      reward_points: apiUser.reward_points || {
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
        const res = await api.get("/user", { withCredentials: true });
        console.log('User API response:', res.data); // Debug
        
        if (res.data.success) {
          // ✅ Use normalized data
          const normalizedUser = normalizeUserData(res.data.user);
          console.log('Normalized user:', normalizedUser); // Debug
          setUser(normalizedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.log("Auth restore failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const refreshUser = async () => {
    try {
      console.log('Refreshing user data...');
      const res = await api.get("/user", { withCredentials: true });
      console.log('Refresh response:', res.data);
      
      if (res.data?.success) {
        // ✅ Use normalized data
        const normalizedUser = normalizeUserData(res.data.user);
        console.log('Refreshed normalized user:', normalizedUser);
        setUser(normalizedUser);
      }
    } catch {
      console.log('Refresh failed, clearing user');
      setUser(null);
    }
  };

  // 🔹 Update user data
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates
      };
      console.log('Updating user context:', updatedUser);
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

      if (res.data.success) {
        // ✅ Use normalized data
        const normalizedUser = normalizeUserData(res.data.user);
        setUser(normalizedUser);
        await refreshUser();
        router.push("/");
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
    } catch { }
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