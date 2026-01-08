"use client";
import React, { useEffect, useState } from "react";
import RewardCard from "./cards/RewardCard";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";
import { useLanguage } from "@/context/LanguageContext";
import useSWR from 'swr';

export interface RewardProduct {
  id: number;
  name: string;
  image_url?: string;
  reward_points: number;
}

// Define the props interface for RewardSection
interface RewardSectionProps {
  onClaimSuccess?: () => void; // Add this prop
}

const RewardSection: React.FC<RewardSectionProps> = ({ onClaimSuccess }) => {
  const { t } = useLanguage();

  const { data: products, mutate } = useSWR<RewardProduct[]>(
    '/product/reward/all',
    async (url: any) => {
      const res = await api.get(url);
      return res.data.data ?? [];
    }
  );

  const handleClaimSuccess = async () => {
    // Revalidate (refresh) the data
    await mutate();
    
    if (onClaimSuccess) {
      onClaimSuccess();
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold text-gray-700 mb-2">
        {t.redeemYourRewards}
      </h2>

      <div className="grid grid-cols-2 gap-4 mt-2">
        {products.map((item) => (
          <RewardCard 
            key={item.id} 
            product={item} 
            onClaimSuccess={handleClaimSuccess}
          />
        ))}
      </div>
    </section>
  );
};

export default RewardSection;