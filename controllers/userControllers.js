const userSchema = require('../schemas/userSchema')
const nodeMailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const JWT_KEY = process.env.JWT_SECRET_KEY
const EMAIL = process.env.EMAIL
const PASS = process.env.PASS
const CLIENT_URL = process.env.CLIENT_URL
const tokenSchema = require('../schemas/tokenSchema')
const dataSchema = require('../schemas/dataSchema')
const orderSchema = require('../schemas/orderSchema')
const Joi = require('joi')

function isValidEmail(email) {

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const handleRegister = async (req, res) => {
    try {

        const { name, email, password, phone } = req.body
        const joiSchema = Joi.object({
            phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
                'string.pattern.base': 'Phone number must be exactly 10 digits',  
                'string.empty': 'Phone number is required',  
                'any.required': 'Phone number is required',  
            }),
            username: Joi.string().alphanum().min(5).max(20).required().messages({
                'string.alphanum': 'Username must be alphanumeric',  
                'string.min': 'Username must be at least 5 characters long',  
                'string.max': 'Username must be no more than 20 characters long',  
                'string.empty': 'Username is required',  
                'any.required': 'Username is required',  
            }),
            password: Joi.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/).required().messages({
                'string.min': 'Password must be at least 8 characters long',  
                'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character',  
                'string.empty': 'Password is required',  
                'any.required': 'Password is required',  
            })
        });
        const {error,value} = joiSchema.validate({
            phone : phone,
            username : name,
            password : password,
        })
        if(error){
            return res.status(400).json({message : error.details[0].message})
        }
        const obj = {
            name: name,
            email: email,
            password, password,
            phone: phone
        }
        const data = new userSchema(obj)
        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL,
                pass: PASS
            }
        })
        await data.validate()
        const alreadyExists = await userSchema.findOne({ email: email })


        if (alreadyExists) {
            res.status(409).json({ message: "User already exists" })
        }
        else {
            if (isValidEmail(email)) {
                const currDate = Date.now()
                const TOKEN = jwt.sign(obj, JWT_KEY, {
                    expiresIn: '60min'
                })
                const mailOptions = {
                    from: EMAIL,
                    to: email,
                    subject: "Register Your Account On {NAME}",
                    text: `${CLIENT_URL}/register/link/${TOKEN}`
                }
                transporter.sendMail(mailOptions, async (err, info) => {
                    if (err) {
                        res.status(500).json({ message: 'Erorr while sending link' })
                    }
                    else {
                        await tokenSchema.create({
                            token: TOKEN
                        })
                        res.status(200).json({ message: "Link Sent" })
                    }
                })
            }
            else {
                res.status(409).json({ message: "Email is not valid" })
            }
        }
    }
    catch (err) {
        if (err.name == 'ValidationError') {
            return res.status(400).json({ message: 'Invalid data' })
        }
        res.status(500).json({ message: 'internal server error' + err })
    }
}

const handleRegisterLink = async (req, res) => {
    const token = req.params.token
    try {
        jwt.verify(String(token), JWT_KEY, async (err, user) => {
            if (err) {
                res.status(401).json({ message: "Invalid link" })
            }
            else {
                const checkToken = await tokenSchema.findOneAndDelete({ token: token })
                if (!checkToken) {
                    res.status(401).json({ message: "Invalid link" })
                }
                else {
                    const chkUser = await userSchema.findOne({ email: user.email })
                    if (chkUser) {
                        res.status(409).json({ message: "User already exists" })
                    }
                    else {
                        const data = new userSchema(user)
                        await data.save()
                        res.status(200).json({ message: "User Added" })
                    }

                }
            }
        })
    }
    catch (err) {
        res.status(500).json({ message: 'internal server error' })

    }

}

const handleLogin = async (req, res) => {
    try {
        const { email, password, cart } = req.body
        const cookie = req.headers.cookie
        const emailExists = await userSchema.findOne({ email: email })

        if (cookie) {
            res.status(401).json({ message: "Already Logged in" })
        }
        else {
            if (emailExists) {
                if (emailExists.password == password) {
                    const JWT_TOKEN = jwt.sign({ email: emailExists.email }, JWT_KEY, {
                        expiresIn: "10min"
                    })
                    res.setHeader('Set-Cookie', `myCookie=${JWT_TOKEN}; Max-Age=600; path=/;SameSite=None;Secure`)
                    await userSchema.findOneAndUpdate({ email: email }, { $set: { token:[JWT_TOKEN] } })
                    res.status(200).json({ message: "Logged in" })
                }
                else {
                    res.status(403).json({ message: 'Invalid password' })
                }
            }
            else {
                res.status(404).json({ message: "User not found." })
            }
        }

    }
    catch (err) {
        res.status(500).json({ message: 'internal server error' })
    }
}

const handleSendingUserInfo = async (req, res) => {
    try {
        const email = req.em
        const details = await userSchema.findOne({ email: email }).select('-password')
        res.status(200).json(details)
    }
    catch (err) {
        res.status(500).json({ message: 'internal server error' })

    }
}

