import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaEdit, FaTrashAlt, FaSave, FaTimes, FaPlus } from "react-icons/fa"; 
import "./CategoryManagement.css"; 

// ✅ সঠিক API Base Path
const API_BASE = "http://localhost/tajworld/Backend/backend/Admin/manage_categories/get_categories.php";

const GET_CATEGORIES = `${API_BASE}/get_categories_with_count.php`;
const ADD_CATEGORY = `${API_BASE}/add_category.php`;
const ADD_SUBCATEGORY = `${API_BASE}/add_subcategory.php`;
const DELETE_ITEM = `${API_BASE}/delete_item.php`; 
const UPDATE_ITEM = `${API_BASE}/update_item.php`; 

export default function CategoryManagement({ onUpdate, onCategorySelect }) { 
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  
  const [editingItem, setEditingItem] = useState(null); // { id, type }
  const [editName, setEditName] = useState("");
  const [error, setError] = useState(null);

  // 🔹 Fetch Categories (With Product Count & Subcategories)
  const fetchCategories = useCallback(async () => {
    setError(null);
    try {
      const res = await axios.get(GET_CATEGORIES);
      if (res.data.success && Array.isArray(res.data.categories)) {
        setCategories(res.data.categories);
      } else {
        setCategories([]);
        setError(res.data.message || "Failed to load categories.");
      }
    } catch (err) {
      console.error("fetchCategories error:", err);
      setError("Server error fetching categories. Please check backend connection.");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // -----------------------------------------------------
  // 🔹 ADD Category
  // -----------------------------------------------------
  const addCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      const payload = { category_name: categoryName.trim() };
      const res = await axios.post(ADD_CATEGORY, payload);
      
      if (res.data.success) {
        setCategoryName("");
        await fetchCategories();
        if (onUpdate) onUpdate(); 
        alert(res.data.message || "Category added successfully!");
      } else {
        alert("Failed to add category: " + (res.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Add Category Error:", err);
      alert(err.response?.data?.message || "Server error adding category.");
    }
  };

  // -----------------------------------------------------
  // 🔹 ADD Subcategory
  // -----------------------------------------------------
  const addSubcategory = async () => {
    if (!subcategoryName.trim() || !selectedCategory) return;
    try {
      const payload = { 
        subcategory_name: subcategoryName.trim(), 
        parent_category_id: selectedCategory 
      };
      const res = await axios.post(ADD_SUBCATEGORY, payload);
      
      if (res.data.success) {
        setSubcategoryName("");
        await fetchCategories();
        if (onUpdate) onUpdate(); 
        alert(res.data.message || "Subcategory added successfully!");
      } else {
        alert("Failed to add subcategory: " + (res.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Add Subcategory Error:", err);
      alert(err.response?.data?.message || "Server error adding subcategory.");
    }
  };

  // -----------------------------------------------------
  // 🔹 DELETE Function
  // -----------------------------------------------------
  const deleteItem = async (id, type) => {
    const itemTypeLabel = type === 'category' ? 'প্রধান ক্যাটাগরি' : 'সাব-ক্যাটাগরি';
    if (!window.confirm(`আপনি কি নিশ্চিত? আপনি এই ${itemTypeLabel} টি ডিলিট করতে চান?`)) return;

    try {
      const payload = { id: Number(id), type };
      const res = await axios.post(DELETE_ITEM, payload);
      
      if (res.data.success) {
        alert(res.data.message);
        await fetchCategories();
        if (onUpdate) onUpdate();
      } else {
        alert(res.data.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete Item Error:", err);
      alert(err.response?.data?.message || "Server error deleting item.");
    }
  };

  // -----------------------------------------------------
  // 🔹 EDIT Functions
  // -----------------------------------------------------
  const startEdit = (id, name, type) => {
    setEditingItem({ id, type });
    setEditName(name);
  };

  const handleUpdate = async () => {
    if (!editName.trim() || !editingItem) return;
    try {
      const payload = {
        id: Number(editingItem.id),
        name: editName.trim(),
        type: editingItem.type
      };
      
      const res = await axios.post(UPDATE_ITEM, payload);
      
      if (res.data.success) {
        alert(res.data.message);
        setEditingItem(null); 
        setEditName("");
        await fetchCategories();
        if (onUpdate) onUpdate();
      } else {
        alert("Update failed: " + (res.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Update Item Error:", err);
      alert(err.response?.data?.message || "Server error updating item.");
    }
  };

  const isEditing = (id, type) => editingItem?.id === id && editingItem?.type === type;

  // -----------------------------------------------------
  // 🔹 Render Logic
  // -----------------------------------------------------
  const renderItemContent = (item, type) => {
    const itemNameKey = type === 'category' ? 'category_name' : 'subcategory_name'; 
    const itemName = item[itemNameKey];
    
    if (isEditing(item.id, type)) {
      return (
        <input 
          type="text" 
          value={editName} 
          onChange={(e) => setEditName(e.target.value)} 
          className="edit-input"
          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); }}
          autoFocus
        />
      );
    }
    
    const isCategory = type === 'category';
    return (
      <span 
        className={isCategory ? 'category-name-text' : 'subcategory-name-text'}
        onClick={() => onCategorySelect && onCategorySelect(item.id)} 
        title={`View products in ${itemName}`}
        style={{ cursor: "pointer" }}
      >
        {isCategory ? <strong>{itemName}</strong> : itemName}
      </span>
    );
  };

  const renderActions = (item, type) => (
    <div className="actions-group">
      {isEditing(item.id, type) ? (
        <>
          <button className="save-btn" onClick={handleUpdate} title="Save Changes"><FaSave/> Save</button>
          <button className="cancel-btn" onClick={() => setEditingItem(null)} title="Cancel Editing"><FaTimes/> Cancel</button>
        </>
      ) : (
        <>
          <button className="edit-btn" onClick={() => startEdit(item.id, item[type === 'category' ? 'category_name' : 'subcategory_name'], type)} title="Edit Name"><FaEdit/> Edit</button>
          <button className="delete-btn" onClick={() => deleteItem(item.id, type)} title="Delete Item"><FaTrashAlt/> Delete</button>
        </>
      )}
    </div>
  );

  return (
    <div className="category-management-container">
      {error && <div className="error-message">{error}</div>}
      
      <div className="category-actions">
        {/* ADD CATEGORY */}
        <div className="action-panel add-category">
          <h3><FaPlus /> Add New Category</h3>
          <input 
            value={categoryName} 
            onChange={(e) => setCategoryName(e.target.value)} 
            placeholder="Category Name (e.g., Electronics)" 
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
          />
          <button className="btn-primary" onClick={addCategory} disabled={!categoryName.trim()}>Add Category</button>
        </div>

        {/* ADD SUBCATEGORY */}
        <div className="action-panel add-subcategory">
          <h3><FaPlus /> Add New Subcategory</h3>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="category-select">
            <option value="">-- Select Parent Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.category_name}</option>
            ))}
          </select>
          <input 
            value={subcategoryName} 
            onChange={(e) => setSubcategoryName(e.target.value)} 
            placeholder="Subcategory Name (e.g., Smartphones)" 
            onKeyDown={(e) => { if (e.key === 'Enter') addSubcategory(); }}
          />
          <button 
            className="btn-primary" 
            onClick={addSubcategory} 
            disabled={!selectedCategory || !subcategoryName.trim()}>
            Add Subcategory
          </button>
        </div>
      </div>
      
      <div className="category-list-section">
        <h3>Existing Categories & Subcategories ({categories.length} Primary Categories)</h3>
        <div className="category-list">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              {/* Category Header */}
              <div className={`category-header ${isEditing(cat.id, 'category') ? 'editing-mode' : ''}`}>
                <div className="category-name-display">{renderItemContent(cat, 'category')}</div>
                <span className="product-count">({cat.product_count || 0} Products)</span>
                {renderActions(cat, 'category')}
              </div>

              {/* Subcategory List */}
              <div className="subcategory-list">
                {cat.subcategories && cat.subcategories.map((sub) => (
                  <div key={sub.id} className={`subcategory-item ${isEditing(sub.id, 'subcategory') ? 'editing-mode' : ''}`}>
                    <div className="subcategory-name-display">{renderItemContent(sub, 'subcategory')}</div>
                    <span className="product-count sub-count">({sub.product_count || 0} Products)</span>
                    {renderActions(sub, 'subcategory')}
                  </div>
                ))}
                {(!cat.subcategories || cat.subcategories.length === 0) && <p className="no-sub-text">No subcategories yet.</p>}
              </div>
            </div>
          ))}
          {categories.length === 0 && <div className="no-categories-message">No categories found. Start adding a new one!</div>}
        </div>
      </div>
    </div>
  );
}