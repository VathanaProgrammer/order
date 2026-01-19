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
    category_id?: number;
    category?: {  // Check if category is an object
      id: number;
      name: string;
    };
  };
  category_id?: number;
  category?: {  // Check if category is an object at top level
    id: number;
    name: string;
  };
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data once
  useEffect(() => {
    async function fetchAllData() {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching data...");
        
        // Fetch products and categories in parallel
        const [productsRes, categoriesRes] = await Promise.all([
          api.get("/product/all"),
          api.get("/category/all")
        ]);
        
        console.log("RAW Products response:", productsRes.data);
        console.log("RAW Categories response:", categoriesRes.data);
        
        // Handle different response formats
        const productsData = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : (productsRes.data?.data || productsRes.data || []);
        
        const categoriesData = Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : (categoriesRes.data?.data || categoriesRes.data || []);
        
        console.log(`Parsed: ${productsData.length} products, ${categoriesData.length} categories`);
        console.log("First product:", productsData[0]);
        console.log("Categories:", categoriesData);
        
        setAllProducts(productsData);
        setCategories(categoriesData);
        
        if (productsData.length === 0) {
          setError("No products available");
        }
        
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Filter products based on category and search
  const filteredProducts = allProducts.filter(product => {
    // Try to get category name from product
    let productCategoryName = "";
    
    // Check all possible locations for category info
    if (product.category?.name) {
      // Case 1: category is an object with name
      productCategoryName = product.category.name;
    } else if (product.product.category?.name) {
      // Case 2: category is nested in product object
      productCategoryName = product.product.category.name;
    } else if (product.category_id || product.product.category_id) {
      // Case 3: We have category_id, need to find name from categories list
      const categoryId = product.category_id || product.product.category_id;
      const foundCategory = categories.find(cat => cat.id === categoryId);
      if (foundCategory) {
        productCategoryName = foundCategory.name;
      }
    }
    
    console.log(`Product: ${product.product.name}, Category: ${productCategoryName || 'No category found'}`);
    
    // Check category match
    let matchesCategory = true;
    if (selectedCategory !== "All" && selectedCategory !== "ទាំងអស់") {
      if (productCategoryName) {
        // Compare category names (case-insensitive, trim whitespace)
        matchesCategory = productCategoryName.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
      } else {
        // No category info found for this product
        matchesCategory = false;
      }
      console.log(`Category match for "${product.product.name}": ${matchesCategory} (${productCategoryName} vs ${selectedCategory})`);
    }
    
    // Check search match
    const matchesSearch = !searchQuery || 
                         product.product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  console.log(`=== FILTER RESULTS ===`);
  console.log(`Total products: ${allProducts.length}`);
  console.log(`Filtered products: ${filteredProducts.length}`);
  console.log(`Selected category: ${selectedCategory}`);
  console.log(`Search query: ${searchQuery}`);
  console.log(`Categories available: ${categories.map(c => c.name).join(', ')}`);

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
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading products...</p>
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
            {/* Temporary: Show all products for debugging */}
            {selectedCategory !== "All" && selectedCategory !== "ទាំងអស់" && filteredProducts.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 mb-4">
                <h3 className="font-medium text-yellow-800">Debug Info</h3>
                <p className="text-sm text-yellow-700">
                  Showing all {allProducts.length} products because no category info found.
                  Check if products have category data.
                </p>
                <button 
                  onClick={() => {
                    // Temporarily show all products
                    setSelectedCategory("All");
                  }}
                  className="mt-2 px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                >
                  Show All Products
                </button>
              </div>
            )}
            
            {/* Pass data to Products component - use filtered or all if no category */}
            <Products 
              selectedCategory={selectedCategory} 
              searchQuery={searchQuery}
              allProducts={allProducts}
              filteredProducts={filteredProducts.length > 0 ? filteredProducts : allProducts}
            />
          </div>
        )}
      </div>
    </div>
  );
}