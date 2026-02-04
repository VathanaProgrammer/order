"use client";

import SearchBar from "@/components/SearchBar";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import RewardSection from "./components/RewardSection";
import { useState, useEffect, useCallback } from "react";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";

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

// Cache keys
const PRODUCTS_CACHE_KEY = 'cached_products';
const CATEGORIES_CACHE_KEY = 'cached_categories';
const CACHE_TIMESTAMP_KEY = 'products_cache_timestamp';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes cache expiry

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

  // Save products to localStorage
  const saveProductsToCache = (products: ProductData[]) => {
    try {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Products saved to cache:', products.length);
    } catch (error) {
      console.error('Failed to save products to cache:', error);
    }
  };

  // Load products from localStorage
  const loadProductsFromCache = (): ProductData[] | null => {
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        if (timeDiff < CACHE_EXPIRY_MS) {
          console.log('Loading products from cache');
          return JSON.parse(cached);
        } else {
          console.log('Cache expired, clearing...');
          clearCache();
        }
      }
    } catch (error) {
      console.error('Failed to load products from cache:', error);
    }
    return null;
  };

  // Save categories to localStorage
  const saveCategoriesToCache = (categoriesData: CategoryData[]) => {
    try {
      localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categoriesData));
    } catch (error) {
      console.error('Failed to save categories to cache:', error);
    }
  };

  // Load categories from localStorage
  const loadCategoriesFromCache = (): CategoryData[] | null => {
    try {
      const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load categories from cache:', error);
    }
    return null;
  };

  // Clear cache
  const clearCache = () => {
    try {
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      localStorage.removeItem(CATEGORIES_CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      setCategoryCache({});
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  // Fetch categories on mount with cache support
  useEffect(() => {
    async function fetchCategories() {
      try {
        // Try to load from cache first
        const cachedCategories = loadCategoriesFromCache();
        if (cachedCategories && cachedCategories.length > 0) {
          setCategories(cachedCategories);
          console.log('Loaded categories from cache:', cachedCategories.length);
        }

        // Always fetch fresh data
        const res = await api.get("/category/all");
        const categoriesData = Array.isArray(res.data)
          ? res.data
          : (res.data?.data || res.data || []);
        
        setCategories(categoriesData);
        saveCategoriesToCache(categoriesData);
        console.log('Fetched fresh categories:', categoriesData.length);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        // If fetch fails and no cache, set empty array
        if (!categories.length) {
          setCategories([]);
        }
      }
    }
    fetchCategories();
  }, []);

  // Fetch products based on selected category with cache support
  const fetchProducts = useCallback(async (category: string, search: string, isInitialLoad: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let products: ProductData[] = [];
      let shouldUseCache = false;
      
      // On initial load, try to use cache if available
      if (isInitialLoad && !search) {
        const cachedProducts = loadProductsFromCache();
        if (cachedProducts && cachedProducts.length > 0) {
          console.log('Using cached products initially:', cachedProducts.length);
          setAllProducts(cachedProducts);
          setIsLoading(false);
          shouldUseCache = true;
        }
      }
      
      // Check category cache if not searching
      if (categoryCache[category] && !search && !shouldUseCache) {
        console.log(`Using category cache for "${category}"`);
        setAllProducts(categoryCache[category]);
        setIsLoading(false);
        return;
      }
      
      // If using cache and no search, we can skip API call for now
      if (shouldUseCache && !search) {
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
      
      console.log(`Fetching products from API: ${url}`);
      
      const res = await api.get(url);
      const productsData = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data || []);
      
      console.log(`Fetched ${productsData.length} products for category: ${category}`);
      
      setAllProducts(productsData);
      
      // Save to localStorage if fetching all products without search
      if ((category === "All" || category === "ទាំងអស់") && !search.trim()) {
        saveProductsToCache(productsData);
      }
      
      // Cache the results if not searching
      if (!search.trim() && category !== "All" && category !== "ទាំងអស់") {
        setCategoryCache(prev => ({
          ...prev,
          [category]: productsData
        }));
      }
      
    } catch (err: any) {
      console.error("Error fetching products:", err);
      
      // Try to use cache as fallback
      if (isInitialLoad || (!search && category === "All")) {
        const cachedProducts = loadProductsFromCache();
        if (cachedProducts && cachedProducts.length > 0) {
          console.log('Using cached products as fallback:', cachedProducts.length);
          setAllProducts(cachedProducts);
          setError(`Network error. Showing cached products (${cachedProducts.length} items)`);
          setIsLoading(false);
          return;
        }
      }
      
      setError(`Failed to load products: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [categoryCache]);

  // Initial load: fetch all products on mount
  useEffect(() => {
    if (categories.length > 0) {
      // Pass true for initial load to use cache if available
      fetchProducts(t.all, "", true);
    }
  }, [categories.length, t.all]);

  // Fetch products when category or search changes
  useEffect(() => {
    if (categories.length > 0 && selectedCategory !== t.all) {
      fetchProducts(selectedCategory, searchQuery);
    }
  }, [selectedCategory, searchQuery, categories.length, fetchProducts, t.all]);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    console.log(`Category selected: ${category}`);
    setSelectedCategory(category);
    // Clear search when changing categories
    setSearchQuery("");
  };

  // Handle manual refresh/retry
  const handleRefresh = () => {
    clearCache();
    fetchProducts(selectedCategory, searchQuery);
  };

  console.log(`Current: Category="${selectedCategory}", Search="${searchQuery}", Products=${allProducts.length}`);

  return (
    <div className="flex flex-col flex-1 hide-scrollbar">
      {/* <RewardSection /> */}

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Loading Products...</h2>
              <button
                onClick={clearCache}
                className="text-sm text-gray-500 hover:text-gray-700"
                title="Clear cache"
              >
                Clear Cache
              </button>
            </div>
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
              <div className="flex gap-2 justify-center mt-4">
                <button
                  onClick={() => fetchProducts(selectedCategory, searchQuery)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Refresh Cache
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex justify-between items-center p-2">
              <span className="text-sm text-gray-500">
                Showing {allProducts.length} products
                {selectedCategory !== "All" && selectedCategory !== "ទាំងអស់" && ` in "${selectedCategory}"`}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
              <button
                onClick={handleRefresh}
                className="text-sm text-blue-500 hover:text-blue-700"
                title="Refresh and clear cache"
              >
                Refresh
              </button>
            </div>
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