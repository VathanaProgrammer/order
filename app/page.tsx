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
  };
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

  // Debug: Log to see what's happening
  console.log("Current state:", {
    allProductsCount: allProducts.length,
    categoriesCount: categories.length,
    selectedCategory,
    isLoading,
    error
  });

  // Fetch all data once
  useEffect(() => {
    async function fetchAllData() {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Starting data fetch...");
        
        // Fetch products and categories in parallel
        const [productsRes, categoriesRes] = await Promise.all([
          api.get("/product/all"),
          api.get("/category/all")
        ]);
        
        console.log("Products API response:", productsRes.data);
        console.log("Categories API response:", categoriesRes.data);
        
        // Check if responses have data arrays directly
        const productsData = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : (productsRes.data.data || []);
        
        const categoriesData = Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : (categoriesRes.data.data || []);
        
        console.log(`Parsed: ${productsData.length} products, ${categoriesData.length} categories`);
        
        if (productsData.length > 0) {
          setAllProducts(productsData);
        }
        
        if (categoriesData.length > 0) {
          setCategories(categoriesData);
          
          // Create a mapping of category ID to category name
          const map: Record<number, string> = {};
          categoriesData.forEach((cat: CategoryData) => {
            map[cat.id] = cat.name;
          });
          setCategoryMap(map);
          console.log("Category map:", map);
        }
        
        // Check if we got any data
        if (productsData.length === 0 && categoriesData.length === 0) {
          setError("No data available");
        }
        
      } catch (err: any) {
        console.error("Error fetching data:", err);
        console.error("Error details:", err.response?.data || err.message);
        setError(`Failed to load: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Debug: Check first product structure
  useEffect(() => {
    if (allProducts.length > 0) {
      console.log("First product structure:", allProducts[0]);
      console.log("Product keys:", Object.keys(allProducts[0]));
      console.log("Product.product keys:", Object.keys(allProducts[0].product));
      
      // Check for category info in different possible locations
      const firstProduct = allProducts[0];
      console.log("Possible category locations:", {
        direct: firstProduct.category_id,
        inProduct: firstProduct.product.category_id,
        productObject: firstProduct.product
      });
    }
  }, [allProducts]);

  // Filter products based on category and search
  const filteredProducts = allProducts.filter(product => {
    // Debug each product
    if (selectedCategory !== "All" && selectedCategory !== "ទាំងអស់") {
      console.log(`Filtering for category: ${selectedCategory}`);
      console.log("Current product:", product);
    }
    
    // Get category ID from product - check multiple possible locations
    const categoryId = product.category_id || 
                      product.product.category_id || 
                      (product.product as any).category?.id; // If category is an object
    
    // Get category name if available
    const categoryName = categoryId ? categoryMap[categoryId] : undefined;
    
    console.log(`Product ${product.product.name}: categoryId=${categoryId}, categoryName=${categoryName}`);
    
    // Check category match
    let matchesCategory = true;
    if (selectedCategory !== "All" && selectedCategory !== "ទាំងអស់") {
      // Option 1: Compare by category name
      if (categoryName) {
        matchesCategory = categoryName === selectedCategory;
      } 
      // Option 2: Find category ID from selected name and compare
      else {
        const selectedCat = categories.find(cat => cat.name === selectedCategory);
        if (selectedCat && categoryId) {
          matchesCategory = categoryId === selectedCat.id;
        } else {
          matchesCategory = false;
        }
      }
      console.log(`Category match for ${product.product.name}: ${matchesCategory}`);
    }
    
    // Check search match
    const matchesSearch = !searchQuery || 
                         product.product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  console.log(`Filtered products: ${filteredProducts.length} of ${allProducts.length}`);

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
            {/* Debug info - remove in production */}
            <div className="p-2 bg-yellow-50 border border-yellow-200 text-xs">
              <p>Debug: {allProducts.length} total products, {filteredProducts.length} filtered</p>
              <p>Selected: {selectedCategory}, Search: {searchQuery || '(none)'}</p>
              <p>Categories loaded: {categories.map(c => c.name).join(', ')}</p>
            </div>
            
            {/* Pass data to Products component */}
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