"use client";
import { useSearchParams } from "next/navigation";
import Icon from '@/components/Icon';
import { useEffect, useState } from "react";
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
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [showFullInvoice, setShowFullInvoice] = useState(false);

  // Helper functions
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value: any): string => {
    return `$${safeNumber(value).toFixed(2)}`;
  };

  const formatDateDDMMYYYY = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const calculateCanvasHeight = (orderData: any): number => {
    if (!orderData) return 300;
    let totalHeight = 140; 
    const itemsCount = orderData.items?.length || 0;
    totalHeight += itemsCount * 18;
    if (orderData.address_info?.address) {
      const addressLines = Math.ceil(orderData.address_info.address.length / 40);
      totalHeight += addressLines * 12;
    }
    totalHeight += 80;
    return totalHeight + 20;
  };

  const generateInvoiceImage = (orderData: any) => {
    if (!orderData) return;
    setIsGeneratingInvoice(true);
    setTimeout(() => {
      try {
        const canvasHeight = calculateCanvasHeight(orderData);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = 2; 
        const baseWidth = 384;
        canvas.width = baseWidth * scale;
        canvas.height = canvasHeight * scale;
        ctx.scale(scale, scale);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, baseWidth, canvasHeight);
        
        ctx.fillStyle = '#1e4ce4';
        ctx.fillRect(0, 0, baseWidth, 50); 
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SOB', baseWidth / 2, 30);
        ctx.font = 'bold 11px "Arial", sans-serif';
        ctx.fillText('បង្កាន់ដៃ', baseWidth / 2, 45);
        
        let yPos = 75;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#000000';
        const now = new Date();
        ctx.font = 'bold 10px "Arial", sans-serif';
        ctx.fillText(formatDateDDMMYYYY(now.toISOString()), 20, yPos);
        
        if (orderData.customer_info?.name) {
          ctx.textAlign = 'right';
          ctx.fillText(`អតិថិជន: ${orderData.customer_info.name}`, baseWidth - 20, yPos);
        }
        
        yPos += 15;
        if (orderData.customer_info?.phone) {
          ctx.font = '9px "Arial", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`ទូរស័ព្ទ: ${orderData.customer_info.phone}`, baseWidth - 20, yPos);
          yPos += 10;
        }
        
        yPos += 10;
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(20, yPos); ctx.lineTo(baseWidth - 20, yPos); ctx.stroke();
        yPos += 15;
        
        ctx.textAlign = 'left';
        ctx.font = 'bold 10px "Arial", sans-serif';
        ctx.fillText('ទំនិញ', 20, yPos);
        ctx.fillText('ចំនួន', 200, yPos);
        ctx.fillText('តម្លៃ', 280, yPos);
        yPos += 12;
        
        ctx.font = '9px "Arial", sans-serif';
        if (orderData.items?.length > 0) {
          orderData.items.forEach((item: any) => {
            const itemName = item.product_name || 'ទំនិញ';
            ctx.textAlign = 'left';
            ctx.fillText(itemName.substring(0, 30), 20, yPos);
            ctx.textAlign = 'right';
            ctx.fillText(item.qty.toString(), 220, yPos);
            ctx.fillText(formatCurrency(item.price_at_order), 300, yPos);
            yPos += 15;
          });
        }
        
        yPos += 5;
        ctx.strokeStyle = '#CCCCCC';
        ctx.beginPath(); ctx.moveTo(20, yPos); ctx.lineTo(baseWidth - 20, yPos); ctx.stroke();
        yPos += 15;
        
        ctx.font = 'bold 11px "Arial", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('សរុប៖', baseWidth - 120, yPos);
        ctx.fillText(formatCurrency(orderData.total), baseWidth - 20, yPos);
        
        yPos += 20;
        ctx.textAlign = 'center';
        ctx.font = '8px "Arial", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('barista.sobkh.com', baseWidth / 2, yPos);
        
        setInvoiceImage(canvas.toDataURL('image/png', 1.0));
      } catch (error) {
        console.error(error);
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId || user?.role !== 'sale') return;
      try {
        setIsLoading(true);
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/online-orders/${orderId}`, { withCredentials: true });
        if (res.data?.success) {
          setOrderDetails(res.data.data);
          generateInvoiceImage(res.data.data);
        }
      } catch (error) {
        toast.error("បរាជ័យក្នុងការទាញយកព័ត៌មាន");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrderDetails();
  }, [orderId, user?.role]);

  const downloadInvoice = () => {
    if (!invoiceImage) return;
    const link = document.createElement('a');
    link.href = invoiceImage;
    link.download = `SOB_${orderId}.png`;
    link.click();
    toast.success("ទាញយកជោគជ័យ");
  };

  const shareInvoice = async () => {
    if (!invoiceImage) return;
    try {
      const response = await fetch(invoiceImage);
      const blob = await response.blob();
      const file = new File([blob], `SOB_${orderId}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `SOB #${orderId}` });
      } else {
        downloadInvoice();
      }
    } catch (error) {
      downloadInvoice();
    }
  };

  if (user?.role !== 'sale') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <Icon icon="mdi:check-circle" width={64} className="text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">ទូទាត់ជោគជ័យ</h1>
        <p className="text-blue-600 font-bold mb-6">#{orderId}</p>
        <a href="/" className="w-full max-w-xs py-3 bg-blue-600 text-white text-center rounded-lg">{t.home}</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 shadow-sm border-b flex items-center gap-3">
        <button onClick={() => window.history.back()}><Icon icon="mdi:arrow-left" width={24}/></button>
        <h1 className="font-bold">ព័ត៌មានបញ្ជាទិញ #{orderId}</h1>
      </div>

      {isLoading ? (
        <div className="p-10 text-center animate-pulse text-gray-400">កំពុងទាញយក...</div>
      ) : orderDetails && (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Info */}
            <div className="p-4 bg-gray-50 border-b">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">{formatDateDDMMYYYY(orderDetails.created_at)}</span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">SALE MODE</span>
               </div>
               {orderDetails.customer_info && (
                 <div className="text-sm">
                    <p className="font-bold text-gray-800">{orderDetails.customer_info.name}</p>
                    <p className="text-gray-600">{orderDetails.customer_info.phone}</p>
                 </div>
               )}
            </div>

            {/* Items List */}
            <div className="p-4 space-y-3">
              {orderDetails.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.qty} x {formatCurrency(item.price_at_order)}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.qty * item.price_at_order)}</p>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="p-4 border-t bg-blue-50/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">ទឹកប្រាក់សរុប</span>
                <span className="text-xl font-black text-blue-600">{formatCurrency(orderDetails.total)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Payment: {orderDetails.payment_method || 'Cash'}</p>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t grid grid-cols-2 gap-2">
              <button 
                onClick={downloadInvoice}
                disabled={isGeneratingInvoice}
                className="flex items-center justify-center gap-2 py-3 bg-gray-800 text-white rounded-lg active:scale-95 transition-transform"
              >
                <Icon icon="mdi:download" width={20}/> ទាញយក
              </button>
              <button 
                onClick={shareInvoice}
                disabled={isGeneratingInvoice}
                className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg active:scale-95 transition-transform"
              >
                <Icon icon="mdi:share-variant" width={20}/> ចែករំលែក
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-2">
        <a href="/" className="flex-1 py-3 bg-gray-100 text-center rounded-lg font-bold">{t.home}</a>
        {telegramLink && (
          <a href={telegramLink} target="_blank" className="flex-1 py-3 bg-blue-600 text-white text-center rounded-lg font-bold flex items-center justify-center gap-2">
            <Icon icon="mdi:telegram" width={20}/> Telegram
          </a>
        )}
      </div>
    </div>
  );
};

export default page;