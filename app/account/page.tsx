"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import Header from "@/components/layouts/Header";
import Image from "next/image";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";
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
  
  // If already full URL, return as-is
  if (url.startsWith('http')) {
    return url;
  }
  
  // If relative path starting with /, add base URL
  if (url.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   process.env.NEXT_PUBLIC_BASE_URL ||
                   'https://syspro.asia'; // Your domain
    return `${baseUrl}${url}`;
  }
  
  return url;
};

const Page: React.FC = () => {
  const { user, logout, loading, updateUser } = useAuth();
  const router = useRouter();
  const { setLoading } = useLoading();
  
  // ✅ FIXED: Use the utility function to ensure full URL
  const [profileImage, setProfileImage] = useState<string>(
    getFullImageUrl(user?.image_url)
  );
  
  const { t } = useLanguage();

  const uploadProfilePicture = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const res = await api.post('/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (res.data.success) {
        // ✅ Get the FULL URL from response
        const newImageUrl = res.data.data.full_url || res.data.data.image_url;
        
        // ✅ Convert to full URL if needed
        const fullImageUrl = getFullImageUrl(newImageUrl);
        
        // ✅ Update both state and auth context
        setProfileImage(fullImageUrl);
        
        // ✅ Store the ORIGINAL URL (as from backend) in context
        updateUser({ 
          ...user, 
          image_url: newImageUrl // Store the original URL from backend
        });
        
        toast.success(res.data.message || "Profile picture updated!");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
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
    const input = document.getElementById(
      "profile_picture"
    ) as HTMLInputElement | null;
    input?.click();
  };

  // In your Profile Page useEffect
  useEffect(() => {
    console.log('User:', user);
    
    // ✅ Check both image_url and profile_url
    const imageUrl = user?.image_url || user?.profile_url;
    
    if (imageUrl) {
      const fullImageUrl = getFullImageUrl(imageUrl);
      console.log('Setting profile image to:', fullImageUrl);
      setProfileImage(fullImageUrl);
    } else {
      console.log('No user image, setting default');
      setProfileImage("https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg");
    }
  }, [user]);

  const accountSections = [
    {
      icon: "mdi:account",
      title: t.profileInformation,
      desc: t.manageYourNameAndPhoneNumber,
      action: t.editProfile,
      route: '/account/edit-profile'
    },
    {
      icon: "mdi:map-marker",
      title: t.shippingAddresses,
      desc: t.viewAndUpdateYourShippingAndBillingAddresses,
      action: t.manageAddresses,
      route: '/account/shipping-address'
    },
    {
      icon: "lucide:database",
      title: t.rewards,
      desc: t.checkAvailableCoupons,
      action: t.viewRewards,
      route: '/account/reward'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t.loadingAccount}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen">
      <div className="w-full max-w-[440px] min-h-screen">
        <Header title={t.myAccount} />

        {/* Profile Section */}
        <div className="w-full mt-10 flex flex-col items-center justify-center">
          <div className="relative w-[120px] h-[120px]">
            <Image
              id="profileImage"
              src={profileImage}
              alt="Profile image"
              fill
              className="object-cover rounded-full border-4 border-gray-700"
              sizes="120px"
              // ✅ Add proper error handling
              onError={(e) => {
                console.error('Image failed to load:', profileImage);
                e.currentTarget.src = "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg";
              }}
              // ✅ Add loading attribute
              loading="lazy"
              // ✅ Unoptimized if using external domains not configured
              unoptimized={!profileImage.includes('localhost') && !profileImage.includes('127.0.0.1')}
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

          <div className="mt-3 text-center">
            <p className="font-semibold text-lg text-gray-900">
              {user?.name}
            </p>
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
            onClick={logout} 
            className="w-full bg-red-500 text-white py-2 rounded-[5px] font-semibold hover:bg-red-600 transition"
          >
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Page;