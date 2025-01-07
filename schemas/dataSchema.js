const mongoose = require('mongoose');

// Define the item schema (for shirts, trousers, etc.)
const itemSchema =  mongoose.Schema({
  id: Number,
  type: String,
  discountPerc: Number,
  qty: Number,
  price: Number,
  discountPrice: Number,
  sizes: [String],
  image: String,
});

// Define the category schema
const categorySchema = mongoose.Schema({
    name: String,
  id: Number,
  details: [itemSchema], // Array of items within each category
});

const dataSchema = mongoose.Schema({
    categories:[],
    availableItems : [categorySchema]
})

// Create the model
module.exports =  new mongoose.model('itemData', dataSchema);
