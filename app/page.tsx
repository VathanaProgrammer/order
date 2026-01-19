"use client";

import SearchBar from "@/components/SearchBar";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import RewardSection from "./components/RewardSection";
import { useState, useEffect } from "react";
import api from "@/api/api";

interface ProductData {
  id: number;
  is_active: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    price: string | number | null;
    image_url?: string;
    category_id?: number; // Check if this exists
  };
  // Check if your API returns category_id here
  category_id?: number;
}

interface CategoryData {
  id: number;
  name: string;
}

export default function ProductPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data once
  useEffect(() => {
    async function fetchAllData() {
      try {
        setIsLoading(true);
        
        // Fetch products and categories in parallel
        const [productsRes, categoriesRes] = await Promise.all([
          api.get<{ status: string; data: ProductData[] }>("/product/all"),
          api.get<{ status: string; data: CategoryData[] }>("/category/all")
        ]);
        
        if (productsRes.data.status === 'success' && categoriesRes.data.status === 'success') {
          setAllProducts(productsRes.data.data);
          setCategories(categoriesRes.data.data);
          
          // Create a mapping of category ID to category name
          const map: Record<number, string> = {};
          categoriesRes.data.data.forEach(cat => {
            map[cat.id] = cat.name;
          });
          setCategoryMap(map);
          
          console.log(`Loaded ${productsRes.data.data.length} products and ${categoriesRes.data.data.length} categories`);
        } else {
          throw new Error("Failed to load data");
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Filter products based on category and search
  const filteredProducts = allProducts.filter(product => {
    // Get category ID from product (adjust based on your API structure)
    const categoryId = product.product.category_id || product.category_id;
    
    // Check category match
    let matchesCategory = true;
    if (selectedCategory !== "All" && selectedCategory !== "ទាំងអស់") {
      // Find the category by name to get its ID
      const selectedCat = categories.find(cat => cat.name === selectedCategory);
      if (selectedCat) {
        matchesCategory = categoryId === selectedCat.id;
      } else {
        matchesCategory = false;
      }
    }
    
    // Check search match
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
            {/* Pass data to Products component */}
            <Products 
              allProducts={allProducts}
              filteredProducts={filteredProducts}
              selectedCategory={selectedCategory} 
              searchQuery={searchQuery}
              products={filteredProducts}
              totalProducts={allProducts.length}
              categoryMap={categoryMap}
            />
          </div>
        )}
      </div>
    </div>
  );
}