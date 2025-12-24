"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/layouts/Header";
import api from "@/api/api";
import RewardCard from "@/components/cards/RewardCard";
import RewardSection from "@/components/RewardSection";

interface RewardItem {
  date: string;
  invoice_no: string;
  earned: number;
  redeemed: number;
  note: string;
}

const Reward: React.FC = () => {
  const [history, setHistory] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch reward history from backend API
    api
      .get("/api/rewards/history") // replace with your endpoint
      .then((res) => {
        setHistory(res.data);
      })
      .catch((err) => {
        console.error("Error fetching reward history:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full gap-6">
      <Header title="Your Reward" />
      <RewardSection />
    </div>
  );
};

export default Reward;
