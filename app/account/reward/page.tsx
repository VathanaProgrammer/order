"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/layouts/Header";
import api from "@/api/api";
import RewardSection from "@/components/RewardSection";
import ProtectedRoute from "../../components/ProtectedRoute";

interface RewardItem {
  date: string;
  invoice_no: string;
  earned: number;
  redeemed: number;
  note: string;
}

const Reward: React.FC = () => {
  // const [history, setHistory] = useState<RewardItem[]>([]);
  // const [loading, setLoading] = useState<boolean>(true);

  // useEffect(() => {
  //   // Fetch reward history from backend API
  //   api
  //     .get("/api/rewards/history") // replace with your endpoint
  //     .then((res) => {
  //       setHistory(res.data);
  //     })
  //     .catch((err) => {
  //       console.error("Error fetching reward history:", err);
  //     })
  //     .finally(() => setLoading(false));
  // }, []);

  return (
    <ProtectedRoute>
    <div className="flex flex-col h-full gap-6">
      <Header title="Your Reward" />
      <div className="flex flex-col items-center my-10">
      <div className="relative w-64 h-48 bg-linear-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-linear-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white z-10">
          <span className="text-white font-bold text-2xl">★</span>
        </div>

        <span className="text-white font-bold text-2xl mt-6">Point:</span>
      </div>
      </div>
      <RewardSection />
    </div>
    </ProtectedRoute>
  );
};

export default Reward;
