"use client";
import React, { useEffect, useState, useMemo } from "react";
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
    price: string;
    image_url?: string;
    category?: string;
  };
}

interface ProductsProps {
  selectedCategory: string;
  searchQuery: string;
}

const Products: React.FC<ProductsProps> = ({ selectedCategory, searchQuery }) => {
  const [allProducts, setAllProducts] = useState<ProductData[]>([]); // Store ALL products
  const { setLoading } = useLoading();

  // Fetch ALL products only once on component mount
  useEffect(() => {
    async function fetchAllProducts() {
      setLoading(true);
      try {
        const res = await api.get<{ status: string; data: ProductData[] }>("/product/all");
        setAllProducts(res.data.data);
        console.log("Fetched all products:", res.data.data.length);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchAllProducts();
  }, [setLoading]); // Only runs once on mount

  // Use useMemo to filter products based on selectedCategory and searchQuery
  const filteredProducts = useMemo(() => {
    console.log("Filtering with category:", selectedCategory, "search:", searchQuery);
    
    let result = [...allProducts]; // Start with all products
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== "All") {
      result = result.filter((item) => {
        const productCategory = item.product.category || "";
        return productCategory.toLowerCase() === selectedCategory.toLowerCase();
      });
      console.log("After category filter:", result.length);
    }
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter((item) => {
        const productName = item.product.name.toLowerCase();
        const productCategory = item.product.category?.toLowerCase() || "";
        return productName.includes(searchQuery.toLowerCase()) || 
               productCategory.includes(searchQuery.toLowerCase());
      });
      console.log("After search filter:", result.length);
    }
    
    return result;
  }, [allProducts, selectedCategory, searchQuery]);

  // Debug: Log filtered products
  useEffect(() => {
    console.log("Filtered products updated:", filteredProducts.length);
  }, [filteredProducts]);

  if (allProducts.length === 0) {
    return (
      <div className="mt-4 text-center py-8">
        <p className="text-gray-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Debug info - remove in production */}
      <div className="mb-2 text-sm text-gray-500">
        Showing {filteredProducts.length} of {allProducts.length} products
        {selectedCategory !== "All" && ` in "${selectedCategory}"`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
      
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No products found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Try selecting a different category or adjusting your search
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((item) => (
            <div key={item.product.id} className="relative">
              <Product
                id={item.product.id}
                title={item.product.name}
                price={Number(item.product.price)}
                image={item.product.image_url && item.product.image_url.trim() !== "" ? item.product.image_url : "/img/default.png"}
              />
              {/* Show category badge if available */}
              {item.product.category && (
                <span className="absolute top-2 left-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {item.product.category}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;