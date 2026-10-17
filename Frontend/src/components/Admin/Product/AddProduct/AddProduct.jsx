import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddProduct.css";

// ======================================================
// API BASE URL
// ======================================================

const API_BASE_URL = "http://localhost/tajworld/Backend/backend";

// Product Add API
const PRODUCT_ADD_API =
    `${API_BASE_URL}/Product/ProductAdd.php`;

// Categories API
const CATEGORIES_API =
    `${API_BASE_URL}/Admin/manage_categories/get_categories.php`;


// ======================================================
// CONSTANTS
// ======================================================

const AVAILABLE_SIZES = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL"
];

const MAX_OTHER_IMAGES = 4;


// ======================================================
// COMPONENT
// ======================================================

export default function AddProduct() {

    const navigate = useNavigate();


    // ==================================================
    // CATEGORY STATES
    // ==================================================

    const [allCategories, setAllCategories] =
        useState([]);

    const [categories, setCategories] =
        useState([]);

    const [subcategories, setSubcategories] =
        useState([]);


    // ==================================================
    // FORM DATA
    // ==================================================

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

        size_options: [
            "S",
            "M",
            "L",
            "XL"
        ],

        delivery_charge: 0

    });


    // ==================================================
    // IMAGE STATES
    // ==================================================

    const [mainImage, setMainImage] =
        useState(null);

    const [otherImages, setOtherImages] =
        useState([]);


    // ==================================================
    // UI STATES
    // ==================================================

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");


    // ==================================================
    // FETCH CATEGORIES
    // ==================================================

    const fetchCategories = useCallback(async () => {

        try {

            setError("");

            const res =
                await axios.get(CATEGORIES_API);

            console.log(
                "Categories API Response:",
                res.data
            );


            if (
                res.data &&
                res.data.success &&
                Array.isArray(res.data.categories)
            ) {

                const fetchedCategories =
                    res.data.categories;


                setAllCategories(
                    fetchedCategories
                );


                const parentCategories =
                    fetchedCategories.map((category) => ({
                        id: category.id,
                        category_name:
                            category.category_name
                    }));


                setCategories(
                    parentCategories
                );


                // ------------------------------------------
                // DEFAULT CATEGORY
                // ------------------------------------------

                if (
                    parentCategories.length > 0
                ) {

                    setFormData((prev) => {

                        if (prev.category_id) {
                            return prev;
                        }

                        const firstCategory =
                            parentCategories[0];

                        const categoryId =
                            firstCategory.id.toString();

                        return {
                            ...prev,

                            category_id:
                                categoryId
                        };

                    });

                }

            } else {

                setError(
                    "Failed to fetch categories. Please check get_categories.php."
                );

            }

        } catch (err) {

            console.error(
                "Category Fetch Error:",
                err
            );

            setError(
                "Server error while fetching categories."
            );

        }

    }, []);


    // ==================================================
    // LOAD CATEGORIES
    // ==================================================

    useEffect(() => {

        fetchCategories();

    }, [fetchCategories]);


    // ==================================================
    // UPDATE SUBCATEGORIES
    // ==================================================

    useEffect(() => {

        if (
            !formData.category_id ||
            allCategories.length === 0
        ) {

            setSubcategories([]);

            return;
        }


        const selectedCategory =
            allCategories.find(
                (category) =>
                    category.id.toString() ===
                    formData.category_id.toString()
            );


        const newSubcategories =
            selectedCategory?.subcategories || [];


        setSubcategories(
            newSubcategories
        );


        // ------------------------------------------
        // Set first subcategory
        // ------------------------------------------

        setFormData((prev) => {

            const currentSubcategoryExists =
                newSubcategories.some(
                    (subcategory) =>
                        subcategory.id.toString() ===
                        prev.subcategory_id.toString()
                );


            if (
                currentSubcategoryExists
            ) {

                return prev;
            }


            return {

                ...prev,

                subcategory_id:
                    newSubcategories.length > 0
                        ? newSubcategories[0].id.toString()
                        : ""

            };

        });

    }, [
        formData.category_id,
        allCategories
    ]);


    // ==================================================
    // HANDLE FORM CHANGE
    // ==================================================

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;


        // ------------------------------------------
        // Price fields
        // ------------------------------------------

        if (
            name === "regular_price" ||
            name === "discount_price"
        ) {

            const regular =
                parseFloat(
                    name === "regular_price"
                        ? value
                        : formData.regular_price
                ) || 0;


            const discount =
                parseFloat(
                    name === "discount_price"
                        ? value
                        : formData.discount_price
                ) || 0;


            let percentage = 0;


            if (
                regular > 0 &&
                discount > 0 &&
                discount < regular
            ) {

                percentage =
                    Math.round(
                        (
                            (regular - discount) /
                            regular
                        ) * 100
                    );

            }


            setFormData((prev) => ({

                ...prev,

                [name]: value,

                discount_percentage:
                    percentage

            }));

            return;
        }


        // ------------------------------------------
        // Normal field
        // ------------------------------------------

        setFormData((prev) => ({

            ...prev,

            [name]: value

        }));

    };


    // ==================================================
    // HANDLE FILE CHANGE
    // ==================================================

    const handleFileChange = (
        e,
        type
    ) => {

        if (type === "mainImage") {

            const file =
                e.target.files?.[0] || null;


            setMainImage(file);

            return;
        }


        if (type === "otherImages") {

            const newFiles =
                Array.from(
                    e.target.files || []
                );


            setOtherImages((prevFiles) => {

                const combinedFiles = [
                    ...prevFiles,
                    ...newFiles
                ];


                // Remove duplicate file names
                const uniqueFiles =
                    combinedFiles.filter(
                        (file, index, array) =>
                            index ===
                            array.findIndex(
                                (item) =>
                                    item.name ===
                                    file.name &&
                                    item.size ===
                                    file.size
                            )
                    );


                return uniqueFiles.slice(
                    0,
                    MAX_OTHER_IMAGES
                );

            });


            // Same file আবার select করা যাবে
            e.target.value = "";

        }

    };


    // ==================================================
    // REMOVE OTHER IMAGE
    // ==================================================

    const removeOtherImage = (
        index
    ) => {

        setOtherImages(
            (prevFiles) =>
                prevFiles.filter(
                    (_, i) =>
                        i !== index
                )
        );

    };


    // ==================================================
    // SIZE CHANGE
    // ==================================================

    const handleSizeChange = (e) => {

        const {
            value,
            checked
        } = e.target;


        setFormData((prev) => {

            const newSizes = checked

                ? [
                    ...prev.size_options,
                    value
                ]

                : prev.size_options.filter(
                    (size) =>
                        size !== value
                );


            return {

                ...prev,

                size_options:
                    newSizes

            };

        });

    };


    // ==================================================
    // RESET FORM
    // ==================================================

    const resetForm = () => {

        setFormData((prev) => ({

            ...prev,

            product_name: "",

            product_code: "",

            regular_price: "",

            discount_price: "",

            discount_percentage: 0,

            stock: "",

            short_description: "",

            full_description: "",

            tags: "",

            delivery_charge: 0,

            size_options: [
                "S",
                "M",
                "L",
                "XL"
            ]

        }));


        setMainImage(null);

        setOtherImages([]);


        // Main image input reset
        const mainInput =
            document.getElementById(
                "main_image"
            );

        if (mainInput) {
            mainInput.value = "";
        }


        // Other image input reset
        const otherInput =
            document.getElementById(
                "other_images"
            );

        if (otherInput) {
            otherInput.value = "";
        }

    };


    // ==================================================
    // FORM SUBMIT
    // ==================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        setLoading(true);

        setMessage("");

        setError("");


        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !formData.product_name.trim() ||
            !formData.category_id ||
            !mainImage ||
            !formData.stock ||
            !formData.regular_price ||
            !formData.short_description.trim()
        ) {

            setError(
                "Product Name, Category, Main Image, Stock, Regular Price, and Short Description are required."
            );

            setLoading(false);

            return;
        }


        // ==================================================
        // FORM DATA
        // ==================================================

        const data =
            new FormData();


        // ------------------------------------------
        // Product name
        // ------------------------------------------

        data.append(
            "name",
            formData.product_name
        );


        // ------------------------------------------
        // Category
        // ------------------------------------------

        data.append(
            "category_id",
            formData.category_id
        );


        // ------------------------------------------
        // Subcategory
        // ------------------------------------------

        data.append(
            "subcategory_id",
            formData.subcategory_id || ""
        );


        // ------------------------------------------
        // Product code
        // ------------------------------------------

        data.append(
            "product_code",
            formData.product_code
        );


        // ------------------------------------------
        // Price
        // ------------------------------------------

        data.append(
            "price",
            formData.regular_price
        );


        data.append(
            "discount_price",
            formData.discount_price || ""
        );


        data.append(
            "discount_percentage",
            formData.discount_percentage
        );


        // ------------------------------------------
        // Stock
        // ------------------------------------------

        data.append(
            "stock",
            formData.stock
        );


        // ------------------------------------------
        // Description
        // ------------------------------------------

        data.append(
            "short_description",
            formData.short_description
        );


        data.append(
            "description",
            formData.full_description
        );


        // ------------------------------------------
        // Tags
        // ------------------------------------------

        data.append(
            "tags",
            formData.tags
        );


        // ------------------------------------------
        // Sizes
        // ------------------------------------------

        data.append(
            "size_options",
            JSON.stringify(
                formData.size_options
            )
        );


        // ------------------------------------------
        // Delivery charge
        // ------------------------------------------

        data.append(
            "delivery_charge",
            formData.delivery_charge
        );


        // ------------------------------------------
        // Main image
        // ------------------------------------------

        data.append(
            "main_image",
            mainImage
        );


        // ------------------------------------------
        // Other images
        // ------------------------------------------

        otherImages.forEach(
            (image) => {

                data.append(
                    "other_images[]",
                    image
                );

            }
        );


        // ==================================================
        // API REQUEST
        // ==================================================

        try {

            console.log(
                "Sending Product Add Request..."
            );


            const res =
                await axios.post(
                    PRODUCT_ADD_API,
                    data
                );


            console.log(
                "Product Add Response:",
                res.data
            );


            if (
                res.data &&
                res.data.success
            ) {

                setMessage(
                    res.data.message ||
                    "Product added successfully!"
                );


                resetForm();

            } else {

                setError(
                    res.data?.message ||
                    "Failed to add product."
                );

            }

        } catch (err) {

            console.error(
                "Add Product Error:",
                err
            );


            if (err.response) {

                console.error(
                    "Server Status:",
                    err.response.status
                );

                console.error(
                    "Server Response:",
                    err.response.data
                );


                setError(
                    `Server error (${err.response.status}). Check PHP API.`
                );

            } else if (err.request) {

                setError(
                    "Cannot connect to PHP server. Make sure XAMPP Apache is running."
                );

            } else {

                setError(
                    "Error while adding product."
                );

            }

        } finally {

            setLoading(false);

        }

    };


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="product-admin-container">


            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="admin-dashboard-header">

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/admin/dashboard"
                        )
                    }
                    className="back-btn"
                >
                    &larr; Back to Dashboard
                </button>


                <h2>
                    Add New Product 📦
                </h2>

            </div>


            {/* ==================================================
                FORM
            ================================================== */}

            <form
                onSubmit={handleSubmit}
                className="product-form"
            >


                {/* ==================================================
                    MESSAGES
                ================================================== */}

                {message && (

                    <div className="success-message">
                        {message}
                    </div>

                )}


                {error && (

                    <div className="error-message">
                        {error}
                    </div>

                )}


                {/* ==================================================
                    BASIC INFO
                ================================================== */}

                <fieldset>

                    <legend>
                        Basic Info
                    </legend>


                    <input
                        type="text"
                        name="product_name"
                        value={
                            formData.product_name
                        }
                        onChange={handleChange}
                        placeholder="Product Name *"
                        required
                    />


                    <select
                        name="category_id"
                        value={
                            formData.category_id
                        }
                        onChange={handleChange}
                        required
                    >

                        <option value="">
                            Select Category *
                        </option>


                        {categories.map(
                            (category) => (

                                <option
                                    key={category.id}
                                    value={category.id}
                                >
                                    {
                                        category.category_name
                                    }
                                </option>

                            )
                        )}

                    </select>


                    <select
                        name="subcategory_id"
                        value={
                            formData.subcategory_id
                        }
                        onChange={handleChange}
                    >

                        <option value="">
                            None (Optional)
                        </option>


                        {subcategories.map(
                            (subcategory) => (

                                <option
                                    key={subcategory.id}
                                    value={subcategory.id}
                                >
                                    {
                                        subcategory.subcategory_name
                                    }
                                </option>

                            )
                        )}

                    </select>


                    <input
                        type="text"
                        name="product_code"
                        value={
                            formData.product_code
                        }
                        onChange={handleChange}
                        placeholder="Product Code"
                    />

                </fieldset>


                {/* ==================================================
                    PRICE & STOCK
                ================================================== */}

                <fieldset>

                    <legend>
                        Price & Stock
                    </legend>


                    <input
                        type="number"
                        name="regular_price"
                        value={
                            formData.regular_price
                        }
                        onChange={handleChange}
                        placeholder="Regular Price (৳) *"
                        min="0"
                        step="0.01"
                        required
                    />


                    <input
                        type="number"
                        name="discount_price"
                        value={
                            formData.discount_price
                        }
                        onChange={handleChange}
                        placeholder="Discount Price (৳)"
                        min="0"
                        step="0.01"
                    />


                    <input
                        type="text"
                        value={
                            `Discount: ${formData.discount_percentage}%`
                        }
                        readOnly
                    />


                    <input
                        type="number"
                        name="stock"
                        value={
                            formData.stock
                        }
                        onChange={handleChange}
                        placeholder="Stock Quantity *"
                        min="0"
                        required
                    />


                    <input
                        type="number"
                        name="delivery_charge"
                        value={
                            formData.delivery_charge
                        }
                        onChange={handleChange}
                        placeholder="Delivery Charge (৳)"
                        min="0"
                        step="0.01"
                    />

                </fieldset>


                {/* ==================================================
                    DESCRIPTION
                ================================================== */}

                <fieldset>

                    <legend>
                        Description & Tags
                    </legend>


                    <textarea
                        name="short_description"
                        value={
                            formData.short_description
                        }
                        onChange={handleChange}
                        placeholder="Short Description *"
                        required
                    />


                    <textarea
                        name="full_description"
                        value={
                            formData.full_description
                        }
                        onChange={handleChange}
                        placeholder="Full Description"
                        rows="5"
                    />


                    <input
                        type="text"
                        name="tags"
                        value={
                            formData.tags
                        }
                        onChange={handleChange}
                        placeholder="Tags (comma separated)"
                    />

                </fieldset>


                {/* ==================================================
                    SIZE OPTIONS
                ================================================== */}

                <fieldset>

                    <legend>
                        Size Options
                    </legend>


                    <div className="size-options-wrapper">

                        {AVAILABLE_SIZES.map(
                            (size) => (

                                <label key={size}>

                                    <input
                                        type="checkbox"
                                        value={size}
                                        checked={
                                            formData.size_options.includes(
                                                size
                                            )
                                        }
                                        onChange={
                                            handleSizeChange
                                        }
                                    />

                                    {size}

                                </label>

                            )
                        )}

                    </div>

                </fieldset>


                {/* ==================================================
                    IMAGES
                ================================================== */}

                <fieldset>

                    <legend>
                        Images (সর্বোচ্চ ৫টি: ১টি মেইন + ৪টি অন্যান্য)
                    </legend>


                    {/* Main Image */}

                    <label>
                        Main Image * (
                        {
                            mainImage
                                ? mainImage.name
                                : "No file selected"
                        }
                        )
                    </label>


                    <input
                        type="file"
                        id="main_image"
                        accept="image/*"
                        onChange={(e) =>
                            handleFileChange(
                                e,
                                "mainImage"
                            )
                        }
                        required
                    />


                    {/* Other Images */}

                    <label>

                        Other Images
                        {" "}
                        (Optional,
                        Selected:
                        {" "}
                        {otherImages.length}
                        /
                        {MAX_OTHER_IMAGES})

                    </label>


                    <input
                        type="file"
                        id="other_images"
                        accept="image/*"
                        multiple
                        onChange={(e) =>
                            handleFileChange(
                                e,
                                "otherImages"
                            )
                        }
                        disabled={
                            otherImages.length >=
                            MAX_OTHER_IMAGES
                        }
                    />


                    {/* Selected Images */}

                    <div className="selected-other-images">

                        {otherImages.map(
                            (image, index) => (

                                <div
                                    key={`${image.name}-${image.size}-${index}`}
                                    className="image-tag"
                                >

                                    {image.name}


                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeOtherImage(
                                                index
                                            )
                                        }
                                        className="remove-img-btn"
                                    >
                                        &times;
                                    </button>

                                </div>

                            )
                        )}

                    </div>

                </fieldset>


                {/* ==================================================
                    SUBMIT
                ================================================== */}

                <button
                    type="submit"
                    disabled={loading}
                    className="add-btn"
                >

                    {loading
                        ? "Adding..."
                        : "Add Product"}

                </button>

            </form>

        </div>

    );

}