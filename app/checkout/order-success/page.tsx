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
    if (!orderData) return 500;
    
    let baseHeight = 220; // Reduced base height
    const itemsCount = orderData.items?.length || 0;
    const customerInfoHeight = orderData.customer_info ? 40 : 0;
    
    // Each item takes about 12px of height
    const itemsHeight = itemsCount * 12;
    
    // Additional space for address if it's long
    const address = orderData.address_info?.address || '';
    const addressLines = Math.ceil(address.length / 40);
    const addressHeight = addressLines * 10;
    
    // Total height calculation
    const totalHeight = baseHeight + customerInfoHeight + itemsHeight + addressHeight + 50;
    
    // Return a minimum height
    return Math.max(500, Math.min(totalHeight, 2000));
  };

  // SOB-style invoice generation (Khmer version)
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
          toast.error("បរាជ័យក្នុងការបង្កើតបង្កាន់ដៃ");
          setIsGeneratingInvoice(false);
          return;
        }

        // Set canvas dimensions
        canvas.width = 384;
        canvas.height = canvasHeight;
        
        // Clean white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // SOB Logo Header (simplified)
        ctx.fillStyle = '#1e4ce4';
        ctx.fillRect(0, 0, canvas.width, 60); // Reduced header height
        
        // White SOB text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SOB', canvas.width / 2, 35);
        
        ctx.font = 'bold 12px "Arial", sans-serif';
        ctx.fillText('បង្កាន់ដៃ', canvas.width / 2, 50);
        
        // Separator line
        ctx.strokeStyle = '#1e3fe4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 65);
        ctx.lineTo(canvas.width - 20, 65);
        ctx.stroke();
        
        // Receipt details - compact layout
        let yPos = 85;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        
        // Date and Time (Khmer)
        const now = new Date();
        ctx.font = '10px "Arial", sans-serif';
        ctx.fillText('កាលបរិច្ឆេទ/ពេលវេលា៖', canvas.width / 2, yPos);
        yPos += 12;
        ctx.font = 'bold 11px "Arial", sans-serif';
        
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
        yPos += 20;
        
        // Receipt Number
        ctx.font = '10px "Arial", sans-serif';
        ctx.fillText('លេខបង្កាន់ដៃ៖', canvas.width / 2, yPos);
        yPos += 12;
        ctx.font = 'bold 12px "Arial", sans-serif';
        ctx.fillText(`#${orderId}`, canvas.width / 2, yPos);
        yPos += 20;
        
        // Customer info (no merchant info as requested)
        if (orderData.customer_info?.name) {
          ctx.textAlign = 'left';
          ctx.font = 'bold 11px "Arial", sans-serif';
          ctx.fillText('អតិថិជន', 20, yPos);
          yPos += 12;
          
          ctx.font = '10px "Arial", sans-serif';
          ctx.fillText(`ឈ្មោះ៖ ${orderData.customer_info.name}`, 20, yPos);
          yPos += 10;
          if (orderData.customer_info.phone) {
            ctx.fillText(`ទូរស័ព្ទ៖ ${orderData.customer_info.phone}`, 20, yPos);
            yPos += 10;
          }
          if (orderData.address_info?.address) {
            const address = orderData.address_info.address;
            const maxLineLength = 40;
            for (let i = 0; i < address.length; i += maxLineLength) {
              const line = address.substring(i, i + maxLineLength);
              ctx.fillText(line, 20, yPos);
              yPos += 10;
            }
          } else {
            yPos += 10;
          }
          yPos += 10;
        }
        
        // Separator
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, yPos);
        ctx.lineTo(canvas.width - 20, yPos);
        ctx.stroke();
        yPos += 15;
        
        // Table Header
        ctx.font = 'bold 11px "Arial", sans-serif';
        ctx.fillText('ទំនិញ', 20, yPos);
        ctx.fillText('ចំនួន', 200, yPos);
        ctx.fillText('តម្លៃ', 280, yPos);
        yPos += 15;
        
        // Separator
        ctx.beginPath();
        ctx.moveTo(20, yPos - 5);
        ctx.lineTo(canvas.width - 20, yPos - 5);
        ctx.stroke();
        yPos += 8;
        
        // Items
        ctx.font = '10px "Arial", sans-serif';
        ctx.fillStyle = '#000000';
        
        if (orderData.items?.length > 0) {
          orderData.items.forEach((item: any) => {
            const itemName = item.product_name || 'ទំនិញ';
            const quantity = safeNumber(item.qty);
            const price = safeNumber(item.price_at_order);
            
            // Handle long item names
            const maxWidth = 150;
            ctx.font = '10px "Arial", sans-serif';
            
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
                lineY += 10;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, 20, lineY);
            
            // Quantity and Amount
            ctx.textAlign = 'right';
            ctx.fillText(quantity.toString(), 220, yPos);
            ctx.fillText(formatCurrency(price), 300, yPos);
            ctx.textAlign = 'left';
            
            // Move y position down
            const linesUsed = Math.max(1, Math.ceil((lineY - yPos) / 10) + 1);
            yPos += linesUsed * 10 + 3;
          });
        }
        
        yPos += 3;
        
        // Separator
        ctx.strokeStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.moveTo(20, yPos);
        ctx.lineTo(canvas.width - 20, yPos);
        ctx.stroke();
        yPos += 15;
        
        // Total
        ctx.font = 'bold 12px "Arial", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('សរុប៖', canvas.width - 120, yPos);
        const totalAmount = safeNumber(orderData.total);
        ctx.fillText(formatCurrency(totalAmount), canvas.width - 20, yPos);
        yPos += 20;
        
        // Payment Method
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px "Arial", sans-serif';
        ctx.fillText('វិធីសាស្ត្រទូទាត់៖', 20, yPos);
        yPos += 12;
        ctx.font = '10px "Arial", sans-serif';
        const paymentMethod = orderData.payment_method || 'Cash';
        const paymentMethodKhmer = paymentMethod === 'Cash' ? 'សាច់ប្រាក់' : paymentMethod;
        ctx.fillText(paymentMethodKhmer, 20, yPos);
        yPos += 20;
        
        // Thank you message
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px "Arial", sans-serif';
        ctx.fillStyle = '#1e74e4';
        ctx.fillText('សូមអរគុណ!', canvas.width / 2, yPos);
        yPos += 12;
        ctx.font = '9px "Arial", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('សម្រាប់សេវាកម្មអតិថិជន៖', canvas.width / 2, yPos);
        yPos += 10;
        ctx.fillText('barista.sobkh.com', canvas.width / 2, yPos);
        
        // Order date
        if (orderData.created_at) {
          yPos += 12;
          ctx.font = '9px "Arial", sans-serif';
          ctx.fillStyle = '#666666';
          const orderDate = formatDateDDMMYYYY(orderData.created_at);
          ctx.fillText(`កាលបរិច្ឆេទបញ្ជាទិញ៖ ${orderDate}`, canvas.width / 2, yPos);
        }
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/png');
        setInvoiceImage(dataUrl);
      } catch (error) {
        console.error("Error generating invoice:", error);
        toast.error("បរាជ័យក្នុងការបង្កើតបង្កាន់ដៃ");
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
        toast.error("បរាជ័យក្នុងការទាញយកព័ត៌មានបញ្ជាទិញ");
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
    toast.success("ទាញយកបង្កាន់ដៃដោយជោគជ័យ!");
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
          title: `បង្កាន់ដៃ SOB #${orderId}`,
          text: `បង្កាន់ដៃរបស់ SOB សម្រាប់បញ្ជាទិញលេខ #${orderId}`
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
            <title>បង្កាន់ដៃ #${orderId}</title>
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
            <img src="${invoiceImage}" alt="បង្កាន់ដៃ SOB" />
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
            ទូទាត់ដោយជោគជ័យ
          </h1>
          
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
            <p className="text-gray-600 mb-2">លេខយោងបញ្ជាទិញ</p>
            <p className="text-xl font-mono font-bold text-blue-600">#{orderId}</p>
            {orderDetails?.created_at && (
              <p className="text-sm text-gray-500 mt-2">
                {formatDateDDMMYYYY(orderDetails.created_at)}
              </p>
            )}
          </div>
          
          <p className="text-gray-600 mb-8 px-4">
            ប្រតិបត្តិការរបស់អ្នកត្រូវបានបញ្ចប់ដោយជោគជ័យ។
          </p>
          
          <div className="space-y-3">
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                className="block w-full py-4 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Icon icon="mdi:telegram" width={20} height={20} className="inline mr-2" />
                តាមដានបញ្ជាទិញ
              </a>
            )}
            
            <a
              href="/"
              className="block w-full py-4 bg-gray-100 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-200 transition-colors"
            >
              ត្រឡប់ទៅទំព័រដើម
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Sales role - SOB-style interface in Khmer
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
              <h1 className="text-lg font-bold text-gray-800">បង្កាន់ដៃ #{orderId}</h1>
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
            <p className="text-gray-600">កំពុងទាញយកបង្កាន់ដៃ...</p>
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
                  <p className="text-sm text-gray-600">កំពុងបង្កើតបង្កាន់ដៃ...</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {orderDetails.items?.length || 0} ទំនិញ
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
                      alt="បង្កាន់ដៃ SOB" 
                      className="w-full h-auto"
                    />
                    <div className="p-3 bg-gray-50 text-center border-t border-gray-200">
                      <p className="text-sm text-gray-600">ចុចដើម្បីមើលបង្កាន់ដៃពេញ</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {orderDetails.items?.length || 0} ទំនិញ • {formatCurrency(orderDetails.total)}
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
                      ទាញយក
                    </button>
                    <button
                      onClick={printInvoice}
                      className="flex items-center justify-center py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors active:scale-95"
                    >
                      <Icon icon="mdi:printer" width={18} height={18} className="mr-2" />
                      បោះពុម្ព
                    </button>
                  </div>
                  <button
                    onClick={shareInvoice}
                    className="w-full mt-3 flex items-center justify-center py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors active:scale-95"
                  >
                    <Icon icon="mdi:share-variant" width={18} height={18} className="mr-2" />
                    ចែករំលែក
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Transaction Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h3 className="font-bold text-gray-800 mb-3 pb-2 border-b">សង្ខេបប្រតិបត្តិការ</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">កាលបរិច្ឆេទ/ពេលវេលា</span>
                <span className="font-medium">{formatDateDDMMYYYY(orderDetails.created_at)}</span>
              </div>
              
              {orderDetails.customer_info && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">អតិថិជន</span>
                    <span className="font-medium">{orderDetails.customer_info.name}</span>
                  </div>
                  {orderDetails.customer_info.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ទូរស័ព្ទ</span>
                      <span className="font-medium">{orderDetails.customer_info.phone}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">ចំនួនទំនិញ</span>
                <span className="font-medium">{orderDetails.total_qty} ទំនិញ</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">វិធីសាស្ត្រទូទាត់</span>
                <span className="font-medium">
                  {orderDetails.payment_method === 'Cash' ? 'សាច់ប្រាក់' : orderDetails.payment_method || 'សាច់ប្រាក់'}
                </span>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">ទឹកប្រាក់សរុប</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(orderDetails.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Items Preview */}
          {orderDetails.items && orderDetails.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <h3 className="font-bold text-gray-800">ទំនិញ ({orderDetails.items.length})</h3>
                <span className="text-sm text-gray-500">{orderDetails.total_qty} សរុប</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {orderDetails.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-500">ចំនួន៖ {item.qty} × {formatCurrency(item.price_at_order)}</p>
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
            ទំព័រដើម
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
              <span className="text-white font-medium">បង្កាន់ដៃ #{orderId}</span>
              <div className="w-8"></div>
            </div>
            
            {/* Receipt Image */}
            <div className="flex-1 overflow-auto bg-white flex items-center justify-center p-4">
              <img 
                src={invoiceImage} 
                alt="បង្កាន់ដៃ SOB ពេញ" 
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
                  ទាញយក
                </button>
                <button
                  onClick={printInvoice}
                  className="py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors active:scale-95"
                >
                  បោះពុម្ព
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