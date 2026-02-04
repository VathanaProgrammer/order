"use client";

import SearchBar from "@/components/SearchBar";
import Categories from "@/components/Categories";
import Products from "@/components/Products";
import RewardSection from "./components/RewardSection";
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/api/api";
import { useLanguage } from "@/context/LanguageContext";

interface ProductData {
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

interface CategoryData {
  id: number;
  name: string;
}

// Cart item interface
interface CartItem {
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
  };
}

// Cache keys - UPDATED FOR CART
const CART_ITEMS_KEY = 'shopping_cart_items';
const CART_TIMESTAMP_KEY = 'cart_cache_timestamp';
const CART_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours for cart items
const CATEGORIES_CACHE_KEY = 'cached_categories';

// Keep product catalog cache but with shorter expiry
const PRODUCTS_CACHE_KEY = 'cached_products';
const PRODUCTS_TIMESTAMP_KEY = 'products_cache_timestamp';
const PRODUCTS_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes for product catalog

export default function ProductPage() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>(t.all);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  
  // Refs
  const hasInitialized = useRef(false);
  const isFetching = useRef(false);
  
  // Cache for category-specific products
  const [categoryCache, setCategoryCache] = useState<Record<string, ProductData[]>>({});

  // ========== CART FUNCTIONS ==========
  
  // Load cart from localStorage
  const loadCartFromStorage = (): CartItem[] => {
    try {
      const cached = localStorage.getItem(CART_ITEMS_KEY);
      const cacheTime = localStorage.getItem(CART_TIMESTAMP_KEY);
      
      if (cached && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        if (timeDiff < CART_EXPIRY_MS) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            console.log('Loaded cart from storage:', parsed.length, 'items');
            return parsed;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
    }
    return [];
  };

  // Save cart to localStorage
  const saveCartToStorage = (items: CartItem[]) => {
    try {
      localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));
      localStorage.setItem(CART_TIMESTAMP_KEY, Date.now().toString());
      console.log('Cart saved to storage:', items.length, 'items');
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  };

  // Add product to cart
  const addToCart = (product: ProductData) => {
    const cartProduct: CartItem['product'] = {
      id: product.product.id,
      name: product.product.name,
      price: typeof product.product.price === 'string' 
        ? parseFloat(product.product.price) 
        : (product.product.price as number) || 0,
      image_url: product.product.image_url
    };

    const newItem: CartItem = {
      productId: product.product.id,
      quantity: 1,
      product: cartProduct
    };

    setCartItems(prev => {
      // Check if product already in cart
      const existingIndex = prev.findIndex(item => item.productId === product.product.id);
      let newCart: CartItem[];
      
      if (existingIndex >= 0) {
        // Increase quantity
        newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        };
      } else {
        // Add new item
        newCart = [...prev, newItem];
      }
      
      // Save to localStorage
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  // Remove product from cart
  const removeFromCart = (productId: number) => {
    setCartItems(prev => {
      const newCart = prev.filter(item => item.productId !== productId);
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  // Update cart item quantity
  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prev => {
      const newCart = prev.map(item => 
        item.productId === productId 
          ? { ...item, quantity } 
          : item
      );
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_ITEMS_KEY);
    localStorage.removeItem(CART_TIMESTAMP_KEY);
    console.log('Cart cleared');
  };

  // Calculate total items in cart
  useEffect(() => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    setCartItemCount(totalItems);
  }, [cartItems]);

  // Initialize cart from localStorage on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      const savedCart = loadCartFromStorage();
      setCartItems(savedCart);
      console.log('Cart initialized with:', savedCart.length, 'items');
      hasInitialized.current = true;
    }
  }, []);

  // ========== PRODUCT CATALOG FUNCTIONS ==========
  
  // Save products to localStorage
  const saveProductsToCache = (products: ProductData[]) => {
    try {
      if (products.length > 0) {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
        localStorage.setItem(PRODUCTS_TIMESTAMP_KEY, Date.now().toString());
        console.log('Product catalog saved to cache:', products.length);
      }
    } catch (error) {
      console.error('Failed to save products to cache:', error);
    }
  };

  // Load products from localStorage
  const loadProductsFromCache = (): ProductData[] | null => {
    try {
      const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
      const cacheTime = localStorage.getItem(PRODUCTS_TIMESTAMP_KEY);
      
      if (cached && cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        if (timeDiff < PRODUCTS_EXPIRY_MS) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('Loading product catalog from cache:', parsed.length);
            return parsed;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load products from cache:', error);
    }
    return null;
  };

  // Save categories to localStorage
  const saveCategoriesToCache = (categoriesData: CategoryData[]) => {
    try {
      if (categoriesData.length > 0) {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categoriesData));
      }
    } catch (error) {
      console.error('Failed to save categories to cache:', error);
    }
  };

  // Load categories from localStorage
  const loadCategoriesFromCache = (): CategoryData[] | null => {
    try {
      const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load categories from cache:', error);
    }
    return null;
  };

  // Clear product cache (not cart)
  const clearProductCache = () => {
    try {
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      localStorage.removeItem(PRODUCTS_TIMESTAMP_KEY);
      localStorage.removeItem(CATEGORIES_CACHE_KEY);
      setCategoryCache({});
      console.log('Product cache cleared');
    } catch (error) {
      console.error('Failed to clear product cache:', error);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        // Try to load from cache first
        const cachedCategories = loadCategoriesFromCache();
        if (cachedCategories && cachedCategories.length > 0) {
          setCategories(cachedCategories);
        }

        // Fetch fresh data
        const res = await api.get("/category/all");
        const categoriesData = Array.isArray(res.data)
          ? res.data
          : (res.data?.data || res.data || []);
        
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          setCategories(categoriesData);
          saveCategoriesToCache(categoriesData);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    
    fetchCategories();
  }, []);

  // Fetch products based on selected category
  const fetchProducts = useCallback(async (category: string, search: string, forceRefresh: boolean = false) => {
    if (isFetching.current) return;
    
    setIsLoading(true);
    setError(null);
    isFetching.current = true;
    
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && (category === "All" || category === "ទាំងអស់") && !search.trim()) {
        const cachedProducts = loadProductsFromCache();
        if (cachedProducts && cachedProducts.length > 0) {
          setAllProducts(cachedProducts);
          setIsLoading(false);
          isFetching.current = false;
          return;
        }
      }
      
      // Check in-memory category cache
      if (!forceRefresh && categoryCache[category] && !search.trim()) {
        setAllProducts(categoryCache[category]);
        setIsLoading(false);
        isFetching.current = false;
        return;
      }
      
      // Build URL for API call
      let url = "/product/all";
      const params = new URLSearchParams();
      
      if (category !== "All" && category !== "ទាំងអស់") {
        params.append('category', category);
      }
      
      if (search.trim()) {
        params.append('search', search);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log(`Fetching products from API: ${url}`);
      
      const res = await api.get(url);
      let productsData: ProductData[] = [];
      
      if (Array.isArray(res.data)) {
        productsData = res.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        productsData = res.data.data;
      }
      
      console.log(`API returned ${productsData.length} products`);
      
      if (Array.isArray(productsData)) {
        setAllProducts(productsData);
        
        // Cache the product catalog
        if ((category === "All" || category === "ទាំងអស់") && !search.trim() && productsData.length > 0) {
          saveProductsToCache(productsData);
        }
        
        // Cache in memory for categories
        if (!search.trim() && productsData.length > 0) {
          setCategoryCache(prev => ({
            ...prev,
            [category]: productsData
          }));
        }
      }
      
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(`Failed to load products: ${err.message}`);
      
      // Try to use cache as fallback
      const cachedProducts = loadProductsFromCache();
      if (cachedProducts && cachedProducts.length > 0) {
        setAllProducts(cachedProducts);
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [categoryCache]);

  // Fetch products when category or search changes
  useEffect(() => {
    if (categories.length > 0) {
      fetchProducts(selectedCategory, searchQuery, false);
    }
  }, [selectedCategory, searchQuery, categories.length, fetchProducts]);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery("");
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchProducts(selectedCategory, searchQuery, true);
  };

  // Update the Products component to pass cart functions
  // You'll need to modify your Products component to accept these props

  return (
    <div className="flex flex-col flex-1 hide-scrollbar">
      {/* Cart indicator */}
      <div className="sticky top-0 z-30 bg-white border-b">
        <div className="flex justify-between items-center px-4 py-2">
          <h1 className="text-lg font-semibold">Products</h1>
          <div className="relative">
            <button 
              onClick={() => console.log('Open cart')} // Add your cart modal/open logic here
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Cart
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        <div className="pb-2 px-4">
          <SearchBar onSearch={(value) => setSearchQuery(value)} />
        </div>
      </div>

      <div className="flex flex-1 overflow-y-auto">
        <Categories 
          selectedCategory={selectedCategory} 
          onSelect={handleCategorySelect} 
        />
        
        {/* Show loading state */}
        {isLoading ? (
          <div className="flex-1 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Loading Products...</h2>
              <button
                onClick={clearProductCache}
                className="text-sm text-gray-500 hover:text-gray-700"
                title="Clear product cache"
              >
                Clear Cache
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg"></div>
                  <div className="mt-2 h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="mt-1 h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-red-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700">{error}</h3>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
                <button
                  onClick={clearProductCache}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex justify-between items-center p-2">
              <span className="text-sm text-gray-500">
                Showing {allProducts.length} products
                {cartItemCount > 0 && ` • ${cartItemCount} items in cart`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Refresh
                </button>
                <button
                  onClick={clearProductCache}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Cache
                </button>
              </div>
            </div>
            
            {/* Products grid - You need to update ProductCard to handle cart */}
            <div className="p-2">
              <div className="grid grid-cols-2 gap-4">
                {allProducts.map((item) => {
                  const cartItem = cartItems.find(ci => ci.productId === item.product.id);
                  const isInCart = !!cartItem;
                  
                  return (
                    <div key={item.product.id} className="relative">
                      {/* Product Card */}
                      <div className="border rounded-lg overflow-hidden shadow-sm">
                        <div className="h-48 bg-gray-100 flex items-center justify-center">
                          {item.product.image_url ? (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400">No image</div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-gray-800 truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-lg font-semibold text-blue-600 mt-1">
                            ${typeof item.product.price === 'string' 
                              ? parseFloat(item.product.price).toFixed(2)
                              : (item.product.price || 0).toFixed(2)}
                          </p>
                          
                          {/* Cart Controls */}
                          <div className="mt-3">
                            {isInCart ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateCartQuantity(item.product.id, cartItem.quantity - 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded"
                                  >
                                    -
                                  </button>
                                  <span className="font-medium">{cartItem.quantity}</span>
                                  <button
                                    onClick={() => updateCartQuantity(item.product.id, cartItem.quantity + 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Add to Cart
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* In-cart badge */}
                      {isInCart && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          In Cart
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}