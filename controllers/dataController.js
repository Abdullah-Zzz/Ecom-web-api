const dataSchema = require('../schemas/dataSchema')

const getItems = async (req,res) =>{
    try{
        const data  = await dataSchema.find()
        return res.status(200).json(data)
    }
    catch(err){
        return res.status(500).json({message : 'Internal Server Error'})
    }
}

module.exports = {
    getItems
}