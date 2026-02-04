// components/cards/ProductCard.tsx
"use client";
import React from "react";
import Image from "next/image";
import { useCheckout } from "@/context/CheckOutContext";
import { useLanguage } from "@/context/LanguageContext";

// Update the ProductProps type to accept optional cart props
type ProductProps = {
  id: number;
  title: string;
  price: number;
  image?: string;
  // Add these optional props for direct control
  isInCart?: boolean;
  cartQuantity?: number;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  onUpdateCartQuantity?: (quantity: number) => void;
};

const Product: React.FC<ProductProps> = ({ 
  id, 
  title, 
  price, 
  image,
  // Optional props from Products component
  isInCart,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartQuantity
}) => {
  const { cart, addToCart } = useCheckout();
  const { t } = useLanguage();

  // Use direct props if provided, otherwise use context
  const hasDirectControl = onAddToCart !== undefined;
  const displayQty = hasDirectControl ? (cartQuantity || 0) : (cart.find((item) => item.id === id)?.qty || 0);
  const displayIsInCart = hasDirectControl ? (isInCart || false) : displayQty > 0;

  const handleIncrement = () => {
    if (hasDirectControl && onAddToCart) {
      // Use direct control from Products component
      onAddToCart();
    } else {
      // Use CheckoutContext
      const imageFile = image ? image.split("/").pop() : undefined;
      const product = { id, title, price, image: imageFile };
      addToCart(product, 1);
    }
  };

  const handleDecrement = () => {
    if (displayQty === 0) return;
    
    if (hasDirectControl) {
      if (displayQty === 1 && onRemoveFromCart) {
        onRemoveFromCart();
      } else if (onUpdateCartQuantity) {
        onUpdateCartQuantity(displayQty - 1);
      }
    } else {
      // Use CheckoutContext
      const imageFile = image ? image.split("/").pop() : undefined;
      const product = { id, title, price, image: imageFile };
      addToCart(product, -1);
    }
  };

  const displayImage =
    image && image.trim() !== "" ? image : "/images/default-product.png";

  return (
    <div className="w-full rounded-xl bg-gray-50 border border-gray-200 shadow-md flex flex-col overflow-hidden transition hover:shadow-lg">
      <div className="relative w-full h-26">
        <Image
          src={displayImage}
          alt={title}
          fill
          className="object-cover"
          unoptimized
          sizes="(max-width: 768px) 100vw"
        />
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h2 className="font-semibold text-gray-800 text-sm truncate">
          {title}
        </h2>
        <p className="text-gray-900 font-bold text-base mt-1">
          ${price.toFixed(2)}
        </p>
      </div>

      {displayQty === 0 ? (
        <div className="px-3 pb-3">
          <button
            onClick={handleIncrement}
            className="w-full text-sm py-1 bg-blue-600 rounded text-white hover:bg-blue-700"
          >
            {t.addToCart}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 pb-3">
          <button
            onClick={handleDecrement}
            disabled={displayQty === 0}
            className={`w-8 h-8 flex items-center justify-center rounded text-gray-700 ${
              displayQty === 0
                ? "bg-gray-100 cursor-not-allowed"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            -
          </button>
          <span className="text-gray-800 font-semibold">{displayQty}</span>
          <button
            onClick={handleIncrement}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded hover:bg-blue-700 text-white"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
};

export default Product;