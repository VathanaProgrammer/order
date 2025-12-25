// components/FeaturedSection.tsx
"use client";
import React from "react";
import Product from "./cards/ProductCard";

export interface FeaturedProduct {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

interface FeaturedSectionProps {
  products: FeaturedProduct[];
  onAdd?: (
    product: { id: number; title: string; price: number; image?: string },
    qty: number
  ) => void;
}

const FeaturedSection: React.FC<FeaturedSectionProps> = ({ products, onAdd }) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold text-gray-700 mb-2">
        Featured Products
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {products.map((item) => (
          <Product
            key={item.id}
            id={item.id}
            title={item.name}
            price={item.price}
            image={item.image_url}
            onAdd={(product: { id: number; title: string; price: number; image?: string }, qty: number) =>
              onAdd?.(
                { 
                  id: item.id, 
                  title: item.name, 
                  price: item.price,
                  image: item.image_url 
                },
                qty
              )
            }
          />
        ))}
      </div>
    </section>
  );
};

export default FeaturedSection;