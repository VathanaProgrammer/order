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
  const [companyInfo] = useState({
    name: "Your Business Name",
    address: "123 Business Street, City, Country",
    phone: "+855 123 456 789",
    email: "info@yourbusiness.com",
    website: "www.yourbusiness.com",
    logo: "/logo.png" // Add your logo path here
  });

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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate professional invoice image
  const generateInvoiceImage = (orderData: any) => {
    if (!orderData) return;
    
    setIsGeneratingInvoice(true);
    
    // Use setTimeout to avoid blocking UI
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error("Failed to create invoice canvas");
          setIsGeneratingInvoice(false);
          return;
        }

        // Canvas size for A4 paper (at 96 DPI)
        canvas.width = 794; // A4 width in pixels at 96 DPI
        canvas.height = 1123; // A4 height in pixels at 96 DPI
        
        // Background - clean white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Header gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#1E40AF');
        gradient.addColorStop(1, '#3B82F6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, 120);
        
        // Company Info (Left side)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(companyInfo.name, 50, 50);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#E5E7EB';
        ctx.fillText(companyInfo.address, 50, 70);
        ctx.fillText(`Phone: ${companyInfo.phone}`, 50, 85);
        ctx.fillText(`Email: ${companyInfo.email}`, 50, 100);
        
        // Invoice Title (Right side)
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('INVOICE', canvas.width - 50, 50);
        
        ctx.font = '14px Arial';
        ctx.fillText(`#${orderId}`, canvas.width - 50, 75);
        
        ctx.textAlign = 'left';
        
        // Main content area
        let yPos = 160;
        
        // Invoice Info Box
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(50, yPos, canvas.width - 100, 100);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(50, yPos, canvas.width - 100, 100);
        
        yPos += 20;
        
        // Invoice Date
        ctx.fillStyle = '#475569';
        ctx.font = '12px Arial';
        ctx.fillText('Invoice Date:', 70, yPos);
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }), 150, yPos);
        
        // Order Date
        ctx.fillStyle = '#475569';
        ctx.font = '12px Arial';
        ctx.fillText('Order Date:', 300, yPos);
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(orderData.created_at ? formatDate(orderData.created_at) : new Date().toLocaleDateString(), 380, yPos);
        
        yPos += 20;
        
        // Invoice To section
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('BILL TO:', 70, yPos);
        
        if (orderData.customer_info) {
          ctx.fillStyle = '#1E293B';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(orderData.customer_info.name || 'Customer', 70, yPos + 20);
          
          ctx.fillStyle = '#64748B';
          ctx.font = '12px Arial';
          if (orderData.customer_info.phone) {
            ctx.fillText(`Phone: ${orderData.customer_info.phone}`, 70, yPos + 40);
          }
          if (orderData.address_info?.address) {
            ctx.fillText(`Address: ${orderData.address_info.address}`, 70, yPos + 55);
          }
        }
        
        yPos = 280;
        
        // Items Table Header
        const tableTop = yPos;
        ctx.fillStyle = '#1E40AF';
        ctx.fillRect(50, tableTop, canvas.width - 100, 40);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('DESCRIPTION', 70, tableTop + 25);
        ctx.fillText('QTY', 400, tableTop + 25);
        ctx.fillText('PRICE', 480, tableTop + 25);
        ctx.fillText('TOTAL', 580, tableTop + 25);
        
        yPos = tableTop + 40;
        
        // Items List
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        
        let subtotal = 0;
        
        if (orderData.items && orderData.items.length > 0) {
          orderData.items.forEach((item: any, index: number) => {
            const itemName = item.product_name || 'Product';
            const quantity = safeNumber(item.qty);
            const price = safeNumber(item.price_at_order);
            const itemTotal = quantity * price;
            subtotal += itemTotal;
            
            // Alternate row colors
            if (index % 2 === 0) {
              ctx.fillStyle = '#F8FAFC';
            } else {
              ctx.fillStyle = '#FFFFFF';
            }
            ctx.fillRect(50, yPos, canvas.width - 100, 30);
            
            ctx.fillStyle = '#1E293B';
            // Product name (with ellipsis if too long)
            const maxWidth = 300;
            let displayName = itemName;
            if (ctx.measureText(itemName).width > maxWidth) {
              while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 1) {
                displayName = displayName.substring(0, displayName.length - 1);
              }
              displayName = displayName + '...';
            }
            ctx.fillText(displayName, 70, yPos + 20);
            
            // Quantity
            ctx.fillText(quantity.toString(), 420, yPos + 20);
            
            // Price
            ctx.fillText(formatCurrency(price), 490, yPos + 20);
            
            // Total
            ctx.fillStyle = '#1E40AF';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(formatCurrency(itemTotal), 590, yPos + 20);
            ctx.font = '12px Arial';
            
            yPos += 30;
          });
        } else {
          ctx.fillStyle = '#94A3B8';
          ctx.textAlign = 'center';
          ctx.fillText('No items in this order', canvas.width / 2, yPos + 20);
          ctx.textAlign = 'left';
          yPos += 30;
        }
        
        yPos += 10;
        
        // Summary Section
        const summaryY = Math.max(yPos, tableTop + 200);
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(50, summaryY, canvas.width - 100, 120);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(50, summaryY, canvas.width - 100, 120);
        
        // Summary text
        ctx.fillStyle = '#475569';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Subtotal:', canvas.width - 150, summaryY + 30);
        ctx.fillText('Tax (0%):', canvas.width - 150, summaryY + 55);
        ctx.fillText('Shipping:', canvas.width - 150, summaryY + 80);
        
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('TOTAL:', canvas.width - 150, summaryY + 105);
        
        // Summary values
        ctx.fillStyle = '#1E293B';
        ctx.font = '14px Arial';
        ctx.fillText(formatCurrency(subtotal), canvas.width - 70, summaryY + 30);
        ctx.fillText('$0.00', canvas.width - 70, summaryY + 55);
        ctx.fillText('$0.00', canvas.width - 70, summaryY + 80);
        
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 18px Arial';
        const totalAmount = safeNumber(orderData.total);
        ctx.fillText(formatCurrency(totalAmount), canvas.width - 70, summaryY + 105);
        
        yPos = summaryY + 150;
        
        // Payment Method
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Payment Method:', 70, yPos);
        ctx.fillStyle = '#1E293B';
        ctx.font = '14px Arial';
        ctx.fillText(orderData.payment_method || 'Cash on Delivery', 70, yPos + 20);
        
        // Terms & Conditions
        yPos += 50;
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Terms & Conditions:', 70, yPos);
        ctx.fillStyle = '#64748B';
        ctx.font = '12px Arial';
        ctx.fillText('Payment is due within 30 days.', 70, yPos + 20);
        ctx.fillText('Please make checks payable to Your Business Name.', 70, yPos + 35);
        
        // Footer
        yPos = canvas.height - 80;
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(0, yPos, canvas.width, 80);
        
        ctx.fillStyle = '#64748B';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Thank you for your business!', canvas.width / 2, yPos + 25);
        ctx.fillText(companyInfo.website, canvas.width / 2, yPos + 45);
        ctx.fillText(`Generated on ${new Date().toLocaleString()}`, canvas.width / 2, yPos + 65);
        
        // Convert to image
        const dataUrl = canvas.toDataURL('image/png', 1.0); // Highest quality
        setInvoiceImage(dataUrl);
      } catch (error) {
        console.error("Error generating invoice:", error);
        toast.error("Failed to generate invoice");
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
  };

  // Fetch order details and generate invoice immediately
  useEffect(() => {
    const fetchOrderDetailsAndGenerateInvoice = async () => {
      if (!orderId || user?.role !== 'sale') return;

      try {
        setIsLoading(true);
        
        // Fetch order details
        const orderRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/online-orders/${orderId}`,
          { withCredentials: true }
        );

        if (orderRes.data?.success) {
          setOrderDetails(orderRes.data.data);
          // Generate invoice immediately after getting order data
          generateInvoiceImage(orderRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast.error("Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetailsAndGenerateInvoice();
  }, [orderId, user?.role]);

  const downloadInvoiceAsImage = () => {
    if (!invoiceImage) return;
    
    const link = document.createElement('a');
    link.href = invoiceImage;
    const customerName = orderDetails?.customer_info?.name || 'customer';
    const sanitizedName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `invoice_${orderId}_${sanitizedName}_${new Date().toISOString().split('T')[0]}.png`;
    
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
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Inter', 'Arial', sans-serif;
              }
              
              body {
                padding: 40px;
                background: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              
              .invoice-container {
                max-width: 794px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                position: relative;
              }
              
              .invoice-image {
                width: 100%;
                height: auto;
                display: block;
              }
              
              .print-actions {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                gap: 12px;
                z-index: 1000;
              }
              
              .print-btn {
                padding: 12px 24px;
                background: #1e40af;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
              }
              
              .print-btn:hover {
                background: #1e3a8a;
                transform: translateY(-2px);
              }
              
              @media print {
                body {
                  padding: 0;
                  background: white;
                }
                
                .print-actions {
                  display: none;
                }
                
                .invoice-container {
                  box-shadow: none;
                  border-radius: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <img src="${invoiceImage}" alt="Invoice #${orderId}" class="invoice-image">
            </div>
            
            <div class="print-actions">
              <button onclick="window.print()" class="print-btn">🖨️ Print Invoice</button>
              <button onclick="window.close()" class="print-btn" style="background: #64748b;">✕ Close</button>
            </div>
            
            <script>
              window.onload = function() {
                // Auto-print after 1 second
                setTimeout(function() {
                  window.print();
                }, 1000);
              }
              
              // Close window after print
              window.onafterprint = function() {
                setTimeout(function() {
                  window.close();
                }, 500);
              };
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
          text: `Invoice for order #${orderId} - ${companyInfo.name}`
        });
        toast.success("Invoice shared!");
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(`Invoice #${orderId} - ${companyInfo.name}\nDownload link will be available after download.`);
          toast.success("Invoice info copied to clipboard!");
        } catch (clipboardError) {
          toast.info("Share not supported. Download the invoice instead.");
        }
      }
    } catch (error) {
      console.error("Error sharing invoice:", error);
      toast.error("Failed to share invoice");
    }
  };

  const copyInvoiceLink = async () => {
    if (!invoiceImage) return;
    
    try {
      // Create a blob and object URL for sharing
      const response = await fetch(invoiceImage);
      const blob = await response.blob();
      
      // Create a temporary link
      const link = document.createElement('a');
      link.href = invoiceImage;
      const customerName = orderDetails?.customer_info?.name || 'Customer';
      link.download = `invoice_${orderId}_${customerName}.png`;
      
      // Copy download instructions
      const text = `Invoice #${orderId} for ${customerName}\nAmount: ${formatCurrency(orderDetails?.total)}\nDate: ${new Date().toLocaleDateString()}\n\nTo download, right-click and save the image.`;
      await navigator.clipboard.writeText(text);
      toast.success("Invoice information copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy invoice info");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-6 bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="w-full max-w-6xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <Icon icon="icon-park-solid:success" width={40} height={40} style={{ color: "#22c55e" }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Order Successful! 🎉
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Your order has been placed successfully and is being processed.
          </p>
        </div>
      
        {/* Sales Role Specific Content */}
        {user?.role === 'sale' && orderId && (
          <div className="space-y-6">
            {/* Quick Stats Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Order ID</p>
                  <p className="text-lg font-bold text-gray-800">#{orderId}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Amount</p>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(orderDetails?.total)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Date & Time</p>
                  <p className="text-lg font-bold text-gray-800">
                    {orderDetails?.created_at ? formatDate(orderDetails.created_at) : new Date().toLocaleString()}
                  </p>
                </div>
              </div>
              
              {orderDetails?.customer_info && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-bold text-gray-700 mb-3">Customer Information</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-gray-500">Customer Name</p>
                      <p className="font-medium text-gray-800">{orderDetails.customer_info.name || 'N/A'}</p>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium text-gray-800">{orderDetails.customer_info.phone || 'N/A'}</p>
                    </div>
                    {orderDetails.address_info?.address && (
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm text-gray-500">Delivery Address</p>
                        <p className="font-medium text-gray-800">{orderDetails.address_info.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Professional Invoice</h2>
                    <p className="text-blue-100">Your invoice is ready for download</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                      {isGeneratingInvoice ? '🔄 Generating...' : '✅ Ready'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {isGeneratingInvoice ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon icon="material-symbols:receipt" width={24} height={24} style={{ color: "#3b82f6" }} />
                      </div>
                    </div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Creating your invoice...</p>
                    <p className="text-sm text-gray-500 mt-2">This will just take a moment</p>
                  </div>
                ) : invoiceImage ? (
                  <>
                    {/* Invoice Preview */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700">Invoice Preview</h3>
                        <span className="text-sm text-green-600 font-medium">
                          <Icon icon="material-symbols:check-circle" width={16} height={16} className="inline mr-1" />
                          Generated Successfully
                        </span>
                      </div>
                      <div className="border-2 border-gray-300 rounded-xl overflow-hidden shadow-inner bg-gray-50 p-2">
                        <img 
                          src={invoiceImage} 
                          alt="Invoice Preview" 
                          className="w-full h-auto max-h-[400px] object-contain mx-auto rounded-lg"
                        />
                      </div>
                      <p className="text-center text-sm text-gray-500 mt-2">
                        Invoice #{orderId} • {formatCurrency(orderDetails?.total)} • {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Action Buttons Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <button
                        onClick={downloadInvoiceAsImage}
                        className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col items-center justify-center"
                      >
                        <Icon icon="material-symbols:download" width={28} height={28} className="mb-2" />
                        <span className="font-semibold">Download PNG</span>
                        <span className="text-xs opacity-90 mt-1">High Quality</span>
                      </button>
                      
                      <button
                        onClick={printInvoice}
                        className="group bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col items-center justify-center"
                      >
                        <Icon icon="material-symbols:print" width={28} height={28} className="mb-2" />
                        <span className="font-semibold">Print</span>
                        <span className="text-xs opacity-90 mt-1">Professional Layout</span>
                      </button>
                      
                      <button
                        onClick={shareInvoice}
                        className="group bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col items-center justify-center"
                      >
                        <Icon icon="material-symbols:share" width={28} height={28} className="mb-2" />
                        <span className="font-semibold">Share</span>
                        <span className="text-xs opacity-90 mt-1">Send to Customer</span>
                      </button>
                      
                      <button
                        onClick={copyInvoiceLink}
                        className="group bg-gradient-to-r from-gray-600 to-gray-700 text-white p-4 rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col items-center justify-center"
                      >
                        <Icon icon="material-symbols:content-copy" width={28} height={28} className="mb-2" />
                        <span className="font-semibold">Copy Info</span>
                        <span className="text-xs opacity-90 mt-1">Text & Details</span>
                      </button>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <h4 className="font-bold text-gray-700 mb-4">Quick Actions</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => window.open(invoiceImage, '_blank')}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                        >
                          <Icon icon="material-symbols:open-in-new" width={18} height={18} />
                          Open Full Screen
                        </button>
                        <button
                          onClick={() => generateInvoiceImage(orderDetails)}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-2"
                        >
                          <Icon icon="material-symbols:refresh" width={18} height={18} />
                          Regenerate
                        </button>
                        <button
                          onClick={() => {
                            const emailSubject = `Invoice #${orderId} - ${companyInfo.name}`;
                            const emailBody = `Dear Customer,\n\nPlease find attached your invoice #${orderId}.\n\nTotal Amount: ${formatCurrency(orderDetails?.total)}\n\nThank you for your business!\n\n${companyInfo.name}`;
                            window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                          }}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
                        >
                          <Icon icon="material-symbols:mail" width={18} height={18} />
                          Email Invoice
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Order Items Summary */}
            {orderDetails?.items && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Icon icon="material-symbols:shopping-cart" width={24} height={24} className="mr-2" />
                  Order Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 rounded-tl-lg">Product</th>
                        <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Quantity</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Price</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700 rounded-tr-lg">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.items.map((item: any, index: number) => {
                        const quantity = safeNumber(item.qty);
                        const price = safeNumber(item.price_at_order);
                        const itemTotal = quantity * price;
                        
                        return (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-medium text-gray-800">{item.product_name || `Item ${index + 1}`}</p>
                                {item.image_url && (
                                  <p className="text-xs text-gray-500 mt-1">SKU: {item.product_id}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-medium">
                                {quantity}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-gray-700">
                              {formatCurrency(price)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-gray-800">
                              {formatCurrency(itemTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-4 px-4 text-right font-bold text-gray-700">
                          Total Amount:
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(orderDetails.total)}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/"
            className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex items-center gap-2"
          >
            <Icon icon="material-symbols:home" width={20} height={20} />
            Back to Home
          </a>
          
          {user?.role === 'sale' && (
            <a
              href="/"
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex items-center gap-2"
            >
              <Icon icon="material-symbols:add-shopping-cart" width={20} height={20} />
              New Order
            </a>
          )}
          
          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex items-center gap-2"
            >
              <Icon icon="material-symbols:telegram" width={20} height={20} />
              Track on Telegram
            </a>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at <span className="text-blue-600">{companyInfo.phone}</span> or email{' '}
            <a href={`mailto:${companyInfo.email}`} className="text-blue-600 hover:underline">
              {companyInfo.email}
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Invoice generated on {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default page;