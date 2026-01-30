"use client";
import { useSearchParams } from "next/navigation";
import Icon from '@/components/Icon';
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";

const page = () => {
  const params = useSearchParams();
  const telegramLink = params.get("telegram");
  const orderId = params.get("order_id");
  const { user } = useAuth();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mobile-optimized invoice generation
  const generateInvoiceImage = (orderData: any) => {
    if (!orderData) return;
    
    setIsGeneratingInvoice(true);
    
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error("Failed to create invoice");
          setIsGeneratingInvoice(false);
          return;
        }

        // Mobile-friendly size (smaller for faster generation)
        canvas.width = 600;
        canvas.height = 800;
        
        // Clean background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Header (simpler for mobile)
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(0, 0, canvas.width, 70);
        
        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RECEIPT', canvas.width / 2, 40);
        
        ctx.font = '14px Arial';
        ctx.fillText(`#${orderId}`, canvas.width / 2, 60);
        
        // Content
        let yPos = 90;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1F2937';
        
        // Date
        ctx.font = '12px Arial';
        ctx.fillText('Date:', 30, yPos);
        ctx.font = 'bold 12px Arial';
        ctx.fillText(new Date().toLocaleDateString(), 100, yPos);
        yPos += 20;
        
        // Customer
        if (orderData.customer_info?.name) {
          ctx.font = '12px Arial';
          ctx.fillStyle = '#6B7280';
          ctx.fillText('Customer:', 30, yPos);
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#1F2937';
          ctx.fillText(orderData.customer_info.name.substring(0, 30), 100, yPos);
          yPos += 20;
        }
        
        // Line
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(30, yPos);
        ctx.lineTo(canvas.width - 30, yPos);
        ctx.stroke();
        yPos += 30;
        
        // Table header
        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('ITEM', 30, yPos);
        ctx.fillText('QTY', 350, yPos);
        ctx.fillText('TOTAL', 450, yPos);
        yPos += 20;
        
        // Items
        ctx.fillStyle = '#1F2937';
        ctx.font = '12px Arial';
        
        if (orderData.items?.length > 0) {
          orderData.items.forEach((item: any) => {
            const itemName = item.product_name || 'Item';
            const quantity = safeNumber(item.qty);
            const price = safeNumber(item.price_at_order);
            const itemTotal = quantity * price;
            
            // Shorten long names for mobile
            const displayName = itemName.length > 20 ? itemName.substring(0, 20) + '...' : itemName;
            
            ctx.fillText(displayName, 30, yPos);
            ctx.fillText(quantity.toString(), 360, yPos);
            ctx.fillText(formatCurrency(itemTotal), 460, yPos);
            yPos += 18;
          });
        }
        
        yPos += 20;
        
        // Total
        ctx.strokeStyle = '#E5E7EB';
        ctx.beginPath();
        ctx.moveTo(30, yPos);
        ctx.lineTo(canvas.width - 30, yPos);
        ctx.stroke();
        yPos += 30;
        
        ctx.font = 'bold 16px Arial';
        ctx.fillText('TOTAL:', 350, yPos);
        const totalAmount = safeNumber(orderData.total);
        ctx.fillText(formatCurrency(totalAmount), 460, yPos);
        
        // Footer
        yPos = canvas.height - 40;
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Thank you for your business!', canvas.width / 2, yPos);
        ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, yPos + 15);
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/png');
        setInvoiceImage(dataUrl);
      } catch (error) {
        console.error("Error generating invoice:", error);
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 50);
  };

  // Fetch data
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId || user?.role !== 'sale') return;

      try {
        setIsLoading(true);
        const orderRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/online-orders/${orderId}`,
          { withCredentials: true }
        );

        if (orderRes.data?.success) {
          setOrderDetails(orderRes.data.data);
          generateInvoiceImage(orderRes.data.data);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load order");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, user?.role]);

  // Mobile-optimized actions
  const downloadInvoice = () => {
    if (!invoiceImage) return;
    
    const link = document.createElement('a');
    link.href = invoiceImage;
    link.download = `receipt_${orderId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded!");
  };

  const shareInvoice = async () => {
    if (!invoiceImage) return;
    
    try {
      const response = await fetch(invoiceImage);
      const blob = await response.blob();
      const file = new File([blob], `receipt_${orderId}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt #${orderId}`,
          text: `Order receipt #${orderId}`
        });
      } else {
        downloadInvoice();
      }
    } catch (error) {
      downloadInvoice();
    }
  };

  const printInvoice = () => {
    if (!invoiceImage) return;
    window.open(invoiceImage, '_blank');
  };

  // If not sales role, show simple success
  if (user?.role !== 'sale') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon icon="icon-park-solid:success" width={40} height={40} style={{ color: "#22c55e" }} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Order Successful! 🎉
          </h1>
          
          <p className="text-gray-600 mb-8 px-4">
            Your order #{orderId} has been placed. We'll notify you when it's ready.
          </p>
          
          <div className="space-y-3">
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                className="block w-full py-4 bg-blue-600 text-white rounded-xl font-medium text-center active:scale-95 transition-transform"
              >
                📱 Track on Telegram
              </a>
            )}
            
            <a
              href="/"
              className="block w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-center active:bg-gray-200 transition-colors"
            >
              ← Back to Home
            </a>
          </div>
          
          <p className="text-xs text-gray-400 mt-8">
            Need help? Contact support at +855 123 456 789
          </p>
        </div>
      </div>
    );
  }

  // Sales role - Mobile-optimized interface
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => window.history.back()}
            className="p-2 -ml-2"
          >
            <Icon icon="material-symbols:arrow-back" width={24} height={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Order #{orderId}</h1>
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="inline-flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading order...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && orderDetails && (
        <div className="p-4 space-y-4">
          {/* Quick Summary Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Icon icon="material-symbols:check-circle" width={20} height={20} style={{ color: "#22c55e" }} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Order Confirmed</h2>
                  <p className="text-xs text-gray-500">{formatDate(orderDetails.created_at)}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{formatCurrency(orderDetails.total)}</div>
                <div className="text-xs text-gray-500">{orderDetails.total_qty} items</div>
              </div>
            </div>
            
            {/* Customer Info */}
            {orderDetails.customer_info && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <Icon icon="material-symbols:person" width={16} height={16} style={{ color: "#3b82f6" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{orderDetails.customer_info.name}</p>
                    <p className="text-sm text-gray-600">{orderDetails.customer_info.phone}</p>
                    {orderDetails.address_info?.address && (
                      <p className="text-sm text-gray-500 mt-1">{orderDetails.address_info.address.substring(0, 50)}...</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Preview Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Receipt</h3>
              {isGeneratingInvoice ? (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Generating...
                </span>
              ) : (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Ready
                </span>
              )}
            </div>
            
            {isGeneratingInvoice ? (
              <div className="py-8 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent mb-3"></div>
                  <p className="text-sm text-gray-600">Creating receipt...</p>
                </div>
              </div>
            ) : invoiceImage ? (
              <>
                <div 
                  className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 mb-4"
                  onClick={() => setShowFullInvoice(true)}
                >
                  <img 
                    src={invoiceImage} 
                    alt="Receipt preview" 
                    className="w-full h-auto"
                  />
                  <div className="bg-gradient-to-t from-white/90 to-transparent p-3 text-center">
                    <p className="text-sm text-gray-600">👆 Tap to view full receipt</p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={downloadInvoice}
                    className="flex items-center justify-center py-3 bg-blue-600 text-white rounded-xl active:scale-95 transition-transform"
                  >
                    <Icon icon="material-symbols:download" width={20} height={20} className="mr-2" />
                    Save
                  </button>
                  <button
                    onClick={shareInvoice}
                    className="flex items-center justify-center py-3 bg-green-600 text-white rounded-xl active:scale-95 transition-transform"
                  >
                    <Icon icon="material-symbols:share" width={20} height={20} className="mr-2" />
                    Share
                  </button>
                </div>
                
                <button
                  onClick={printInvoice}
                  className="w-full mt-2 flex items-center justify-center py-3 bg-gray-100 text-gray-700 rounded-xl active:bg-gray-200 transition-colors"
                >
                  <Icon icon="material-symbols:print" width={20} height={20} className="mr-2" />
                  Print Receipt
                </button>
              </>
            ) : null}
          </div>

          {/* Items List */}
          {orderDetails.items && orderDetails.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-800 mb-3">Order Items</h3>
              <div className="space-y-3">
                {orderDetails.items.slice(0, 3).map((item: any, index: number) => {
                  const quantity = safeNumber(item.qty);
                  const price = safeNumber(item.price_at_order);
                  const itemTotal = quantity * price;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">
                          {item.product_name || `Item ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {quantity} × {formatCurrency(price)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-800">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  );
                })}
                
                {orderDetails.items.length > 3 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-center text-sm text-gray-500">
                      +{orderDetails.items.length - 3} more items
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(orderDetails.total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-2">Payment</h3>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Icon icon="material-symbols:payments" width={20} height={20} style={{ color: "#3b82f6" }} />
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  {orderDetails.payment_method || 'Cash'} Payment
                </p>
                <p className="text-sm text-gray-500">Status: Paid</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <a
            href="/"
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-center active:bg-gray-200 transition-colors"
          >
            ← Home
          </a>
          <a
            href="/"
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-center active:scale-95 transition-transform"
          >
            New Order
          </a>
        </div>
      </div>

      {/* Full Invoice Modal */}
      {showFullInvoice && invoiceImage && (
        <div 
          className="fixed inset-0 bg-black z-50 flex flex-col"
          onClick={() => setShowFullInvoice(false)}
        >
          <div className="sticky top-0 bg-black/80 backdrop-blur-sm p-4 flex justify-between items-center">
            <button
              onClick={() => setShowFullInvoice(false)}
              className="text-white p-2"
            >
              <Icon icon="material-symbols:close" width={24} height={24} />
            </button>
            <p className="text-white font-medium">Receipt #{orderId}</p>
            <div className="w-10"></div> {/* Spacer */}
          </div>
          
          <div className="flex-1 overflow-auto">
            <img 
              src={invoiceImage} 
              alt="Full receipt" 
              className="w-full h-auto min-h-full object-contain bg-white"
            />
          </div>
          
          <div className="sticky bottom-0 bg-black/80 backdrop-blur-sm p-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={downloadInvoice}
                className="py-3 bg-white text-black rounded-xl font-medium active:scale-95 transition-transform"
              >
                Save
              </button>
              <button
                onClick={printInvoice}
                className="py-3 bg-blue-600 text-white rounded-xl font-medium active:scale-95 transition-transform"
              >
                Print
              </button>
              <button
                onClick={shareInvoice}
                className="py-3 bg-green-600 text-white rounded-xl font-medium active:scale-95 transition-transform"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Link */}
      {telegramLink && (
        <div className="px-4 mb-4">
          <a
            href={telegramLink}
            target="_blank"
            className="block py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-center active:scale-95 transition-transform shadow-lg"
          >
            <Icon icon="material-symbols:telegram" width={20} height={20} className="inline mr-2" />
            Track Order on Telegram
          </a>
        </div>
      )}
    </div>
  );
};

export default page;