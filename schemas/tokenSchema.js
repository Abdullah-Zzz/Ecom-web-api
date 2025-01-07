const mongoose = require('mongoose')

const tokenSchema = mongoose.Schema({
        token : {
            type :String
        }
})

module.exports = new mongoose.model('registertokens',tokenSchema)