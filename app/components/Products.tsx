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

// Define CartItem type that matches what ProductPage uses
interface CartItem {
  id: number;
  title: string;
  price: number;
  image?: string;
  qty: number;
}

interface ProductsProps {
  selectedCategory: string;
  searchQuery: string;
  allProducts: ProductData[];
  filteredProducts: ProductData[];
  cartItems?: CartItem[]; // Add this
  onAddToCart?: (product: ProductData) => void; // Add this
  onRemoveFromCart?: (productId: number) => void; // Add this
  onUpdateCartQuantity?: (productId: number, quantity: number) => void; // Add this
}

const Products: React.FC<ProductsProps> = ({ 
  selectedCategory, 
  searchQuery,
  allProducts,
  filteredProducts,
  cartItems = [], // Default to empty array
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartQuantity
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
    <div className="p-2">
      {/* Products grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredProducts.map((item) => {
          // Check if this product is in cart
          const cartItem = cartItems.find(ci => ci.id === item.product.id);
          const isInCart = !!cartItem;
          
          return (
            <Product
              key={item.product.id}
              id={item.product.id}
              title={item.product.name}
              price={item.product.price ? Number(item.product.price) : 0}
              image={item.product.image_url || "/img/default.png"}
              isInCart={isInCart}
              cartQuantity={cartItem?.qty || 0}
              onAddToCart={onAddToCart ? () => onAddToCart(item) : undefined}
              onRemoveFromCart={onRemoveFromCart ? () => onRemoveFromCart(item.product.id) : undefined}
              onUpdateCartQuantity={onUpdateCartQuantity ? (quantity) => onUpdateCartQuantity(item.product.id, quantity) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Products;