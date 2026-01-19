"use client";
import React from "react";
import Product from "./cards/ProductCard";
import { useLanguage } from "@/context/LanguageContext";

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
  allProducts: ProductData[];
  filteredProducts: ProductData[];
}

const Products: React.FC<ProductsProps> = ({ 
  selectedCategory, 
  searchQuery,
  allProducts,
  filteredProducts 
}) => {
  const { t } = useLanguage();
  const isEmpty = filteredProducts.length === 0;
  const hasSearch = searchQuery.trim().length > 0;

  // Show empty state
  if (isEmpty) {
    return (
      <div className="mt-4 text-center py-12">
        <div className="text-gray-300 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700">No products found</h3>
        <p className="text-gray-500 mt-1">
          {selectedCategory !== "ទាំងអស់" && selectedCategory !== "All" 
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
    <div className="mt-2 p-2">
      {/* Stats bar */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-4">
          <span className="text-sm text-blue-800">
            Showing {filteredProducts.length} of {allProducts.length} products
          </span>
          
          {selectedCategory !== "All" && selectedCategory !== "ទាំងអស់" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {selectedCategory}
            </span>
          )}
          
          {hasSearch && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              "{searchQuery}"
            </span>
          )}
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredProducts.map((item) => (
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