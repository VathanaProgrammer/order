"use client";
import { useSearchParams } from "next/navigation";
import Icon from '@/components/Icon';
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useLanguage } from "@/context/LanguageContext";

const page = () => {
  const params = useSearchParams();
  const telegramLink = params.get("telegram");
  const orderId = params.get("order_id");
  const { user } = useAuth();
  const { t } = useLanguage();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper functions
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value: any): string => {
    return `$${safeNumber(value).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Logic to "Download that Box" by rendering the box state to a high-res canvas
  const generateBoxImage = (orderData: any) => {
    if (!orderData) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      try {
        const scale = 2;
        const width = 384;
        const itemsCount = orderData.items?.length || 0;
        // Calculate height based on the "One Box" UI structure
        const height = 220 + (itemsCount * 25) + 100; 

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);

        // Draw the Box Style
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Header (Matches your style)
        ctx.fillStyle = '#f8fafc'; // gray-50
        ctx.fillRect(0, 0, width, 80);
        ctx.fillStyle = '#1e4ce4'; // blue-600
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Order #${orderId}`, 20, 35);
        ctx.fillStyle = '#64748b'; // gray-500
        ctx.font = '12px Arial';
        ctx.fillText(formatDate(orderData.created_at), 20, 55);

        // Customer Info
        let y = 110;
        if (orderData.customer_info) {
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(orderData.customer_info.name || 'Customer', 20, y);
          ctx.font = '12px Arial';
          ctx.fillText(orderData.customer_info.phone || '', 20, y + 18);
          y += 45;
        }

        // Items
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(width - 20, y); ctx.stroke();
        y += 25;

        orderData.items?.forEach((item: any) => {
          ctx.fillStyle = '#1e293b';
          ctx.font = '13px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(item.product_name.substring(0, 35), 20, y);
          ctx.textAlign = 'right';
          ctx.fillText(formatCurrency(item.qty * item.price_at_order), width - 20, y);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`${item.qty} x ${formatCurrency(item.price_at_order)}`, 20, y + 15);
          y += 35;
        });

        // Total Box
        y += 10;
        ctx.fillStyle = '#eff6ff'; // blue-50
        ctx.fillRect(0, y, width, 70);
        ctx.fillStyle = '#1e4ce4';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Total Amount', 20, y + 40);
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(formatCurrency(orderData.total), width - 20, y + 40);

        setInvoiceImage(canvas.toDataURL('image/png', 1.0));
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!orderId) return; // REMOVED: user?.role !== 'sale' condition
      try {
        setIsLoading(true);
        
        // Get token based on auth type
        let token: string | null = null;
        const isSalesMode = user?.role === 'sale';
        
        if (isSalesMode) {
          token = localStorage.getItem('sales_token') || 
                  localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('sales_token');
        } else {
          token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('auth_token') ||
                  sessionStorage.getItem('token');
        }
        
        if (!token) {
          toast.error("Please log in to view order details");
          return;
        }

        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/online-orders/${orderId}`, {
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.data?.success) {
          setOrderDetails(res.data.data);
          generateBoxImage(res.data.data);
        }
      } catch (err: any) {
        console.error("Error fetching order details:", err);
        
        if (err.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
        } else if (err.response?.status === 403) {
          toast.error("You don't have permission to view this order");
        } else {
          toast.error("Error fetching order details");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [orderId, user?.role]); // Keep user.role in dependencies for re-fetch if auth changes

  const handleDownload = () => {
    if (!invoiceImage) return;
    const a = document.createElement('a');
    a.href = invoiceImage;
    a.download = `Order_${orderId}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!invoiceImage) return;
    try {
      const blob = await (await fetch(invoiceImage)).blob();
      const file = new File([blob], `Order_${orderId}.png`, { type: 'image/png' });
      if (navigator.share) await navigator.share({ files: [file] });
      else handleDownload();
    } catch (e) { handleDownload(); }
  };

  // REMOVED: The conditional rendering that only showed success message for non-sales users
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:loading" width={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 border-b flex items-center gap-3">
        <button onClick={() => window.history.back()}><Icon icon="mdi:arrow-left" width={24}/></button>
        <h1 className="font-bold text-lg">Order Receipt</h1>
      </div>

      {orderDetails ? (
        <div className="p-4 max-w-md mx-auto">
          {/* THE MERGED BOX */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-blue-600 font-black text-xl">Order #{orderId}</h2>
                  <p className="text-xs text-gray-500">{formatDate(orderDetails.created_at)}</p>
                  {user?.role === 'sale' && orderDetails.salesperson_info && (
                    <p className="text-xs text-gray-600 mt-1">
                      Salesperson: {orderDetails.salesperson_info.name}
                    </p>
                  )}
                </div>
                <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-bold">OFFICIAL RECEIPT</span>
              </div>
            </div>

            <div className="p-5">
              {/* Customer Info Section */}
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                  {user?.role === 'sale' ? 'Customer' : 'Your Information'}
                </p>
                <p className="font-bold text-gray-800">
                  {orderDetails.customer_info?.name || 'Customer'}
                </p>
                <p className="text-sm text-gray-600">
                  {orderDetails.customer_info?.phone || 'N/A'}
                </p>
                {orderDetails.address_info?.address && (
                  <p className="text-xs text-gray-500 mt-2">
                    📍 {orderDetails.address_info.address}
                  </p>
                )}
              </div>

              {/* Order Items Section */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Items</p>
                {orderDetails.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{item.qty} x {formatCurrency(item.price_at_order)}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(item.qty * item.price_at_order)}</p>
                  </div>
                ))}
              </div>
              
              {/* Payment Method */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Payment</p>
                <p className="text-sm text-gray-800">
                  Method: <span className="font-bold">{orderDetails.payment_method || 'N/A'}</span>
                </p>
              </div>
            </div>

            {/* Total Amount Section */}
            <div className="p-5 bg-blue-100 text-black">
              <div className="flex justify-between items-center">
                <span className="font-medium opacity-80">Total Amount</span>
                <span className="text-2xl font-black">{formatCurrency(orderDetails.total)}</span>
              </div>
              
              {/* Reward Points if available */}
              {orderDetails.reward_points?.earned > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-800">🎁 Reward Points Earned</span>
                    <span className="font-bold text-blue-800">+{orderDetails.reward_points.earned}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Show for everyone */}
            <div className="p-4 grid grid-cols-2 gap-3 bg-gray-50">
              <button 
                onClick={handleDownload}
                disabled={!invoiceImage || isGenerating}
                className={`flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-800 rounded-xl font-bold active:scale-95 transition-all shadow-sm ${(!invoiceImage || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGenerating ? (
                  <>
                    <Icon icon="mdi:loading" className="animate-spin" width={20}/>
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:download" width={20}/>
                    Download
                  </>
                )}
              </button>
              <button 
                onClick={handleShare}
                disabled={!invoiceImage || isGenerating}
                className={`flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-bold active:scale-95 transition-all shadow-sm ${(!invoiceImage || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon icon="mdi:share-variant" width={20}/>
                Share
              </button>
            </div>
          </div>
        </div>
      ) : !isLoading && (
        // Show error/empty state if no order details
        <div className="p-10 text-center">
          <Icon icon="mdi:file-document-outline" width={60} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Order Not Found</h3>
          <p className="text-gray-500 mb-6">
            We couldn't find the details for order #{orderId}
          </p>
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
          >
            Back to Home
          </a>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-md border-t bg-white/95 flex gap-3">
        <a href="/" className="flex-1 py-3 bg-gray-100 text-center rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors">
          {t.home || 'Home'}
        </a>
        {telegramLink && (
          <a 
            href={telegramLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-blue-600 text-white text-center rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Icon icon="mdi:telegram" width={20}/>
            Telegram
          </a>
        )}
      </div>
    </div>
  );
};

export default page;