const handleCheckout = async (req, res) => {
    try {
        const { name, address, city, phone, itemID } = req.body;
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); 
        const dd = String(today.getDate()).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2); 

        const formattedDate = `${mm}/${dd}/${yy}`;
        
        const email = req.em;
        const data = new orderSchema({
            name,
            email,
            address,
            city,
            phone,
            itemID,
            status:'processing',
            date : formattedDate
        });

        const joiSchema = Joi.object({
            username: Joi.string().alphanum().min(5).max(20).required().messages({
                'string.alphanum': 'Username must be alphanumeric',  
                'string.min': 'Username must be at least 5 characters long',  
                'string.max': 'Username must be no more than 20 characters long',  
                'string.empty': 'Username is required',  
                'any.required': 'Username is required',  
            }),
            phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
                'string.pattern.base': 'Phone number must be exactly 10 digits',  
                'string.empty': 'Phone number is required',  
                'any.required': 'Phone number is required',  
            }),
            address: Joi.string().min(10).max(150).required().messages({
                'string.empty' : 'address is required',
                'string.min': 'Please enter a valid address',  
                'string.max': 'Please enter a valid address',  
                'any.required': 'Username is required',  
            })
        })
        const {error,value} = joiSchema.validate({
            username:name,
            phone:phone,
            address:address
        })
        if(error){
            return res.status(400).json({message : error.details[0].message})
        }
        const productInfo = await dataSchema.findOne();

        const availableProdID = productInfo.availableItems.flatMap((item) =>
            item.details.map((val) => val.id)
        );
        await data.validate();

        if (itemID == {}) {
            return res.status(400).json({ message: "No Item." })
        }

        for (const [key, value] of Object.entries(itemID)) {

            if (value.qty < 0) {
                return res.status(400).json({ message: "Invalid quantity" });
            }
            if (!["sm", "xl", "lg","md"].includes(value.size.toLowerCase())) {
                return res.status(400).json({ message: "Invalid size" });
            }
            if (!availableProdID.includes(parseInt(key))) {
                return res.status(400).json({ message: "Invalid item ID" });
            }
        }
        await data.save()
        return res.status(200).json({ message: "order placed" })

    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: "Invalid data: " + err });
        }
        res.status(500).json({ message: "Internal server error: " + err });
    }
};

const trackOrders = async (req, res) => {
    try {
      const email = req.em; 
  
      const orders = await orderSchema.find({ email });
  
      const itemIDs = orders.flatMap((order) => 
        Object.keys(order.itemID).map((key) => Number(key))
      );
  
      const data = await dataSchema.findOne({
        'availableItems.details.id': { $in: itemIDs },
      });

      if (!data) {
        return res.status(404).json([]);
      }
      const orderedItems = [];
      data.availableItems.forEach((category) => {
        category.details.forEach((item) => {
          if (itemIDs.includes(item.id)) {
            orderedItems.push(item);
          }
        });
      });
      res.status(200).json({ orderedItems ,orders});
    } catch (err) {
      console.error("Error in trackOrders:", err);
      res.status(500).json({ message: "Internal server error: " + err.message });
    }
  };
  
const handleChangePassword = async (req,res) => {
    const {currentPass,newPass,confirmPass} = req.body
    const email = req.em
    const userDetails = await userSchema.findOne({email:email});

    const joiSchema = Joi.object({
        password: Joi.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/).required().messages({
            'string.min': 'Password must be at least 8 characters long',  
            'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character',  
            'string.empty': 'Password is required',  
            'any.required': 'Password is required',  
        })
    })
    const {error,value} = joiSchema.validate({
        password:newPass
    })
    
    if (newPass != confirmPass){
        return res.status(400).json({message:"Passwords donot match"});
    }
    if(newPass == currentPass){
        return res.status(400).json({message:"Please choose a password different from the current one"});
    }
    if(userDetails.password != currentPass){
        return res.status(401).json({message:"Invalid password"})
    }
    if(error){
        return res.status(400).json({message :error.details[0].message})
    }
    await userSchema.findOneAndUpdate({email:email},{ $set : { password:newPass }})
    return res.status(200).json({message:"Password Changed"});

}

const handleLogout  = async (req,res) =>{
    try{
        const email = req.em
        await userSchema.findOneAndUpdate({email:email}, {$set : {token : []}})
        res.clearCookie('myCookie',{path:'/'})
        return res.status(200).json({message:"Logged out"});

    }
    catch(err){
      res.status(500).json({ message: "Internal server error: " + err.message });
        
    }
}
const handleSendingResetLink = async (req,res) => {
    try{
        const {email} = req.body;
        const userExists = await userSchema.findOne({email:email})
        if (!userExists){
            return res.status(404).json({message:"User Not Found."})
        }
        const TOKEN  = jwt.sign({email:email} ,JWT_KEY,{
            expiresIn : "60min"
        })
        const mailOptions = {
            from : EMAIL,
            to : email,
            subject : "Reset Your Pass on {name}",
            text : `${CLIENT_URL}/resetpass/link/${TOKEN}`
        }
        const transporter = nodeMailer.createTransport({
            service : "gmail",
            auth :{
                user : EMAIL,
                pass : PASS
            }
        })
        transporter.sendMail(mailOptions,async (err,info) =>{
            if(err){
                res.status(409).json({message:"An error occured while sending the mail please try again."})
            }
            else{
                await userSchema.findOneAndUpdate({email:email},{$set : {resetToken: [TOKEN]}})
                res.status(200).json({message:"Email Sent"})
            }   
        })
    }
    catch(err){
      res.status(500).json({ message: "Internal server error: " + err.message });
    }
}

