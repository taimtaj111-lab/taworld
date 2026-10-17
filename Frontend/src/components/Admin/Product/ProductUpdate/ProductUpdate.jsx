import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import "./ProductUpdate.css"; 

const BASE_URL = "http://localhost/tajworld/Backend/backend";
const PRODUCT_UPDATE_API = `${BASE_URL}/Product/ProductUpdate.php`;
const PRODUCT_FETCH_API = `${BASE_URL}/Product/ProductFetch.php`;
const CATEGORIES_API = `${BASE_URL}/Admin/manage_categories/get_categories.php`; 
const IMAGE_ROOT_URL = "http://localhost/tajworld/Backend/backend/uploads/";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const MAX_OTHER_IMAGES = 4;

export default function ProductUpdate() { 
    const navigate = useNavigate();
    const { productId } = useParams();

    const [allCategories, setAllCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);

    const [formData, setFormData] = useState({
        product_name: "", 
        category_id: "",
        subcategory_id: "",
        product_code: "",
        regular_price: "", 
        discount_price: "",
        discount_percentage: 0,
        stock: "",
        short_description: "",
        full_description: "", 
        tags: "",
        size_options: [],
        delivery_charge: 0, 
        main_image_path: "", 
        existing_other_images: [], 
    });

    const [newMainImageFile, setNewMainImageFile] = useState(null);
    const [newOtherImageFiles, setNewOtherImageFiles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    
    // ক্যাটাগরি ও প্রোডাক্ট তথ্য ফেচিং
    const fetchCategoriesAndData = useCallback(async () => {
        try {
            // ১. ক্যাটাগরি আনো
            const catRes = await axios.get(CATEGORIES_API).catch(() => null);
            if (catRes && catRes.data.success) {
                setAllCategories(catRes.data.categories || []);
            }

            // ২. প্রোডাক্টের তথ্য আনো (ProductFetch.php এর সাহায্যে)
            if (productId) {
                const prodRes = await axios.get(`${PRODUCT_FETCH_API}?id=${productId}`);
                
                if (prodRes.data.success && prodRes.data.data) {
                    const prodList = prodRes.data.data;
                    const prod = Array.isArray(prodList) ? prodList.find(p => p.id === parseInt(productId)) : prodList;
                    
                    if (prod) {
                        const regular = parseFloat(prod.regular_price) || 0;
                        const discount = parseFloat(prod.discount_price) || 0;
                        let percentage = 0;
                        if (regular > 0 && discount < regular) percentage = Math.round(((regular - discount) / regular) * 100);

                        setFormData({
                            product_name: prod.product_name || prod.name || "",
                            category_id: prod.category_id ? prod.category_id.toString() : "",
                            subcategory_id: prod.subcategory_id ? prod.subcategory_id.toString() : "",
                            product_code: prod.product_code || "",
                            regular_price: prod.regular_price ? prod.regular_price.toString() : "",
                            discount_price: prod.discount_price ? prod.discount_price.toString() : "",
                            discount_percentage: percentage,
                            stock: prod.stock ? prod.stock.toString() : "0",
                            short_description: prod.short_description || "",
                            full_description: prod.description || prod.full_description || "",
                            tags: prod.tags || "",
                            size_options: Array.isArray(prod.size_options) ? prod.size_options : [],
                            delivery_charge: prod.delivery_charge ? prod.delivery_charge.toString() : "0",
                            main_image_path: prod.main_image || prod.main_image_path || "", 
                            existing_other_images: Array.isArray(prod.other_images) ? prod.other_images : [], 
                        });
                    } else {
                        setError("Product not found.");
                    }
                } else {
                    setError("Failed to load product data.");
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError(`Fetch error: ${err.message || "Could not connect to the API."}`);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => { fetchCategoriesAndData(); }, [fetchCategoriesAndData]);

    // সাবক্যাটাগরি আপডেট
    useEffect(() => {
        if (formData.category_id && allCategories.length > 0) {
            const selectedCat = allCategories.find(c => c.id.toString() === formData.category_id);
            setSubcategories(selectedCat?.subcategories || []);
        }
    }, [formData.category_id, allCategories]);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "regular_price" || name === "discount_price") {
            const regular = parseFloat(name === "regular_price" ? value : formData.regular_price) || 0;
            const discount = parseFloat(name === "discount_price" ? value : formData.discount_price) || 0;
            let percentage = 0;
            if (regular > 0 && discount < regular) percentage = Math.round(((regular - discount) / regular) * 100);
            
            setFormData(prev => ({ ...prev, [name]: value, discount_percentage: percentage }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleMainImageChange = (e) => {
        setNewMainImageFile(e.target.files[0] || null);
    };

    const handleOtherImagesChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setNewOtherImageFiles(prevFiles => {
            const currentCount = prevFiles.length + formData.existing_other_images.length;
            const availableSlots = MAX_OTHER_IMAGES - currentCount;
            
            if (availableSlots <= 0) {
                alert(`You can only upload ${MAX_OTHER_IMAGES} total additional images.`);
                return prevFiles;
            }
            return [...prevFiles, ...newFiles.slice(0, availableSlots)];
        });
        e.target.value = null; 
    };
    
    const removeExistingOtherImage = (index) => {
        setFormData(prev => ({ 
            ...prev, 
            existing_other_images: prev.existing_other_images.filter((_, i) => i !== index)
        }));
    };
    
    const removeNewOtherImage = (index) => {
        setNewOtherImageFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleSizeChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const newSizes = checked
                ? [...prev.size_options, value]
                : prev.size_options.filter(s => s !== value);
            return { ...prev, size_options: AVAILABLE_SIZES.filter(s => newSizes.includes(s)) };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(""); setError("");
        
        if (!formData.category_id || !formData.product_name || !formData.stock || !formData.regular_price) {
            setError("Required fields are missing.");
            return;
        }

        setLoading(true);

        const data = new FormData();
        data.append('product_id', productId);
        data.append("name", formData.product_name);
        data.append("category_id", formData.category_id);
        data.append("subcategory_id", formData.subcategory_id);
        data.append("product_code", formData.product_code);
        data.append("price", formData.regular_price);
        data.append("discount_price", formData.discount_price);
        data.append("stock", formData.stock);
        data.append("short_description", formData.short_description);
        data.append("description", formData.full_description); 
        data.append("tags", formData.tags);
        data.append("delivery_charge", formData.delivery_charge);
        
        data.append("size_options", JSON.stringify(formData.size_options));
        data.append("existing_other_images", JSON.stringify(formData.existing_other_images));

        if (newMainImageFile) {
            data.append("main_image_file", newMainImageFile);
        }

        if (newOtherImageFiles.length > 0) {
            newOtherImageFiles.forEach((file) => {
                data.append("new_other_images[]", file); 
            });
        }
        
        try {
            const response = await axios.post(PRODUCT_UPDATE_API, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setMessage(response.data.message || "Product updated successfully!");
                setTimeout(() => navigate('/admin/products'), 1500); 
            } else {
                setError(response.data.message || response.data.error || "Failed to update product.");
            }
        } catch (err) {
            console.error("Update error:", err);
            setError(`Error updating product: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && !formData.product_name) {
        return <div className="loading-state">Loading product data...</div>;
    }

    return (
        <div className="admin-form-container">
            <h2>Edit Product: {formData.product_name || `ID ${productId}`}</h2>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit} className="product-form" encType="multipart/form-data">
                
                <div className="form-section">
                    <h3>Product Details</h3>
                    <div className="form-group">
                        <label>Product Name <span className="required">*</span></label>
                        <input type="text" name="product_name" value={formData.product_name} onChange={handleChange} required />
                    </div>
                    
                    <div className="form-group">
                        <label>Category <span className="required">*</span></label>
                        <select name="category_id" value={formData.category_id} onChange={handleChange} required>
                            <option value="">Select Category</option>
                            {allCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Subcategory</label>
                        <select name="subcategory_id" value={formData.subcategory_id} onChange={handleChange}>
                            <option value="">No Subcategory</option>
                            {subcategories.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Product Code (SKU)</label>
                        <input type="text" name="product_code" value={formData.product_code} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-section">
                    <h3>Pricing & Stock</h3>
                    <div className="form-group">
                        <label>Regular Price <span className="required">*</span></label>
                        <input type="number" name="regular_price" value={formData.regular_price} onChange={handleChange} step="0.01" min="0.01" required />
                    </div>
                    
                    <div className="form-group">
                        <label>Discount Price</label>
                        <input type="number" name="discount_price" value={formData.discount_price} onChange={handleChange} step="0.01" min="0" />
                    </div>

                    <div className="form-group">
                        <label>Stock Quantity <span className="required">*</span></label>
                        <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" required />
                    </div>
                </div>

                <div className="form-section">
                    <h3>Description & Other</h3>
                    <div className="form-group">
                        <label>Short Description</label>
                        <textarea name="short_description" value={formData.short_description} onChange={handleChange} rows="3"></textarea>
                    </div>

                    <div className="form-group">
                        <label>Full Description</label>
                        <textarea name="full_description" value={formData.full_description} onChange={handleChange} rows="5"></textarea>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Size Options</h3>
                    <div className="size-options-container">
                        {AVAILABLE_SIZES.map(size => (
                            <label key={size} className="size-checkbox-label">
                                <input
                                    type="checkbox"
                                    value={size}
                                    checked={formData.size_options.includes(size)}
                                    onChange={handleSizeChange}
                                />
                                {size}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Images</h3>
                    <div className="form-group image-upload-group">
                        <label>Main Image</label>
                        <input type="file" onChange={handleMainImageChange} accept="image/*" />
                        <div className="current-image-preview">
                            {newMainImageFile ? (
                                <img src={URL.createObjectURL(newMainImageFile)} alt="New Main" width="100" />
                            ) : formData.main_image_path ? (
                                <img src={`${IMAGE_ROOT_URL}${formData.main_image_path}`} alt="Current Main" width="100" />
                            ) : null}
                        </div>
                    </div>

                    <div className="form-group image-upload-group">
                        <label>Existing Additional Images</label>
                        <div className="other-images-preview">
                            {formData.existing_other_images.map((path, index) => (
                                <div key={index} className="image-preview-item">
                                    <img src={`${IMAGE_ROOT_URL}${path}`} alt={`Other ${index}`} width="80" />
                                    <button type="button" onClick={() => removeExistingOtherImage(index)}>
                                        <FaTimes />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group image-upload-group">
                        <label>Add New Images</label>
                        <input type="file" onChange={handleOtherImagesChange} accept="image/*" multiple />
                        <div className="other-images-preview">
                            {newOtherImageFiles.map((file, index) => (
                                <div key={index} className="image-preview-item">
                                    <img src={URL.createObjectURL(file)} alt={`New ${index}`} width="80" />
                                    <button type="button" onClick={() => removeNewOtherImage(index)}>
                                        <FaTimes />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Updating Product..." : "Update Product"}
                </button>
            </form>
        </div>
    );
}