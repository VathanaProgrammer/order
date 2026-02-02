"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import Header from "@/components/layouts/Header";
import Image from "next/image";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext"; // Regular users
import { useSalesAuth } from "@/context/SalesAuthContext"; // Sales users
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";

// ✅ UTILITY FUNCTION: Convert any URL to full URL
const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url || url === "null" || url === "undefined" || url === "") {
    return "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg";
  }
  
  if (url.startsWith('http')) {
    return url;
  }
  
  if (url.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://syspro.asia';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}${url}`;
  }
  
  return url;
};

const Page: React.FC = () => {
  // ✅ Use both auth contexts
  const { user: regularUser, logout: regularLogout, loading: regularLoading, updateUser, refreshUser } = useAuth();
  const { salesUser, salesLogout, salesLoading, updateSalesUser } = useSalesAuth();
  
  const router = useRouter();
  const { setLoading } = useLoading();
  
  // ✅ Determine which user is active based on role
  const isSalesRole = regularUser?.role === "sale" || salesUser?.role === "sales" || salesUser?.role === "admin";
  const activeUser = isSalesRole ? salesUser : regularUser;
  const activeLoading = isSalesRole ? salesLoading : regularLoading;
  
  // ✅ FIXED: Use profile_url
  const [profileImage, setProfileImage] = useState<string>(
    getFullImageUrl(activeUser?.profile_url)
  );
  
  const { t } = useLanguage();

  // ✅ Upload profile picture (only for regular users)
  const uploadProfilePicture = async (file: File) => {
    if (isSalesRole) {
      toast.error("Sales users cannot upload profile pictures");
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      console.log('📤 Uploading profile picture...');
      const res = await api.post('/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      console.log('📥 Upload response:', res.data);
  
      if (res.data.success) {
        const newProfileUrl = res.data.data?.profile_url || 
                             res.data.data?.full_url || 
                             res.data.data?.image_url;
        
        console.log('🖼️ New profile_url from API:', newProfileUrl);
        
        if (!newProfileUrl) {
          throw new Error('No profile_url returned from server');
        }
        
        const fullImageUrl = getFullImageUrl(newProfileUrl);
        console.log('🔗 Full image URL for display:', fullImageUrl);
        
        setProfileImage(fullImageUrl);
        
        if (regularUser) {
          updateUser({ 
            ...regularUser,
            profile_url: newProfileUrl
          });
        }
        
        setTimeout(async () => {
          console.log('🔄 Forcing server refresh after upload...');
          await refreshUser();
        }, 500);
        
        toast.success(res.data.message || "Profile picture updated!");
      }
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      toast.error(err.response?.data?.message || "Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, JPG, GIF, and WebP images are allowed");
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);

    // Upload to backend
    await uploadProfilePicture(file);
  };

  const handleButtonClick = () => {
    if (isSalesRole) {
      toast.error("Sales users cannot change profile picture");
      return;
    }
    
    const input = document.getElementById(
      "profile_picture"
    ) as HTMLInputElement | null;
    input?.click();
  };

  // ✅ CRITICAL: Update profileImage whenever user's profile_url changes
  useEffect(() => {
    console.log('👤 Active user changed:', activeUser);
    console.log('🎭 Is sales role:', isSalesRole);
    console.log('🖼️ Active user profile_url:', activeUser?.profile_url);
    
    if (activeUser?.profile_url) {
      const fullImageUrl = getFullImageUrl(activeUser.profile_url);
      console.log('🎯 Setting profile image to:', fullImageUrl);
      setProfileImage(fullImageUrl);
    } else {
      console.log('⚠️ No profile_url, setting default image');
      setProfileImage("https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg");
    }
  }, [activeUser, isSalesRole]);

  // ✅ Logout function that handles both user types
  const handleLogout = async () => {
    if (isSalesRole) {
      await salesLogout();
    } else {
      await regularLogout();
    }
  };

  // ✅ Debug: Log initial state
  useEffect(() => {
    console.log('🚀 Profile page mounted');
    console.log('👤 Regular user:', regularUser);
    console.log('👔 Sales user:', salesUser);
    console.log('🎭 Is sales role:', isSalesRole);
    console.log('👤 Active user:', activeUser);
  }, []);

  // Account sections - different for sales vs regular users
  const accountSections = isSalesRole 
    ? [
        // Sales Role Sections
        {
          icon: "mdi:account-group",
          title: "Customer List",
          desc: "View and manage your customer database",
          action: "Manage Customers",
          route: '/account/shipping-address' // Same route but different UI
        },
      ]
    : [
        // Regular User Sections
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

  // Display name - will show real sales user name from users table
  const displayName = activeUser?.name || "User";

  if (activeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t.loadingAccount || "Loading account..."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen">
      <div className="w-full max-w-[440px] min-h-screen">
        <Header title={isSalesRole ? "Sales Account" : t.myAccount || "My Account"} />

        {/* Profile Section */}
        <div className="w-full mt-10 flex flex-col items-center justify-center">
          {/* Only show profile image upload for regular users */}
          {!isSalesRole && (
            <div className="relative w-[120px] h-[120px]">
              <Image
                id="profileImage"
                src={profileImage}
                alt="Profile image"
                fill
                className="object-cover rounded-full border-4 border-gray-700"
                sizes="120px"
                priority
                onError={(e) => {
                  console.error('❌ Image failed to load:', profileImage);
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg";
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', profileImage);
                }}
                unoptimized={true}
              />

              <input
                type="file"
                id="profile_picture"
                name="profile_picture"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <button
                type="button"
                id="editImageBtn"
                onClick={handleButtonClick}
                className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-[#6a00b0] transition"
              >
                <Icon
                  icon="iconamoon:edit-light"
                  width={18}
                  height={18}
                  className="text-gray-800 hover:text-white"
                />
              </button>
            </div>
          )}

          {/* Show different profile image for sales users */}
          {isSalesRole && (
            <div className="relative w-[120px] h-[120px]">
              <Image
                id="profileImage"
                src={profileImage}
                alt="Sales profile"
                fill
                className="object-cover rounded-full border-4 border-blue-500"
                sizes="120px"
                priority
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://www.shutterstock.com/image-vector/businessman-avatar-icon-vector-design-600nw-2314147627.jpg";
                }}
                unoptimized={true}
              />
            </div>
          )}

          <div className="mt-3 text-center">
            <p className="font-semibold text-lg text-gray-900">
              {displayName}
            </p>
            {isSalesRole && (
              <div className="flex flex-col items-center gap-1 mt-1">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {activeUser?.role === 'admin' ? 'Admin' : 'Sales Representative'}
                </span>
                {/* Show additional info for sales users */}
                {/* {activeUser?.email && (
                  <p className="text-xs text-gray-500">{activeUser.email}</p>
                )}
                {activeUser?.username && (
                  <p className="text-xs text-gray-500">Username: {activeUser.username}</p>
                )} */}
              </div>
            )}
          </div>
        </div>

        {/* Account Options */}
        <div className="mt-8 space-y-4 pb-20">
          {accountSections.map((item, i) => (
            <div
              key={i}
              className="bg-gray-300 p-4 rounded-2xl shadow-sm flex flex-col gap-1 hover:shadow-md transition"
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
              <button 
                onClick={() => router.push(item.route ? item.route : '')} 
                className="mt-2 text-sm font-medium text-blue-600 hover:underline self-start"
              >
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