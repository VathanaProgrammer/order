"use client";
import React from "react";
import Image from "next/image";
import { RewardProduct } from "../RewardSection";
interface RewardCardProps {
    product: RewardProduct;
}

const RewardCard: React.FC<RewardCardProps> = ({ product }) => {
    const IMAGE_URL_PATH = process.env.NEXT_PUBLIC_IMAGE_URL;

    const displayImage = product.image_url || "/img/default.png";

    return (
        <div className="w-full rounded-xl bg-gray-50 border border-gray-200 shadow-md flex flex-col overflow-hidden transition hover:shadow-lg">
            <div className="relative w-full h-44">
                <Image
                    src={displayImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="(max-width: 768px) 100vw"
                />
            </div>

            <div className="p-3 flex flex-col flex-1 items-start">
                <h2 className="font-semibold text-gray-800 text-sm truncate">{product.name}</h2>
                <p className="text-yellow-600 font-bold text-base mt-1">{product.reward_points} pts</p>
            </div>
        </div>
    );
};

export default RewardCard;
