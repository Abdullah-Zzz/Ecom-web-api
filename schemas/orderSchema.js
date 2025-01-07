const mongoose = require('mongoose')

const orderSchema = mongoose.Schema({
    name: {
        type:String,
        required : true
    },
    email:{
        type:String,
        required : true
    },
    address: {
        type:String,
        required : true
    },
    city: {
        type:String,
        required : true
    },
    phone: {
        type:Number,
        required : true
    },
    itemID : {
        type:Object,
        required:true
    },
    status : String,
    date : String
})

module.exports = new mongoose.model('orders', orderSchema)