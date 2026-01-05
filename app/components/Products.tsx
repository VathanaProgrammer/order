"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Product from "./cards/ProductCard";
import api from "@/api/api";
import { toast } from "react-toastify";
import { useLoading } from "@/context/LoadingContext";

export interface ProductData {
  id: number;
  is_active: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    price: string | number | null;
    image_url?: string;
  };
}

interface ProductsProps {
  selectedCategory: string;
  searchQuery: string;
}

const Products: React.FC<ProductsProps> = ({ selectedCategory, searchQuery }) => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { setLoading } = useLoading();

  // Function to cancel ongoing requests
  const cancelRequest = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Fetch products with API filtering
  const fetchProducts = useCallback(async (category: string, search: string) => {
    // Cancel any ongoing request
    cancelRequest();
    
    setIsLoading(true);
    setHasError(false);
    setIsEmpty(false);
    setLoading(true);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Set timeout for the request
    timeoutRef.current = setTimeout(async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        if (category && category !== "All") {
          params.append('category', category);
        }
        
        if (search.trim()) {
          params.append('search', search);
        }

        // Build the URL
        const queryString = params.toString();
        const url = `/product/all${queryString ? `?${queryString}` : ''}`;
        
        console.log("Fetching from:", url);
        
        const res = await api.get<{ status: string; data: ProductData[] }>(url, {
          signal: abortControllerRef.current?.signal,
        });
        
        if (res.data.status === 'success') {
          setProducts(res.data.data);
          setIsEmpty(res.data.data.length === 0);
          console.log(`Success: ${res.data.data.length} products`);
        } else {
          throw new Error("API returned error status");
        }
      } catch (err: any) {
        // Don't show error if request was aborted
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          console.log("Request was cancelled");
          return;
        }
        
        console.error("Fetch error:", err);
        setHasError(true);
        
        // Don't show toast for network errors during rapid filter changes
        if (!err.message?.includes('timeout') && !err.message?.includes('network')) {
          toast.error("Failed to load products");
        }
      } finally {
        setIsLoading(false);
        setLoading(false);
        abortControllerRef.current = null;
      }
    }, 300); // Small debounce delay

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [cancelRequest, setLoading]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(selectedCategory, searchQuery);
    
    // Cleanup on unmount
    return () => {
      cancelRequest();
    };
  }, [selectedCategory, searchQuery, fetchProducts, cancelRequest]);

  // Show loading skeleton only for initial load or when we have no products
  if (isLoading && products.length === 0) {
    return (
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg"></div>
              <div className="mt-2 h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="mt-1 h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError && products.length === 0) {
    return (
      <div className="mt-4 text-center py-12">
        <div className="text-red-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700">Failed to load products</h3>
        <p className="text-gray-500 mt-1 mb-4">Please try again</p>
        <button
          onClick={() => fetchProducts(selectedCategory, searchQuery)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show empty state
  if (isEmpty && !isLoading) {
    return (
      <div className="mt-4 text-center py-12">
        <div className="text-gray-300 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700">No products found</h3>
        <p className="text-gray-500 mt-1">
          {selectedCategory !== "All" 
            ? `No products in "${selectedCategory}" category`
            : searchQuery 
              ? `No products matching "${searchQuery}"`
              : "No products available"
          }
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Loading indicator when filtering (with existing products) */}
      {isLoading && products.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-100 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-yellow-700">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Updating products...</span>
          </div>
        </div>
      )}

      {/* Filter summary */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800">{products.length}</span>
            <span className="text-gray-600">products</span>
            
            {selectedCategory !== "All" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                {selectedCategory}
              </span>
            )}
            
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                {searchQuery}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {selectedCategory === "All" && !searchQuery 
              ? "Showing all products" 
              : "Filtered results"
            }
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-4">
        {products.map((item) => (
          <Product
            key={item.product.id}
            id={item.product.id}
            title={item.product.name}
            price={item.product.price ? Number(item.product.price) : 0}
            image={item.product.image_url || "/img/default.png"}
          />
        ))}
      </div>

      {/* Load more indicator at bottom */}
      {isLoading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;