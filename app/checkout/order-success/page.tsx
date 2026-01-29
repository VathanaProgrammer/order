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

  // Helper functions
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value: any): string => {
    return `$${safeNumber(value).toFixed(2)}`;
  };

  // Fetch order details
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
          // Don't auto-generate invoice, let user click button
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast.error("Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, user?.role]);

  // Generate invoice image
  const generateInvoiceImage = () => {
    if (!orderDetails) return;
    
    setIsGeneratingInvoice(true);
    
    // Use setTimeout to avoid blocking UI
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error("Failed to create invoice canvas");
          return;
        }

        // Canvas size
        canvas.width = 800;
        canvas.height = 1000;
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Header
        ctx.fillStyle = '#1E40AF';
        ctx.fillRect(0, 0, canvas.width, 80);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('INVOICE', canvas.width / 2, 40);
        
        // Order details
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        let yPos = 120;
        
        // Invoice number
        ctx.fillText(`Invoice #: ${orderId}`, 50, yPos);
        yPos += 30;
        
        // Date
        ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 50, yPos);
        yPos += 30;
        
        // Customer info
        if (orderDetails.customer_info) {
          ctx.fillText(`Customer: ${orderDetails.customer_info.name || 'N/A'}`, 50, yPos);
          yPos += 20;
          ctx.fillText(`Phone: ${orderDetails.customer_info.phone || 'N/A'}`, 50, yPos);
          yPos += 30;
        }
        
        // Line
        ctx.strokeStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(50, yPos);
        ctx.lineTo(750, yPos);
        ctx.stroke();
        yPos += 40;
        
        // Table header
        ctx.fillStyle = '#4B5563';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Item', 50, yPos);
        ctx.fillText('Qty', 350, yPos);
        ctx.fillText('Price', 450, yPos);
        ctx.fillText('Total', 550, yPos);
        yPos += 30;
        
        // Items
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        
        if (orderDetails.items && orderDetails.items.length > 0) {
          orderDetails.items.forEach((item: any) => {
            const itemName = item.product_name || 'Product';
            const quantity = safeNumber(item.qty);
            const price = safeNumber(item.price_at_order);
            const itemTotal = quantity * price;
            
            ctx.fillText(itemName, 50, yPos);
            ctx.fillText(quantity.toString(), 350, yPos);
            ctx.fillText(formatCurrency(price), 450, yPos);
            ctx.fillText(formatCurrency(itemTotal), 550, yPos);
            yPos += 25;
          });
        }
        
        yPos += 20;
        
        // Total line
        ctx.strokeStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(50, yPos);
        ctx.lineTo(750, yPos);
        ctx.stroke();
        yPos += 30;
        
        // Total
        const totalAmount = safeNumber(orderDetails.total);
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Total:', 450, yPos);
        ctx.fillText(formatCurrency(totalAmount), 550, yPos);
        yPos += 40;
        
        // Footer
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Thank you for your business!', canvas.width / 2, canvas.height - 50);
        ctx.fillText('Generated on ' + new Date().toLocaleString(), canvas.width / 2, canvas.height - 30);
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/png');
        setInvoiceImage(dataUrl);
        toast.success("Invoice generated successfully!");
      } catch (error) {
        console.error("Error generating invoice:", error);
        toast.error("Failed to generate invoice");
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
  };

  const downloadInvoiceAsImage = () => {
    if (!invoiceImage) return;
    
    const link = document.createElement('a');
    link.href = invoiceImage;
    const customerName = orderDetails?.customer_info?.name || 'customer';
    const sanitizedName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `invoice_${orderId}_${sanitizedName}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Invoice downloaded!");
  };

  const printInvoice = () => {
    if (!invoiceImage) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice #${orderId}</title>
            <style>
              body { margin: 0; padding: 20px; text-align: center; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${invoiceImage}" alt="Invoice #${orderId}">
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const shareInvoice = async () => {
    if (!invoiceImage) return;
    
    try {
      // Convert data URL to blob
      const response = await fetch(invoiceImage);
      const blob = await response.blob();
      const file = new File([blob], `invoice_${orderId}.png`, { type: 'image/png' });
      
      // Check if Web Share API is available
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${orderId}`,
          text: `Invoice for order #${orderId}`
        });
        toast.success("Invoice shared!");
      } else {
        // Fallback: show download option
        toast.info("Share not supported. Download the invoice instead.");
      }
    } catch (error) {
      console.error("Error sharing invoice:", error);
      toast.error("Failed to share invoice");
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-center items-center p-4 overflow-y-auto">
      <div className="mb-4">
        <Icon icon="icon-park-solid:success" width={48} height={48} style={{ color: "#22ea00" }} />
      </div>
      <h3 className="text-2xl font-bold mb-2 text-center">Your order is made!</h3>
      
      {/* Sales Role Specific Content */}
      {user?.role === 'sale' && orderId && (
        <div className="w-full max-w-4xl mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-lg mb-2 text-blue-800">Sales Order Details</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading order details...</span>
              </div>
            ) : orderDetails ? (
              <div className="space-y-2">
                <p><span className="font-semibold">Order ID:</span> #{orderId}</p>
                {orderDetails.customer_info && (
                  <>
                    <p><span className="font-semibold">Customer:</span> {orderDetails.customer_info.name || 'N/A'}</p>
                    <p><span className="font-semibold">Phone:</span> {orderDetails.customer_info.phone || 'N/A'}</p>
                  </>
                )}
                <p><span className="font-semibold">Amount:</span> {formatCurrency(orderDetails.total)}</p>
                <p><span className="font-semibold">Date:</span> {orderDetails.created_at ? new Date(orderDetails.created_at).toLocaleString() : 'N/A'}</p>
                {orderDetails.address_info?.address && (
                  <p><span className="font-semibold">Address:</span> {orderDetails.address_info.address}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No order details available</p>
            )}
          </div>

          {/* Invoice Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
            <h4 className="font-bold text-lg mb-3 text-gray-800">Invoice</h4>
            
            {isGeneratingInvoice ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3">Generating invoice...</span>
              </div>
            ) : invoiceImage ? (
              <>
                {/* Invoice Preview */}
                <div className="mb-4 border border-gray-300 rounded p-2 bg-gray-50">
                  <img 
                    src={invoiceImage} 
                    alt="Invoice Preview" 
                    className="w-full h-auto max-h-[300px] object-contain mx-auto"
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Preview of invoice #{orderId}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={downloadInvoiceAsImage}
                    className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:download" width={20} height={20} />
                    Download (PNG)
                  </button>
                  
                  <button
                    onClick={printInvoice}
                    className="py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:print" width={20} height={20} />
                    Print
                  </button>
                  
                  <button
                    onClick={shareInvoice}
                    className="py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:share" width={20} height={20} />
                    Share
                  </button>
                  
                  <button
                    onClick={() => window.open(invoiceImage, '_blank')}
                    className="py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:open-in-new" width={20} height={20} />
                    Open Full
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">Generate an invoice for this order</p>
                <button
                  onClick={generateInvoiceImage}
                  disabled={isLoading || !orderDetails}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  <Icon icon="material-symbols:receipt" width={20} height={20} />
                  Generate Invoice
                </button>
              </div>
            )}
          </div>

          {/* Order Items Summary */}
          {orderDetails?.items && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-lg mb-3">Order Items</h4>
              <div className="space-y-2">
                {orderDetails.items.map((item: any, index: number) => {
                  const quantity = safeNumber(item.qty);
                  const price = safeNumber(item.price_at_order);
                  const itemTotal = quantity * price;
                  
                  return (
                    <div key={index} className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name || `Item ${index + 1}`}</p>
                        <p className="text-sm text-gray-600">
                          {quantity} × {formatCurrency(price)}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <p className="font-bold">Total</p>
                  <p className="font-bold text-lg">{formatCurrency(orderDetails.total)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-sm font-medium text-gray-600 max-w-sm mb-6">
        {user?.role === 'sale' 
          ? "Order placed successfully. Generate and download the invoice above."
          : "Thank you for your purchase! Your online order has been successfully placed."
        }
      </p>

      <div className="flex gap-4 flex-wrap justify-center">
        {/* Go Home Button */}
        <a href="/" className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          Home
        </a>

        {/* New Order Button (for sales) */}
        {user?.role === 'sale' && (
          <a 
            href="/" 
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            New Order
          </a>
        )}

        {/* Track Order via Telegram Button */}
        {telegramLink && (
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Track on Telegram
          </a>
        )}
      </div>
    </div>
  );
};

export default page;