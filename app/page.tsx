"use client";

import SearchBar from "@/components/SearchBar";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import RewardSection from "./components/RewardSection";
import { useState, useEffect } from "react";
import api from "@/api/api";

interface AllProductsData {
  id: number;
  is_active: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    price: string | number | null;
    image_url?: string;
    category?: string;
  };
  // Add category info if available
  category?: string;
  category_id?: number;
}

export default function ProductPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allProducts, setAllProducts] = useState<AllProductsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all products once on component mount
  useEffect(() => {
    async function fetchAllProducts() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all products (no category filter)
        const res = await api.get<{ status: string; data: AllProductsData[] }>("/product/all");
        
        if (res.data.status === 'success') {
          setAllProducts(res.data.data);
          console.log(`Loaded ${res.data.data.length} total products`);
        } else {
          throw new Error("Failed to load products");
        }
      } catch (err: any) {
        console.error("Error fetching all products:", err);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllProducts();
  }, []); // Empty dependency array = run once on mount

  // Filter products by selected category and search
  const filteredProducts = allProducts.filter(product => {
    // Filter by category if needed
    // Note: This requires your API to return category info
    // If not, you'll need to fetch category mapping separately
    const matchesCategory = selectedCategory === "All" || 
                           selectedCategory === "ទាំងអស់" ||
                           product.product.category === selectedCategory;
    
    // Filter by search
    const matchesSearch = !searchQuery || 
                         product.product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col flex-1 hide-scrollbar">
      <RewardSection />
      
      <div className="sticky top-0 z-20 bg-white">
        <div className="pb-2">
          <SearchBar onSearch={(value) => setSearchQuery(value)} />
        </div>
      </div>

      <div className="flex flex-1 overflow-y-auto">
        <Categories 
          selectedCategory={selectedCategory} 
          onSelect={setSelectedCategory} 
        />
        
        {/* Show loading state */}
        {isLoading ? (
          <div className="flex-1 p-4">
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
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-red-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700">{error}</h3>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            {/* Pass filtered products to Products component */}
            <Products 
              selectedCategory={selectedCategory} 
              searchQuery={searchQuery}
              allProducts={allProducts}
              filteredProducts={filteredProducts}
            />
          </div>
        )}
      </div>
    </div>
  );
}