const mongoose = require('mongoose')

const userModel = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    phone:{
        type:String,
        required:true
    },
    token : {
        type :Array,
        required : true
    },
    resetToken : {
        type:Array
    }
})

module.exports = new mongoose.model('userInfo',userModel)