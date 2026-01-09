"use client";
import React, { useEffect, useState } from 'react';
import api from '@/api/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';

interface ClaimedReward {
    id: number;
    product_name: string;
    reward_code: string;
    points_used: number;
    claimed_at: string;
    expiry_date: string;
    status: string;
    product_image?: string;
}

const ClaimedRewards: React.FC = () => {
    const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchClaimedRewards();
        }
    }, [user]);

    const fetchClaimedRewards = async () => {
        try {
            const response = await api.get('/rewards/my-claims');
            setClaimedRewards(response.data.data || []);
        } catch (error) {
            console.error('Error fetching claimed rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    // const copyToClipboard = (code: string) => {
    //     navigator.clipboard.writeText(code);
    //     toast.success(t.copied || "Code copied!");
    // };

    if (loading) {
        return (
            <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-700 mb-4">
                    {t.claimedRewards || "Your Claimed Rewards"}
                </h3>
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (claimedRewards.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-700 mb-4">
                    {t.claimedRewards || "Your Claimed Rewards"}
                </h3>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-5xl mb-4">🎁</div>
                    <p className="text-gray-600">
                        {t.noClaimsYet || "You haven't claimed any rewards yet"}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        {t.claimFirstReward || "Claim your first reward above!"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-700">
                    {t.claimedRewards || "Your Claimed Rewards"}
                </h3>
                {/* <button 
                    onClick={fetchClaimedRewards}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    🔄 {t.refresh || "Refresh"}
                </button> */}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {claimedRewards.map((reward) => {
                    const isExpired = new Date(reward.expiry_date) < new Date();
                    const isUsed = reward.status === 'used';
                    
                    return (
                        <div 
                            key={reward.id} 
                            className={`bg-white rounded-lg shadow-md border p-4 ${
                                isExpired ? 'border-red-200 bg-red-50' :
                                isUsed ? 'border-green-200 bg-green-50' :
                                'border-gray-200'
                            }`}
                        >
                            <div className="flex items-start mb-3">
                                {reward.product_image ? (
                                    <img 
                                        src={reward.product_image} 
                                        alt={reward.product_name}
                                        className="w-16 h-16 object-cover rounded-lg mr-3"
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                                        <span className="text-2xl">🎁</span>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">
                                        {reward.product_name}
                                    </h4>
                                    <div className="flex items-center mt-1">
                                        <span className="text-xs text-gray-500">
                                            ⭐ {reward.points_used} {t.points || "points"}
                                        </span>
                                        <span className="mx-2">•</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(reward.claimed_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* <div className="mb-3">
                                <label className="text-sm text-gray-600 block mb-1">
                                    {t.rewardCode || "Reward Code"}:
                                </label>
                                <div className="flex">
                                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-l-lg font-mono text-blue-600">
                                        {reward.reward_code}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(reward.reward_code)}
                                        className="bg-blue-500 text-white px-3 py-2 rounded-r-lg hover:bg-blue-600 transition-colors"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div> */}

                            {/* <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-gray-500">
                                        {t.expires || "Expires"}: {new Date(reward.expiry_date).toLocaleDateString()}
                                    </div>
                                    <div className={`text-xs font-medium ${
                                        isExpired ? 'text-red-600' :
                                        isUsed ? 'text-green-600' :
                                        'text-blue-600'
                                    }`}>
                                        {isExpired ? '🕒 ' + t.expired :
                                         isUsed ? '✅ ' + t.used :
                                         '⏳ ' + t.active}
                                    </div>
                                </div>
                                
                                {!isExpired && !isUsed && (
                                    <button className="text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-1 rounded-full hover:from-green-600 hover:to-emerald-700 transition-all">
                                        {t.useNow || "Use Now"}
                                    </button>
                                )}
                            </div> */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ClaimedRewards;