const handleResetLink = async (req,res) =>{
    try{
        const token  = req.params.token
        const {pass,confirmPass} = req.body
        let email;

        if(String(pass) != String(confirmPass)){
            return res.status(409).json({message:"passwords donot match"});
        }

        jwt.verify(String(token),JWT_KEY,(err,info)=>{
            if(err){
                email = ''
            }
            else{
                email = info.email
            }
        })
        if(!email){
            return res.status(401).json({message:"Invalid Token"})
        }
        const userDetails = await userSchema.findOne({email:email})
        if(userDetails.resetToken[0] != token){
            return res.status(401).json({message:"Invalid Token"})
        }

        const joiSchema = Joi.object({
            password: Joi.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/).required().messages({
                'string.min': 'Password must be at least 8 characters long',  
                'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character',  
                'string.empty': 'Password is required',  
                'any.required': 'Password is required',  
            })
        })
        const {error,value} = joiSchema.validate({
            password:pass
        })
        if(error){
            return res.status(409).json({message:error.details[0].message})
        }
        if(userDetails.password == pass){
            return  res.status(409).json({message:"Password same as the old password"})
        }
        await userSchema.findOneAndUpdate({email : email},{$set : {password:pass}})
        await userSchema.findOneAndUpdate({email : email},{$set : {resetToken:[]}})
        return res.status(200).json({message:"password changed"})
    }
    catch(err){
        return  res.status(500).json({ message: "Internal server error: " + err.message });
    }
}
const chkResetLink = async (req,res) =>{
    try{
        const token  = req.params.token
        let email;
        jwt.verify(String(token),JWT_KEY,(err,info)=>{
            if(err){
                email = ''
            }
            else{
                email = info.email
            }
        })
        if(!email){
            return res.status(401).json({message:"Invalid Token"})
            
        }
        const userDetails = await userSchema.findOne({email:email})
        if(userDetails.resetToken[0] != token){
            return res.status(401).json({message:"Invalid Token"})
        }
        return res.status(200).json({message:"OK"})

    }
    catch(err){
        return  res.status(500).json({ message: "Internal server error: " + err.message });
    }
}
const handleChangePhone = async (req,res) =>{
    try{

    const {phone} = req.body
    const email = req.em
    const joiSchema = Joi.object({
        phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
            'string.pattern.base': 'Phone number must be exactly 10 digits and must only contain numbers',  
            'string.empty': 'Phone number is required',  
            'any.required': 'Phone number is required',  
        })
    })
    const {error,value} = joiSchema.validate({
        phone:phone
    })
    if (error){
        return res.status(401).json({message:error.details[0].message})
    }
    await userSchema.findOneAndUpdate({email:email},{$set : {phone:phone}})
    return res.status(200).json({message:"Phone Number changed"})

    }
    catch(err){
        return  res.status(500).json({ message: "Internal server error: " + err.message });
    }

}
const handleChangeName = async (req,res) =>{
    try{
        const {name} = req.body
        const email = req.em
        const joiSchema = Joi.object({
            username: Joi.string().alphanum().min(5).max(20).required().messages({
                'string.alphanum': 'Username must be alphanumeric',  
                'string.min': 'Username must be at least 5 characters long',  
                'string.max': 'Username must be no more than 20 characters long',  
                'string.empty': 'Username is required',  
                'any.required': 'Username is required',  
            })
        })
      const {error,value} = joiSchema.validate({
            username:name
        })
        if (error){
            return res.status(401).json({message:error.details[0].message})
        }
        await userSchema.findOneAndUpdate({email:email},{$set : {name:name}})
        return res.status(200).json({message:"Name changed"})
        }
        catch(err){
            return  res.status(500).json({ message: "Internal server error: " + err.message });
        }
    
}
const handleCancelOrder =async (req,res) =>{
  try{
    const email = req.em;
    const orderID = req.params.id;
    const order = await orderSchema.findById(orderID)

    if(!order){
        return res.status(404).json({message:"No orders."})
    } 
    if(email != order.email){
        return res.status(401).json({message:"Not yours to delete"})
    }
    await orderSchema.findOneAndDelete({_id:orderID})
    return res.status(200).json({message:"Order Deleted"})
  }catch(err){
    return  res.status(500).json({ message: "Internal server error: " + err.message });
  }

}


module.exports = {
    handleRegister,
    handleLogin,
    handleRegisterLink,
    handleSendingUserInfo,
    handleCheckout,
    trackOrders,
    handleChangePassword,
    handleLogout,
    handleSendingResetLink,
    handleResetLink,
    chkResetLink,
    handleChangePhone,
    handleChangeName,
    handleCancelOrder
}
