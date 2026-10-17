// C:\React Project\project2\src\components\Home\Home.jsx

import React from "react";
import HeroBanner from "../Shared/HeroBanner/HeroBanner";
import ProductCard from "../Shared/ProductCard/ProductCard";
import CategoryBar from "../Shared/CategoryBar/CategoryBar"; 
import { useSearchParams } from "react-router-dom"; 
import "./Home.css";

export default function Home() {
  // URL থেকে 'category' প্যারামিটারটি লোড করা
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const isFiltered = !!categorySlug; // কোনো ক্যাটাগরি ফিল্টার করা আছে কিনা

  return (
    <div className="home">
      <CategoryBar /> {/* CategoryBar যুক্ত করা হলো */}
      <HeroBanner />

      <section className="section">
        <h2>
          {isFiltered 
            ? `Products in: ${categorySlug.toUpperCase()}` // ফিল্টার করা থাকলে ক্যাটাগরি নাম দেখাবে
            : 'Featured Products' // না হলে ডিফল্ট দেখাবে
          }
        </h2>
        {/* ProductCard এর ভেতরেই ক্যাটাগরি ফিল্টারিংয়ের লজিক আছে */}
        <ProductCard /> 
      </section>

      {/* যদি ক্যাটাগরি ফিল্টার করা না থাকে, তবে Special Offers সেকশনটি দেখানো হবে */}
      {!isFiltered && (
        <section className="section">
          <h2>Special Offers</h2>
          <div className="offer-box">🔥 50% Off on Selected Items</div>
        </section>
      )}
    </div>
  );
}