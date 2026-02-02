"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/layouts/Header";
import Image from "next/image";
import Icon from "@/components/Icon";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "react-toastify";
import axios from "axios";

// Check localStorage for user type
const getUserType = (): 'sales' | 'regular' | null => {
  if (typeof window === 'undefined') return null;
  
  const salesToken = localStorage.getItem("sales_token");
  const regularToken = localStorage.getItem("auth_token"); // or whatever your regular token is called
  
  if (salesToken) return 'sales';
  if (regularToken) return 'regular';
  return null;
};

const Page: React.FC = () => {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'sales' | 'regular' | null>(null);
  
  // Fetch user data based on type
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const type = getUserType();
        setUserType(type);
        
        if (!type) {
          router.push("/sign-in");
          return;
        }
        
        let response;
        
        if (type === 'sales') {
          // Fetch sales user profile
          const token = localStorage.getItem("sales_token");
          if (!token) throw new Error("No sales token found");
          
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sales/profile`);
          
          if (response.data.success) {
            setUser(response.data.user);
          }
        } else {
          // Fetch regular user profile
          const token = localStorage.getItem("auth_token"); // adjust this
          if (!token) throw new Error("No auth token found");
          
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/user`);
          
          if (response.data) {
            setUser(response.data.user || response.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        toast.error("Failed to load profile");
        router.push("/sign-in");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [router]);
  
  const handleLogout = async () => {
    try {
      if (userType === 'sales') {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sales/logout`);
        localStorage.removeItem("sales_token");
        localStorage.removeItem("sales_user");
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/logout`);
        localStorage.removeItem("auth_token"); // adjust this
        localStorage.removeItem("user");
      }
      
      delete axios.defaults.headers.common["Authorization"];
      toast.success("Logged out successfully!");
      router.push("/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
      toast.success("Logged out!");
      router.push("/sign-in");
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading account...</p>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect
  }
  
  // Display name - will show real sales user name from users table
  const displayName = user?.name || "User";
  
  // Account sections
  const accountSections = userType === 'sales' 
    ? [
        {
          icon: "mdi:account-group",
          title: "Customer List",
          desc: "View and manage your customer database",
          action: "Manage Customers",
          route: '/account/shipping-address'
        },
      ]
    : [
        {
          icon: "mdi:account",
          title: t.profileInformation || "Profile Information",
          desc: t.manageYourNameAndPhoneNumber || "Manage your name and phone number",
          action: t.editProfile || "Edit Profile",
          route: '/account/edit-profile'
        },
        {
          icon: "mdi:map-marker",
          title: t.shippingAddresses || "Shipping Addresses",
          desc: t.viewAndUpdateYourShippingAndBillingAddresses || "View and update your shipping and billing addresses",
          action: t.manageAddresses || "Manage Addresses",
          route: '/account/shipping-address'
        },
      ];

  return (
    <div className="flex flex-col items-center min-h-screen">
      <div className="w-full max-w-[440px] min-h-screen">
        <Header title={userType === 'sales' ? "Sales Account" : t.myAccount || "My Account"} />
        
        {/* Profile Section */}
        <div className="w-full mt-10 flex flex-col items-center justify-center">
          {/* Only show for regular users */}
          {userType !== 'sales' && (
            <div className="relative w-[120px] h-[120px]">
              <Image
                src={user?.profile_url || "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg"}
                alt="Profile"
                fill
                className="object-cover rounded-full border-4 border-gray-700"
                sizes="120px"
                unoptimized={true}
              />
            </div>
          )}
          
          {/* Show for sales users */}
          {userType === 'sales' && (
            <div className="relative w-[120px] h-[120px]">
              <Image
                src={user?.profile_url || "https://www.shutterstock.com/image-vector/businessman-avatar-icon-vector-design-600nw-2314147627.jpg"}
                alt="Sales profile"
                fill
                className="object-cover rounded-full border-4 border-blue-500"
                sizes="120px"
                unoptimized={true}
              />
            </div>
          )}
          
          <div className="mt-3 text-center">
            <p className="font-semibold text-lg text-gray-900">
              {displayName}
            </p>
            {userType === 'sales' && (
              <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Sales Representative
              </span>
            )}
          </div>
        </div>
        
        {/* Account Options */}
        <div className="mt-8 space-y-4 pb-20">
          {accountSections.map((item, i) => (
            <div
              key={i}
              className="bg-gray-300 p-4 rounded-2xl shadow-sm flex flex-col gap-1 hover:shadow-md transition"
              onClick={() => router.push(item.route)}
            >
              <div className="flex items-center gap-2">
                <Icon
                  icon={item.icon}
                  width={22}
                  height={22}
                  className="text-gray-700"
                />
                <h3 className="font-medium text-gray-800">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-500">{item.desc}</p>
              <button className="mt-2 text-sm font-medium text-blue-600 hover:underline self-start">
                {item.action}
              </button>
            </div>
          ))}
        </div>
        
        {/* Logout */}
        <div className="pb-10">
          <button 
            onClick={handleLogout} 
            className="w-full bg-red-500 text-white py-2 rounded-[5px] font-semibold hover:bg-red-600 transition"
          >
            {t.logout || "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Page;