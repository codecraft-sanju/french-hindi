const Product = require('../models/Product');
const Category = require('../models/Category');

// 1. Get all categories (For the home screen tabs)
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

// 2. Create a new category (Useful for initial database setup)
const createCategory = async (req, res) => {
  try {
    const { identifier, name, subtitle, icon, bgColor } = req.body;
    const category = await Category.create({ identifier, name, subtitle, icon, bgColor });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
};

// 3. Get all products (Supports search and category filtering for the frontend)
const getProducts = async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    // If the user types in the search bar
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // If the user clicks a specific category tab
    if (category) {
      const categoryDoc = await Category.findOne({ identifier: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    const products = await Product.find(query).populate('category', 'name identifier');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
};

// 4. Add a new product (Admin Panel)
const createProduct = async (req, res) => {
  try {
    const { name, categoryIdentifier, price, size, image, stock } = req.body;

    // Find the actual category ID based on the string sent from the frontend form
    const categoryDoc = await Category.findOne({ identifier: categoryIdentifier });
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category selected' });
    }

    const newProduct = await Product.create({
      name,
      category: categoryDoc._id,
      price,
      size: size || '1 pc', // Fallback if size isn't provided
      image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
      stock
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add product', error: error.message });
  }
};

// 5. Delete a product (Admin Panel)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedProduct = await Product.findByIdAndDelete(id);
    
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product removed from inventory successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  getProducts,
  createProduct,
  deleteProduct
};