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
  const orderId = params.get("order_id"); // Get order ID from URL
  const { user } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch order details and invoice when component mounts
  useEffect(() => {
    const fetchOrderAndInvoice = async () => {
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
          
          // Generate invoice if not already generated
          if (!orderRes.data.data.invoice_url) {
            await generateInvoice(orderId);
          } else {
            setInvoiceUrl(orderRes.data.data.invoice_url);
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast.error("Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndInvoice();
  }, [orderId, user?.role]);

  const generateInvoice = async (orderId: string) => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/online-orders/${orderId}/generate-invoice`,
        {},
        { withCredentials: true }
      );

      if (res.data?.success) {
        setInvoiceUrl(res.data.invoice_url);
        toast.success("Invoice generated successfully");
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  const downloadInvoice = async () => {
    if (!invoiceUrl) return;

    try {
      // Fetch the invoice PDF
      const response = await fetch(invoiceUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create filename: Invoice_{OrderID}_{CustomerName}_{Date}.pdf
      const customerName = orderDetails?.customer_name || orderDetails?.customer_info?.name || 'Customer';
      const date = new Date().toISOString().split('T')[0];
      a.download = `Invoice_${orderId}_${customerName.replace(/\s+/g, '_')}_${date}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  const printInvoice = () => {
    if (!invoiceUrl) return;
    window.open(invoiceUrl, '_blank');
  };

  return (
    <div className="h-full w-full flex flex-col justify-center items-center p-4">
      <div className="mb-4">
        <Icon
          icon="icon-park-solid:success"
          width={48}
          height={48}
          style={{ color: "#22ea00" }}
        />
      </div>
      <h3 className="text-2xl font-bold mb-2 text-center">
        Your order is made!
      </h3>
      
      {/* Sales Role Specific Content */}
      {user?.role === 'sale' && orderId && (
        <div className="w-full max-w-md mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-lg mb-2 text-blue-800">Sales Order Details</h4>
            <div className="space-y-2">
              <p><span className="font-semibold">Order ID:</span> #{orderId}</p>
              {orderDetails?.customer_info && (
                <>
                  <p><span className="font-semibold">Customer:</span> {orderDetails.customer_info.name}</p>
                  <p><span className="font-semibold">Phone:</span> {orderDetails.customer_info.phone}</p>
                  <p><span className="font-semibold">Amount:</span> ${orderDetails.total?.toFixed(2) || '0.00'}</p>
                </>
              )}
              {orderDetails?.address_info && (
                <p><span className="font-semibold">Address:</span> {orderDetails.address_info.address}</p>
              )}
            </div>
          </div>

          {/* Invoice Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 className="font-bold text-lg mb-3 text-gray-800">Invoice</h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading invoice...</span>
              </div>
            ) : invoiceUrl ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-600 mb-2">
                  Invoice is ready. You can download or print it.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={downloadInvoice}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:download" width={20} height={20} />
                    Download Invoice
                  </button>
                  <button
                    onClick={printInvoice}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Icon icon="material-symbols:print" width={20} height={20} />
                    Print Invoice
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-600 mb-2">
                  Generate invoice for this order.
                </p>
                <button
                  onClick={() => generateInvoice(orderId!)}
                  disabled={isLoading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Icon icon="material-symbols:receipt" width={20} height={20} />
                      Generate Invoice
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-sm font-medium text-gray-600 max-w-sm mb-6">
        {user?.role === 'sale' 
          ? "Order placed successfully. Invoice is ready for download."
          : "Thank you for your purchase! Your online order has been successfully placed, and we will process it as quickly as possible to get it delivered to you."
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

      {/* Order Summary for Sales */}
      {user?.role === 'sale' && orderDetails?.items && (
        <div className="mt-6 w-full max-w-md border-t border-gray-200 pt-4">
          <h4 className="font-bold text-lg mb-3">Order Summary</h4>
          <div className="space-y-2">
            {orderDetails.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <div>
                  <p className="font-medium">{item.product_name || `Item ${index + 1}`}</p>
                  <p className="text-sm text-gray-600">
                    {item.qty} × ${item.price_at_order?.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold">
                  ${(item.qty * item.price_at_order)?.toFixed(2)}
                </p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <p className="font-bold">Total</p>
              <p className="font-bold text-lg">${orderDetails.total?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default page;