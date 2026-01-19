"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";

type CategoriesProps = {
  selectedCategory: string;
  onSelect: (category: string) => void;
};

type CategoryData = {
  id: number;
  name: string;
};

const Categories: React.FC<CategoriesProps> = ({ selectedCategory, onSelect }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get<{ status: string; data: CategoryData[] }>("/category/all");
        setCategories(res.data.data);
        console.log(res)
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    }

    fetchCategories();
  }, []);

  const allCategories = [{ id: 0, name: t.all }, ...categories];

  return (
    <section className="flex flex-col gap-4 mt-4">
      {allCategories.map((cat) => (
        <div
          key={cat.id}
          onClick={() => onSelect(cat.name)}
          className={`px-4 py-4 text-[16px] font-medium rounded-[5px] cursor-pointer flex items-center justify-center min-h-[50px] w-[70px] ${
            selectedCategory === cat.name ? "bg-blue-600 text-white" : "bg-gray-500 text-white"
          }`}
        >
          <span className="transform -rotate-90 whitespace-nowrap">
            {cat.name}
          </span>
        </div>
      ))}
    </section>
  );
};

export default Categories;
