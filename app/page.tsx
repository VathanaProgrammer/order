"use client";

import SearchBar from "@/components/SearchBar";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import RewardSection from "./components/RewardSection";
import { useState, useEffect, useCallback } from "react";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";
import DebugInfo from "./components/DebugInfo";

interface ProductData {
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

interface CategoryData {
  id: number;
  name: string;
}

export default function ProductPage() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>(t.all);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for category-specific products
  const [categoryCache, setCategoryCache] = useState<Record<string, ProductData[]>>({});

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get("/category/all");
        const categoriesData = Array.isArray(res.data)
          ? res.data
          : (res.data?.data || res.data || []);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products based on selected category
  const fetchProducts = useCallback(async (category: string, search: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let products: ProductData[] = [];
      
      // Check cache first
      if (categoryCache[category] && !search) {
        console.log(`Using cache for ${category}`);
        setAllProducts(categoryCache[category]);
        setIsLoading(false);
        return;
      }
      
      // Build URL based on category
      let url = "/product/all";
      const params = new URLSearchParams();
      
      if (category !== "All" && category !== "ទាំងអស់") {
        params.append('category', category);
      }
      
      if (search.trim()) {
        params.append('search', search);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log(`Fetching from: ${url}`);
      
      const res = await api.get(url);
      const productsData = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data || []);
      
      console.log(`Fetched ${productsData.length} products for category: ${category}`);
      
      setAllProducts(productsData);
      
      // Cache the results if not searching
      if (!search.trim() && category !== "All" && category !== "ទាំងអស់") {
        setCategoryCache(prev => ({
          ...prev,
          [category]: productsData
        }));
      }
      
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(`Failed to load products: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [categoryCache]);

  // Fetch products when category or search changes
  useEffect(() => {
    if (categories.length > 0) {
      fetchProducts(selectedCategory, searchQuery);
    }
  }, [selectedCategory, searchQuery, categories.length, fetchProducts]);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    console.log(`Category selected: ${category}`);
    setSelectedCategory(category);
    // Search will be cleared when changing categories
    setSearchQuery("");
  };

  console.log(`Current: Category="${selectedCategory}", Search="${searchQuery}", Products=${allProducts.length}`);

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
          onSelect={handleCategorySelect} 
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
                onClick={() => fetchProducts(selectedCategory, searchQuery)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <Products 
              selectedCategory={selectedCategory} 
              searchQuery={searchQuery}
              allProducts={allProducts}
              filteredProducts={allProducts} // Since API already filtered
            />
          </div>
        )}
      </div>
    </div>
  );
}