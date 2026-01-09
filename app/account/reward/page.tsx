"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/layouts/Header";
import api from "@/api/api";
import RewardSection from "@/components/RewardSection";
import ClaimedRewards from "@/components/ClaimedRewards";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "react-toastify";

interface RewardTransaction {
  date: string;
  invoice_no: string;
  earned: number;
  redeemed: number;
  note: string;
}

const Reward: React.FC = () => {
  const [history, setHistory] = useState<RewardTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    fetchRewardHistory();
  }, []);

  const fetchRewardHistory = async () => {
    try {
      const res = await api.get("/rewards/history");
      setHistory(res.data.data || []);
    } catch (err) {
      console.error("Error fetching reward history:", err);
      toast.error(t.fetchHistoryError || "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClaimSuccess = () => {
    // Refresh user points and history
    refreshUser();
    fetchRewardHistory();
    
    // Optional: Show success toast
    toast.success("Reward claimed successfully!");
  };

  return (
    <ProtectedRoute>
      <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-6">
          <Header title={t.yourReward} />
          
          {/* Points Display Card */}
          <div className="flex flex-col items-center my-8">
            <div className="relative w-full max-w-md">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-8 border-white z-10 animate-pulse">
                <span className="text-white text-3xl">🏆</span>
              </div>
              
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 rounded-3xl p-8 pt-16 shadow-2xl">
                <div className="text-center">
                  <div className="text-white text-sm font-medium mb-2">
                    {t.totalPoints || "Total Reward Points"}
                  </div>
                  <div className="text-white text-5xl font-bold mb-2">
                    {/* Display user points correctly */}
                    {typeof user?.reward_points === 'number' 
                      ? user.reward_points 
                      : (user?.reward_points as any)?.available || 0}
                  </div>
                  {/* <div className="text-white/80 text-sm">
                    {t.availableForRedemption || "Available for redemption"}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center space-x-4">
                  <button 
                    onClick={refreshUser}
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-all"
                  >
                    🔄 {t.refreshPoints || "Refresh"}
                  </button>
                  <button 
                    onClick={() => toast.info(t.howToEarnInfo || "Complete purchases to earn more points!")}
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-all"
                  >
                    ❓ {t.howToEarn || "How to earn?"}
                  </button> */}
                </div>
              </div>
            </div>
          </div>

          {/* Available Rewards - Pass onClaimSuccess prop */}
          <div className="mb-10">
            <RewardSection onClaimSuccess={handleClaimSuccess} />
          </div>

          {/* Claimed Rewards */}
          <ClaimedRewards />

          {/* Transaction History */}
          {/* <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-700 mb-4">
              {t.transactionHistory || "Points History"}
            </h2>
            
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t.date || "Date"}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t.description || "Description"}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t.earned || "Earned"}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t.redeemed || "Redeemed"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {history.map((transaction, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {transaction.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.note}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600 font-medium">
                            {transaction.earned > 0 ? `+${transaction.earned}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600 font-medium">
                            {transaction.redeemed > 0 ? `-${transaction.redeemed}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-5xl mb-4">📊</div>
                <p className="text-gray-600">
                  {t.noTransactionHistory || "No transaction history yet"}
                </p>
              </div>
            )}
          </div> */}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Reward;