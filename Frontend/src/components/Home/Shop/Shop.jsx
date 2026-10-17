import React, { useEffect, useState } from "react";
import "./Shop.css";
import ProductCard from "../../Shared/ProductCard/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Backend থেকে products fetch করা
    fetch("http://localhost/tajworld/Backend/backend/ProductShow.php")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="shop-container">
      <h1>Our Products</h1>
      <div className="shop-grid">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              price={product.price}
              image={`https://localhost/project2/backend/uploads/${product.image}`}
            />
          ))
        ) : (
          <p>No products available</p>
        )}
      </div>
    </div>
  );
}
