// components/cards/ProductCard.tsx
"use client";
import React from "react";
import Image from "next/image";
import { useCheckout } from "@/context/CheckOutContext";

// Add onAdd to the ProductProps type
type ProductProps = {
  id: number;
  title: string;
  price: number;
  image?: string;
};

const Product: React.FC<ProductProps> = ({ id, title, price, image }) => {
  const { cart, addToCart } = useCheckout();

  const cartItem = cart.find((item) => item.id === id);
  const qty = cartItem?.qty || 0;

  const handleIncrement = () => {
    const imageFile = image ? image.split("/").pop() : undefined;
    const product = { id, title, price, image: imageFile };

    // Update context
    addToCart(product, 1);
  };

  const handleDecrement = () => {
    if (qty === 0) return;
    const imageFile = image ? image.split("/").pop() : undefined;
    const product = { id, title, price, image: imageFile };

    // Update context
    addToCart(product, -1);
  };

  const displayImage =
    image && image.trim() !== "" ? image : "/images/default-product.png";

  return (
    <div className="w-full rounded-xl bg-gray-50 border border-gray-200 shadow-md flex flex-col overflow-hidden transition hover:shadow-lg">
      <div className="relative w-full h-44">
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

      {qty === 0 ? (
        <div className="px-3 pb-3">
          <button
            onClick={handleIncrement}
            className="w-full py-2 bg-blue-600 rounded text-white hover:bg-blue-700"
          >
            Add to Cart
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 pb-3">
          <button
            onClick={handleDecrement}
            disabled={qty === 0}
            className={`w-8 h-8 flex items-center justify-center rounded text-gray-700 ${
              qty === 0
                ? "bg-gray-100 cursor-not-allowed"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            -
          </button>
          <span className="text-gray-800 font-semibold">{qty}</span>
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
