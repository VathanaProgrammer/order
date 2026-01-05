"use client";
import React, { useEffect, useState, useCallback } from "react";
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
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const { setLoading } = useLoading();

  // Fetch products with API filtering
  const fetchProducts = useCallback(async (category: string, search: string) => {
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }

    setLoading(true);
    
    // Set a timeout to prevent rapid API calls
    const timeout = setTimeout(async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add category filter if not "All"
        if (category && category !== "All") {
          params.append('category', category);
        }
        
        // Add search query if exists
        if (search.trim()) {
          params.append('search', search);
        }

        // Build the URL with query parameters
        const queryString = params.toString();
        const url = `/product/all${queryString ? `?${queryString}` : ''}`;
        
        console.log("Fetching products from:", url); // Debug log
        
        const res = await api.get<{ status: string; data: ProductData[] }>(url);
        
        if (res.data.status === 'success') {
          setProducts(res.data.data);
          console.log(`Fetched ${res.data.data.length} products`); // Debug log
        } else {
          throw new Error("API returned error status");
        }
      } catch (err: any) {
        console.error("Error fetching products:", err);
        
        // Show user-friendly error message
        if (err.response?.status === 404) {
          toast.error("Products endpoint not found. Please check the API URL.");
        } else if (err.response?.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error("Failed to load products. Please check your connection.");
        }
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms delay to prevent rapid API calls

    setLoadingTimeout(timeout);
  }, [setLoading, loadingTimeout]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(selectedCategory, searchQuery);
    
    // Cleanup function
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [selectedCategory, searchQuery, fetchProducts]);

  // Show loading skeleton
  if (products.length === 0) {
    return (
      <div className="mt-4">
        {/* Filter info skeleton */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        </div>
        
        {/* Products skeleton */}
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

  return (
    <div className="mt-4">
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
    </div>
  );
};

export default Products;