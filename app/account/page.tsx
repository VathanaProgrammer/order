"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import Header from "@/components/layouts/Header";
import Image from "next/image";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

const Page: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string>(
    user?.image_url ||
    "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg"
  );
  const { t } = useLanguage();

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setProfileImage(URL.createObjectURL(file));
  };

  const handleButtonClick = () => {
    const input = document.getElementById(
      "image_url"
    ) as HTMLInputElement | null;
    input?.click();
  };

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
    // {
    //   icon: "mdi:package-variant-closed",
    //   title: "My Orders",
    //   desc: "Track your recent orders, deliveries, and returns.",
    //   action: "View Orders",
    // },
    {
      icon: "lucide:database",
      title: t.rewards,
      desc: t.checkAvailableCoupons,
      action: t.viewRewards,
      route: '/account/reward'
    },
    // {
    //   icon: "mdi:lock-outline",
    //   title: "Security",
    //   desc: "Change password or review login activity.",
    //   action: "Update Password",
    // },
    // {
    //   icon: "mdi:bell-outline",
    //   title: "Notifications",
    //   desc: "Choose what alerts and messages you want to receive.",
    //   action: "Manage Preferences",
    // },
    // {
    //   icon: "mdi:cog-outline",
    //   title: "Account Settings",
    //   desc: "Language, currency, and delete account options.",
    //   action: "Open Settings",
    // },
  ];

  useEffect(() => {
    if (user?.image_url) {
      setProfileImage(
        user.image_url ||
        "https://www.shutterstock.com/image-vector/avatar-gender-neutral-silhouette-vector-600nw-2470054311.jpg"
      );
    }
  }, [user?.image_url]);
  
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
            />

            <input
              type="file"
              id="image_url"
              name="image_url"
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
              <button onClick={() => router.push(item.route ? item.route : '')} className="mt-2 text-sm font-medium text-blue-600 hover:underline self-start">
                {item.action}
              </button>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="pb-10">
          <button onClick={logout} className="w-full bg-red-500 text-white py-2 rounded-[5px] font-semibold hover:bg-red-600 transition">
            {t.logout}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Page;
