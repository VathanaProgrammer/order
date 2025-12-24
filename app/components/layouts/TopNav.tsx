"use client";
import React, { useEffect, useState } from "react";
import Icon from "../Icon";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const TopNav = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [location, setLocation] = useState<string>("Fetching location...");
  const [error, setError] = useState<string | null>(null);

  const handleProfileClick = () => {
    if (user) {
      router.push("/account");
    } else {
      router.push("/sign-in");
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setTimeout(() => {
        setError("Geolocation is not supported by your browser");
        setLocation("");
      }, 0);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            "";
          const country = data.address.country || "";
          setLocation(
            city && country ? `${city}, ${country}` : "Unknown location"
          );
        } catch (err) {
          setLocation(`Lat: ${latitude}, Lon: ${longitude}`);
        }
      },
      (err) => {
        setError(err.message);
        setLocation("");
      }
    );
  }, []);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-row justify-between items-center">
        {/* Logo */}
        <h1 className="text-[32px] font-bold main-text">SOB</h1>

        <div className="flex flex-row gap-2">
          <div
            onClick={handleProfileClick}
            className="p-2 flex items-center rounded-[10px] border border-gray-300 cursor-pointer hover:bg-gray-100 transition"
          >
            <Icon
              className="text-gray-500"
              icon="mdi:account"
              width={26}
              height={26}
            />
          </div>
          {/* <div
            onClick={() => router.push("/cart")}
            className="p-2 flex items-center rounded-[10px] border border-gray-300 cursor-pointer hover:bg-gray-100 transition"
          >
            <Icon
              className="text-gray-500"
              icon="mdi:cart"
              width={26}
              height={26}
            />
          </div> */}
          <div
            onClick={() => router.push("/notifications")}
            className="p-2 flex items-center rounded-[10px] border border-gray-300 cursor-pointer hover:bg-gray-100 transition"
          >
            <Icon
              className="text-gray-500"
              icon="zondicons:notifications"
              width={26}
              height={26}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-row justify-between items-center mt-2">
        {/* Location */}
        <div className="flex items-center gap-1">
          <Icon
            icon="mdi:map-marker-outline"
            width={18}
            height={18}
            className="text-gray-600"
          />
          <p className="text-[13px] font-medium text-gray-600">
            Your current location is {location}
          </p>
        </div>

        <div
          onClick={() => router.push("/account/reward")}
          className="p-2 flex flex-row items-center min-w-[75px] rounded-[10px] bg-linear-to-r from-yellow-400 to-yellow-500 text-white shadow-md cursor-pointer hover:from-yellow-500 hover:to-yellow-600 transition"
        >
          <div className="ml-1 w-8 h-8 bg-linear-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white z-10">
          <span className="text-white font-bold text-2xl">★</span>
        </div>
          <p className="text-[16px] font-medium ml-2">{user?.reward_points?.available || 0}</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-[12px]">{error}</p>}
    </section>
  );
};

export default TopNav;
