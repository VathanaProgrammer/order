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

  // Format date as dd-mm-yyyy
  const formatDateDDMMYYYY = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  // Calculate dynamic canvas height based on items
  const calculateCanvasHeight = (orderData: any): number => {
    if (!orderData) return 600;
    
    let baseHeight = 300; // Base height for header and footer
    const itemsCount = orderData.items?.length || 0;
    const customerInfoHeight = orderData.customer_info ? 60 : 0;
    
    // Each item takes about 15px of height
    const itemsHeight = itemsCount * 15;
    
    // Additional space for address if it's long
    const address = orderData.address_info?.address || '';
    const addressLines = Math.ceil(address.length / 40);
    const addressHeight = addressLines * 12;
    
    // Total height calculation
    const totalHeight = baseHeight + customerInfoHeight + itemsHeight + addressHeight + 100;
    
    // Return a minimum height and maximum reasonable height
    return Math.max(600, Math.min(totalHeight, 2000));
  };

  // SOB-style invoice generation
  const generateInvoiceImage = (orderData: any) => {
    if (!orderData) return;
    
    setIsGeneratingInvoice(true);
    
    setTimeout(() => {
      try {
        // Calculate dynamic height
        const canvasHeight = calculateCanvasHeight(orderData);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          toast.error("Failed to create invoice");
          setIsGeneratingInvoice(false);
          return;
        }

        // Set canvas dimensions
        canvas.width = 384; // Standard thermal printer width
        canvas.height = canvasHeight;
        
        // Clean white background (SOB uses pure white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // SOB Logo Header (simplified version)
        ctx.fillStyle = '#1e4ce4'; // SOB Blue
        ctx.fillRect(0, 0, canvas.width, 80);
        
        // White SOB text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SOB', canvas.width / 2, 40);
        
        ctx.font = 'bold 14px "Arial", sans-serif';
        ctx.fillText('RECEIPT', canvas.width / 2, 60);
        
        // Separator line (SOB style)
        ctx.strokeStyle = '#1e3fe4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 90);
        ctx.lineTo(canvas.width - 20, 90);
        ctx.stroke();
        
        // Receipt details (centered like SOB)
        let yPos = 115;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        
        // Date and Time (SOB style) - using dd-mm-yyyy format
        const now = new Date();
        ctx.font = '12px "Arial", sans-serif';
        ctx.fillText('Date/Time:', canvas.width / 2, yPos);
        yPos += 15;
        ctx.font = 'bold 12px "Arial", sans-serif';
        
        // Format: dd-mm-yyyy HH:mm
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        ctx.fillText(
          `${day}-${month}-${year} ${hours}:${minutes}`,
          canvas.width / 2,
          yPos
        );
        yPos += 25;
        
        // Receipt Number
        ctx.font = '12px "Arial", sans-serif';
        ctx.fillText('Receipt No:', canvas.width / 2, yPos);
        yPos += 15;
        ctx.font = 'bold 14px "Arial", sans-serif';
        ctx.fillText(`#${orderId}`, canvas.width / 2, yPos);
        yPos += 25;
        
        // Merchant info (left aligned)
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px "Arial", sans-serif';
        ctx.fillText('MERCHANT', 20, yPos);
        yPos += 15;
        
        ctx.font = '11px "Arial", sans-serif';
        ctx.fillText('SOB', 20, yPos);
        yPos += 12;
        ctx.fillText('Phnom Penh, Cambodia', 20, yPos);
        yPos += 25;
        
        // Customer info
        if (orderData.customer_info?.name) {
          ctx.font = 'bold 13px "Arial", sans-serif';
          ctx.fillText('CUSTOMER', 20, yPos);
          yPos += 15;
          
          ctx.font = '11px "Arial", sans-serif';
          ctx.fillText(`Name: ${orderData.customer_info.name}`, 20, yPos);
          yPos += 12;
          if (orderData.customer_info.phone) {
            ctx.fillText(`Phone: ${orderData.customer_info.phone}`, 20, yPos);
            yPos += 12;
          }
          if (orderData.address_info?.address) {
            const address = orderData.address_info.address;
            const maxLineLength = 40;
            for (let i = 0; i < address.length; i += maxLineLength) {
              const line = address.substring(i, i + maxLineLength);
              ctx.fillText(line, 20, yPos);
              yPos += 12;
            }
          } else {
            yPos += 12; // Add spacing even if no address
          }
          yPos += 15;
        }
        
        // Separator
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, yPos);
        ctx.lineTo(canvas.width - 20, yPos);
        ctx.stroke();
        yPos += 20;
        
        // Table Header (SOB style - simple)
        ctx.font = 'bold 12px "Arial", sans-serif';
        ctx.fillText('ITEM', 20, yPos);
        ctx.fillText('QTY', 200, yPos);
        ctx.fillText('AMOUNT', 280, yPos);
        yPos += 20;
        
        // Separator
        ctx.beginPath();
        ctx.moveTo(20, yPos - 5);
        ctx.lineTo(canvas.width - 20, yPos - 5);
        ctx.stroke();
        yPos += 10;
        
        // Items (left aligned)
        ctx.font = '11px "Arial", sans-serif';
        ctx.fillStyle = '#000000';
        
        if (orderData.items?.length > 0) {
          orderData.items.forEach((item: any) => {
            const itemName = item.product_name || 'Product';
            const quantity = safeNumber(item.qty);
            const price = safeNumber(item.price_at_order);
            
            // Handle long item names by wrapping text
            const maxWidth = 150; // pixels
            ctx.font = '11px "Arial", sans-serif';
            
            // Split long item names into multiple lines
            const words = itemName.split(' ');
            let line = '';
            let lineY = yPos;
            
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;
              
              if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, 20, lineY);
                line = words[n] + ' ';
                lineY += 12;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, 20, lineY);
            
            // Quantity and Amount (aligned right)
            ctx.textAlign = 'right';
            ctx.fillText(quantity.toString(), 220, yPos);
            ctx.fillText(formatCurrency(price), 300, yPos);
            ctx.textAlign = 'left';
            
            // Move y position down based on how many lines the item name took
            const linesUsed = Math.max(1, Math.ceil((lineY - yPos) / 12) + 1);
            yPos += linesUsed * 12 + 5;
          });
        }
        
        yPos += 5;
        
        // Separator
        ctx.strokeStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.moveTo(20, yPos);
        ctx.lineTo(canvas.width - 20, yPos);
        ctx.stroke();
        yPos += 20;
        
        // Total (right aligned like SOB)
        ctx.font = 'bold 13px "Arial", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('TOTAL:', canvas.width - 120, yPos);
        const totalAmount = safeNumber(orderData.total);
        ctx.fillText(formatCurrency(totalAmount), canvas.width - 20, yPos);
        yPos += 25;
        
        // Payment Method
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px "Arial", sans-serif';
        ctx.fillText('PAYMENT METHOD:', 20, yPos);
        yPos += 15;
        ctx.font = '11px "Arial", sans-serif';
        ctx.fillText(orderData.payment_method || 'Cash', 20, yPos);
        yPos += 25;
        
        // Thank you message (centered)
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px "Arial", sans-serif';
        ctx.fillStyle = '#1e74e4';
        ctx.fillText('THANK YOU!', canvas.width / 2, yPos);
        yPos += 15;
        ctx.font = '10px "Arial", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('For customer service:', canvas.width / 2, yPos);
        yPos += 12;
        ctx.fillText('barista.sobkh.com', canvas.width / 2, yPos);
        
        // Order date (if exists)
        if (orderData.created_at) {
          yPos += 15;
          ctx.font = '10px "Arial", sans-serif';
          ctx.fillStyle = '#666666';
          ctx.fillText(`Order Date: ${formatDateDDMMYYYY(orderData.created_at)}`, canvas.width / 2, yPos);
        }
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/png');
        setInvoiceImage(dataUrl);
      } catch (error) {
        console.error("Error generating invoice:", error);
        toast.error("Failed to generate receipt");
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

  // Actions
  const downloadInvoice = () => {
    if (!invoiceImage) return;
    
    const link = document.createElement('a');
    link.href = invoiceImage;
    link.download = `sob_receipt_${orderId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Receipt downloaded!");
  };

  const shareInvoice = async () => {
    if (!invoiceImage) return;
    
    try {
      const response = await fetch(invoiceImage);
      const blob = await response.blob();
      const file = new File([blob], `SOB_receipt_${orderId}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `SOB Receipt #${orderId}`,
          text: `SOB-style receipt for order #${orderId}`
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
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${orderId}</title>
            <style>
              body { margin: 0; padding: 10px; background: white; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { padding: 0; }
                img { width: 384px; }
                @page { margin: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${invoiceImage}" alt="SOB Receipt" />
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // If not sales role, show simple success
  if (user?.role !== 'sale') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-gray-200">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Icon icon="mdi:check-circle" width={48} height={48} style={{ color: "#10B981" }} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Payment Successful
          </h1>
          
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 mb-2">Order Reference</p>
            <p className="text-xl font-mono font-bold text-blue-600">#{orderId}</p>
            {orderDetails?.created_at && (
              <p className="text-sm text-gray-500 mt-2">
                {formatDateDDMMYYYY(orderDetails.created_at)}
              </p>
            )}
          </div>
          
          <p className="text-gray-600 mb-8 px-4">
            Your transaction has been completed successfully.
          </p>
          
          <div className="space-y-3">
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                className="block w-full py-4 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Icon icon="mdi:telegram" width={20} height={20} className="inline mr-2" />
                Track Order
              </a>
            )}
            
            <a
              href="/"
              className="block w-full py-4 bg-gray-100 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-200 transition-colors"
            >
              Return to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Sales role - SOB-style interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <button 
              onClick={() => window.history.back()}
              className="p-2 -ml-2 text-gray-600"
            >
              <Icon icon="mdi:arrow-left" width={24} height={24} />
            </button>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-800">Receipt #{orderId}</h1>
              {orderDetails?.created_at && (
                <p className="text-xs text-gray-500">
                  {formatDateDDMMYYYY(orderDetails.created_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="inline-flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading receipt...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && orderDetails && (
        <div className="p-4">
          {/* Receipt Preview Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
            {isGeneratingInvoice ? (
              <div className="py-12 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent mb-3"></div>
                  <p className="text-sm text-gray-600">Generating receipt...</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {orderDetails.items?.length || 0} items
                  </p>
                </div>
              </div>
            ) : invoiceImage ? (
              <>
                <div className="p-4">
                  <div 
                    className="border border-gray-300 rounded bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowFullInvoice(true)}
                  >
                    <img 
                      src={invoiceImage} 
                      alt="SOB Receipt" 
                      className="w-full h-auto"
                    />
                    <div className="p-3 bg-gray-50 text-center border-t border-gray-200">
                      <p className="text-sm text-gray-600">Tap to view full receipt</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {orderDetails.items?.length || 0} items • {formatCurrency(orderDetails.total)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={downloadInvoice}
                      className="flex items-center justify-center py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
                    >
                      <Icon icon="mdi:download" width={18} height={18} className="mr-2" />
                      Download
                    </button>
                    <button
                      onClick={printInvoice}
                      className="flex items-center justify-center py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors active:scale-95"
                    >
                      <Icon icon="mdi:printer" width={18} height={18} className="mr-2" />
                      Print
                    </button>
                  </div>
                  <button
                    onClick={shareInvoice}
                    className="w-full mt-3 flex items-center justify-center py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors active:scale-95"
                  >
                    <Icon icon="mdi:share-variant" width={18} height={18} className="mr-2" />
                    Share Receipt
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Transaction Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b">Transaction Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time</span>
                <span className="font-medium">{formatDateDDMMYYYY(orderDetails.created_at)}</span>
              </div>
              
              {orderDetails.customer_info && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer</span>
                    <span className="font-medium">{orderDetails.customer_info.name}</span>
                  </div>
                  {orderDetails.customer_info.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone</span>
                      <span className="font-medium">{orderDetails.customer_info.phone}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-medium">{orderDetails.total_qty} items</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">{orderDetails.payment_method || 'Cash'}</span>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Total Amount</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(orderDetails.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Items Preview */}
          {orderDetails.items && orderDetails.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <h3 className="font-bold text-gray-800">Items ({orderDetails.items.length})</h3>
                <span className="text-sm text-gray-500">{orderDetails.total_qty} total</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {orderDetails.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.qty} × {formatCurrency(item.price_at_order)}</p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(safeNumber(item.qty) * safeNumber(item.price_at_order))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-200 transition-colors"
          >
            Home
          </a>
          
          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Icon icon="mdi:telegram" width={20} height={20} className="mr-2" />
              Telegram
            </a>
          )}
        </div>
      </div>

      {/* Full Invoice Modal */}
      {showFullInvoice && invoiceImage && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="h-full flex flex-col">
            {/* Modal Header */}
            <div className="bg-black/90 p-3 flex justify-between items-center">
              <button
                onClick={() => setShowFullInvoice(false)}
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Icon icon="mdi:close" width={24} height={24} />
              </button>
              <span className="text-white font-medium">Receipt #{orderId}</span>
              <div className="w-8"></div>
            </div>
            
            {/* Receipt Image */}
            <div className="flex-1 overflow-auto bg-white flex items-center justify-center p-4">
              <img 
                src={invoiceImage} 
                alt="Full SOB Receipt" 
                className="max-w-full h-auto"
              />
            </div>
            
            {/* Modal Actions */}
            <div className="bg-black/90 p-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadInvoice}
                  className="py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors active:scale-95"
                >
                  Download
                </button>
                <button
                  onClick={printInvoice}
                  className="py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors active:scale-95"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default page;