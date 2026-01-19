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
}

const FeaturedSection: React.FC<FeaturedSectionProps> = ({ products }) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-2!">
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
          />
        ))}
      </div>
    </section>
  );
};

export default FeaturedSection;