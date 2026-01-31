"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface SalesUser {
  id: number;
  email: string;
  username: string;
  name: string;
  phone: string;
  role: string;
  business_id: number;
  profile_url?: string;
  token?: string;
  roles: string[];
}

interface SalesAuthContextType {
  salesUser: SalesUser | null;
  salesLoading: boolean;
  salesLogin: (email: string, password: string) => Promise<void>;
  salesLogout: () => Promise<void>;
  updateSalesUser: (userData: Partial<SalesUser>) => void;
  isSalesAuthenticated: boolean;
  refreshSalesUser: () => Promise<void>;
}

const SalesAuthContext = createContext<SalesAuthContextType | undefined>(undefined);

export const useSalesAuth = () => {
  const context = useContext(SalesAuthContext);
  if (!context) {
    throw new Error("useSalesAuth must be used within a SalesAuthProvider");
  }
  return context;
};

interface SalesAuthProviderProps {
  children: ReactNode;
}

export const SalesAuthProvider: React.FC<SalesAuthProviderProps> = ({ children }) => {
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const router = useRouter();

  // Initialize from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedSalesUser = localStorage.getItem("sales_user");
        
        if (storedSalesUser) {
          const parsedUser = JSON.parse(storedSalesUser);
          setSalesUser(parsedUser);
          
          // Set axios default header with Bearer token
          if (parsedUser.token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${parsedUser.token}`;
          }
        }
      } catch (error) {
        console.error("Error initializing sales auth:", error);
        localStorage.removeItem("sales_user");
      } finally {
        setSalesLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const salesLogin = async (email: string, password: string) => {
    setSalesLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/delivery/login`,
        { 
          email, 
          password,
          // Don't send role parameter - let Laravel handle role checking internally
        },
        {
          withCredentials: true, // Important for cookies
        }
      );

      console.log("Sales login response:", response.data);

      if (response.data.success) {
        const userData = response.data.user;
        
        // Check if user has sales role
        const userRoles = response.data.roles || [];
        const hasSalesRole = userRoles.some((role: string) => 
          role.toLowerCase().includes('sales') || 
          role.toLowerCase().includes('admin') ||
          role.toLowerCase().includes('manager')
        );
        
        if (!hasSalesRole) {
          throw new Error("User does not have sales access permissions");
        }

        // Extract token from cookie or response
        const token = response.data.token || 
                      response.headers['set-cookie']?.[0]?.split(';')[0]?.split('=')[1] ||
                      response.data.access_token;

        const salesUserData: SalesUser = {
          id: userData.id,
          email: userData.email || userData.username || email,
          username: userData.username || email,
          name: getUserName(userData) || userData.name || email,
          phone: userData.contact_number || userData.phone || '',
          role: 'sales',
          business_id: userData.business_id || 1,
          profile_url: getProfileUrl(userData),
          roles: userRoles,
          token: token
        };

        // Save to state
        setSalesUser(salesUserData);
        
        // Save to localStorage
        localStorage.setItem("sales_user", JSON.stringify(salesUserData));
        if (token) {
          localStorage.setItem("sales_token", token);
        }
        
        // Set axios default header for future requests
        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }

        toast.success("Sales login successful!");
        
        // Redirect to sales dashboard
        router.push("/sales/dashboard");
      } else {
        throw new Error(response.data.msg || "Login failed");
      }
    } catch (error: any) {
      console.error("Sales login error:", error);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        
        if (error.response.status === 401) {
          errorMessage = error.response.data?.msg || "Invalid email or password";
        } else if (error.response.status === 403) {
          errorMessage = error.response.data?.msg || 
                        "Access denied. This account does not have sales permissions.";
        } else if (error.response.data?.msg) {
          errorMessage = error.response.data.msg;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setSalesLoading(false);
    }
  };

  const refreshSalesUser = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/delivery/profile`,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        const userData = response.data.user;
        
        const updatedUser: SalesUser = {
          id: userData.id,
          email: userData.email || userData.username || salesUser?.email || '',
          username: userData.username || salesUser?.username || '',
          name: getUserName(userData) || salesUser?.name || '',
          phone: userData.contact_number || userData.phone || salesUser?.phone || '',
          role: 'sales',
          business_id: userData.business_id || salesUser?.business_id || 1,
          profile_url: getProfileUrl(userData) || salesUser?.profile_url,
          roles: response.data.roles || salesUser?.roles || [],
          token: salesUser?.token // Keep existing token
        };

        setSalesUser(updatedUser);
        localStorage.setItem("sales_user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Error refreshing sales user:", error);
      // If refresh fails, log out
      await salesLogout();
    }
  };

  const salesLogout = async () => {
    try {
      // Call logout API
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/delivery/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Clear state
      setSalesUser(null);
      
      // Clear localStorage
      localStorage.removeItem("sales_user");
      localStorage.removeItem("sales_token");
      
      // Clear axios header
      delete axios.defaults.headers.common["Authorization"];
      
      toast.success("Sales logged out successfully!");
      
      // Redirect to sales login page
      router.push("/sales/login");
    }
  };

  const updateSalesUser = (userData: Partial<SalesUser>) => {
    if (salesUser) {
      const updatedUser = { ...salesUser, ...userData };
      setSalesUser(updatedUser);
      localStorage.setItem("sales_user", JSON.stringify(updatedUser));
    }
  };

  const isSalesAuthenticated = !!salesUser;

  // Helper function to get user name
  const getUserName = (userData: any): string => {
    if (!userData) return "Sales User";
    
    if (userData.surname && userData.first_name) {
      return `${userData.surname} ${userData.first_name}`;
    } else if (userData.first_name) {
      return userData.first_name;
    } else if (userData.username) {
      return userData.username;
    } else if (userData.name) {
      return userData.name;
    }
    return "Sales User";
  };

  // Helper function to get profile URL
  const getProfileUrl = (userData: any): string | undefined => {
    if (!userData) return undefined;
    
    if (userData.profile_url) {
      return userData.profile_url;
    } else if (userData.image_url) {
      return userData.image_url;
    } else if (userData.avatar_url) {
      return userData.avatar_url;
    }
    return undefined;
  };

  return (
    <SalesAuthContext.Provider
      value={{
        salesUser,
        salesLoading,
        salesLogin,
        salesLogout,
        updateSalesUser,
        isSalesAuthenticated,
        refreshSalesUser,
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
};