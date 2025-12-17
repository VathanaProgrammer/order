"use client";

import SearchBar from "@/components/SearchBar";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import RewardSection from "./components/RewardSection";
import FeaturedSection from "./components/FeaturedSection";
import { useState } from "react";

export default function ProductPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const featuredProducts = [
    { id: 3, name: "Chocolate", price: 5, image_url: "https://img.freepik.com/premium-photo/milk-brown-chocolate-bar-with-coffee-generative-ai_207225-1886.jpg" },
    { id: 4, name: "Cookies", price: 3, image_url: "https://images.squarespace-cdn.com/content/v1/5fa0253eb0cd4f3d87cd5fba/b98c63fa-5b4e-445d-a6f2-5c6125909e76/AdobeStock_259047831.jpeg" },
  ];

  return (
    <div className="flex flex-col flex-1 hide-scrollbar">

      <RewardSection />

      <div className="sticky top-0 z-20 bg-white">
        <div className="pb-2">
          <SearchBar onSearch={(value) => setSearchQuery(value)} />
          <Categories selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        </div>
      </div>

      <div>
        <FeaturedSection products={featuredProducts} />
        <Products selectedCategory={selectedCategory} searchQuery={searchQuery} />
      </div>
    </div>
  );

}
