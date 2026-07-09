const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  getProducts,
  createProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/categories', getCategories);
router.post('/categories', protect, admin, createCategory);

router.get('/', getProducts);
router.post('/', protect, admin, createProduct);
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;