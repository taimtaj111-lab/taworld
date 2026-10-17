import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronRight,
  FaTimes,
  FaLayerGroup,
} from "react-icons/fa";
import "./CategoryBar.css";

export default function CategoryBar() {
  const [cats, setCats] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(
      "http://localhost/tajworld/Backend/backend/Admin/manage_categories/get_categories.php"
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setCats(data.categories || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching categories:", error);
      });
  }, []);

  // বাইরে ক্লিক করলে ড্রপডাউন বন্ধ করার জন্য
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ব্যাকগ্রাউন্ড স্ক্রোল লক
  useEffect(() => {
    const isOpen = sidebarOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleSubClick = (slug) => {
    if (!slug) return;
    setActiveDropdownId(null);
    setSidebarOpen(false);
    navigate(`/?category=${encodeURIComponent(slug)}`);
  };

  return (
    <nav className="modern-cat-nav" ref={dropdownRef}>
      <div className="container-fluid">
        <div className="cat-wrapper">
          {/* ALL CATEGORIES BUTTON */}
          <button
            type="button"
            className="all-trigger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open all categories"
          >
            <FaBars className="icon-pulse" />
            <span>ALL</span>
          </button>

          {/* MAIN CATEGORY BAR (NO MORE BUTTON, ALL CATEGORIES DISPLAYED) */}
          <div className="main-cat-grid">
            {cats.map((cat) => {
              const hasSubs = cat.subcategories && cat.subcategories.length > 0;
              const isDropdownActive = activeDropdownId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`grid-item ${isDropdownActive ? "active" : ""}`}
                  onClick={() => {
                    if (hasSubs) {
                      setActiveDropdownId(isDropdownActive ? null : cat.id);
                    } else {
                      handleSubClick(cat.slug);
                    }
                  }}
                  onMouseEnter={() => hasSubs && setActiveDropdownId(cat.id)}
                >
                  <span className="cat-name">{cat.category_name}</span>
                  {hasSubs && <FaChevronRight className="drop-arrow" />}

                  {/* Ghorer Bazar Style Hover / Click Dropdown with Scroll */}
                  {hasSubs && isDropdownActive && (
                    <div className="category-dropdown-menu">
                      <div className="dropdown-scroll-box">
                        {cat.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="dropdown-sub-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubClick(sub.slug);
                            }}
                          >
                            <span className="sub-dot" />
                            <span>{sub.subcategory_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ALL CATEGORIES SIDEBAR (For Mobile / ALL Button) */}
      <div
        className={`mega-sidebar ${sidebarOpen ? "open" : ""}`}
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-header">
          <div className="brand-box">
            <span className="sidebar-brand-icon">
              <FaLayerGroup />
            </span>
            <div>
              <h3>All Categories</h3>
              <span className="sidebar-subtitle">Explore TajWorld</span>
            </div>
          </div>
          <button
            type="button"
            className="close-side"
            onClick={closeSidebar}
            aria-label="Close categories"
          >
            <FaTimes />
          </button>
        </div>

        <div className="sidebar-content">
          {cats.map((cat) => (
            <details key={cat.id} className="side-details">
              <summary>
                <span className="side-category-name">{cat.category_name}</span>
                <FaChevronRight className="sum-arrow" />
              </summary>
              <div className="side-subs">
                {cat.subcategories?.length > 0 ? (
                  cat.subcategories.map((sub) => (
                    <button
                      type="button"
                      key={sub.id}
                      className="side-sub-link"
                      onClick={() => handleSubClick(sub.slug)}
                    >
                      <span className="side-sub-dot" />
                      <span>{sub.subcategory_name}</span>
                      <FaChevronRight className="side-sub-arrow" />
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="side-sub-link"
                    onClick={() => {
                      closeSidebar();
                      navigate(`/?category=${encodeURIComponent(cat.slug || cat.category_name)}`);
                    }}
                  >
                    <span className="side-sub-dot" />
                    <span>View all products</span>
                    <FaChevronRight className="side-sub-arrow" />
                  </button>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="dark-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}