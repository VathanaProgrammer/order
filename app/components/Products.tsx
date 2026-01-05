"use client";
import React, { useEffect, useState } from "react";
import Product from "./cards/ProductCard";
import { useCheckout } from "@/context/CheckOutContext";
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

// Add props type here
interface ProductsProps {
  selectedCategory: string;
  searchQuery: string;
  products?: ProductData[];
}

// Accept props in component
const Products: React.FC<ProductsProps> = ({ selectedCategory, searchQuery }) => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const { addToCart } = useCheckout();
  const { setLoading } = useLoading();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await api.get<{ status: string; data: ProductData[] }>("/product/all");
        let fetchedProducts = res.data.data;

        // ✅ Optional filtering by category and search query
        if (selectedCategory && selectedCategory !== "All") {
          fetchedProducts = fetchedProducts.filter((item) =>
            item.product.category?.toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }
        if (searchQuery) {
          fetchedProducts = fetchedProducts.filter((item) =>
            item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setProducts(fetchedProducts);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, searchQuery, setLoading]);

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {products.map((item) => (
        <Product
          key={item.product.id}
          id={item.product.id}
          title={item.product.name}
          price={Number(item.product.price)}
          image={item.product.image_url && item.product.image_url.trim() !== "" ? item.product.image_url : "/img/default.png"}
        />

      ))}
    </div>
  );

};

export default Products;
