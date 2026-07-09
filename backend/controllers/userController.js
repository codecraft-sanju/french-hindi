const User = require('../models/User');

// 1. Handle Google Login / Registration
const loginOrRegisterUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email });
    }

    res.status(200).json(user);
  } catch (error) {
    // Log the full error on the server side
    console.error("Auth error:", error.name, error.message, error.code);

    // Send back a more specific message to the client
    if (error.code === 11000) {
      return res.status(409).json({ message: 'User already exists with a conflicting key', detail: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', detail: error.message });
    }
    res.status(500).json({ message: 'Error authenticating user', error: error.message });
  }
};

// 2. Get User Profile (Includes addresses and wishlist)
const getUserProfile = async (req, res) => {
  try {
    // Note: Assuming you will have an auth middleware that sets req.user.id
    const userId = req.user.id; 
    
    // Populate the wishlist so frontend gets full product details, not just ObjectIds
    const user = await User.findById(userId).populate('wishlist');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// 3. Add a new delivery address
const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, street, city, state } = req.body;

    // Push the new address into the addresses array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { addresses: { fullName, phone, street, city, state } } },
      { new: true, runValidators: true } // new: true returns the updated document
    );

    res.status(200).json(updatedUser.addresses);
  } catch (error) {
    res.status(500).json({ message: 'Error adding address', error: error.message });
  }
};

// 4. Toggle Wishlist (Add or Remove product)
const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the product is already in the wishlist
    const isFavorited = user.wishlist.includes(productId);

    if (isFavorited) {
      // Remove it
      user.wishlist.pull(productId);
    } else {
      // Add it (addToSet prevents duplicates just in case)
      user.wishlist.addToSet(productId);
    }

    await user.save();
    
    // Return the updated wishlist
    res.status(200).json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Error updating wishlist', error: error.message });
  }
};

module.exports = {
  loginOrRegisterUser,
  getUserProfile,
  addAddress,
  toggleWishlist
};