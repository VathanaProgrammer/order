"use client";
import React, { useEffect, useState } from "react";
import RewardCard from "./cards/RewardCard";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";
import { useLanguage } from "@/context/LanguageContext";

export interface RewardProduct {
  id: number;
  name: string;
  image_url?: string;
  reward_points: number;
}

const RewardSection: React.FC = () => {
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const { setLoading } = useLoading();
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchRewardProducts() {
      setLoading(true);
      try {
        const res = await api.get<{
          status: string;
          data: RewardProduct[];
        }>("/product/reward/all");

        setProducts(res.data.data ?? []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load reward products");
      } finally {
        setLoading(false);
      }
    }

    fetchRewardProducts();
  }, [setLoading]);

  // Nothing to show → render nothing
  if (products.length === 0) return null;

  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold text-gray-700 mb-2 khmer-text">
        {t.redeemYourRewards}
      </h2>

      <div className="grid grid-cols-2 gap-4 mt-2">
        {products.map((item) => (
          <RewardCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
};

export default RewardSection;
