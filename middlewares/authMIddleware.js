const jwt = require('jsonwebtoken')
const JWT_KEY = process.env.JWT_SECRET_KEY
const userSchema = require('../schemas/userSchema')

const auth = async (req,res,next) =>{
    try{
        const cookie = req.cookies.myCookie
        if(cookie){
            jwt.verify(String(cookie),JWT_KEY,async  (err,user)=>{
                if (err){
                    res.status(401).json({message:"Invalid Token"})
                }
                else{
                    const userDetails = await userSchema.findOne({email:user.email})
                    if (userDetails.token[0] == String(cookie)){
                        req.em = userDetails.email
                        next()
                    }
                    else{
                    res.status(401).json({message:"Invaliad Token"})
                }

                }
            })
        }
        else{
            res.status(404).json({message:"No cookie"})
        }
    }
    catch(err){
        res.status(500).json({message:"error while auth"+err})
    }
   
}



module.exports = {
    auth
}