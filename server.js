const express = require('express');
const DB_CONNECT = require('./db');
require('dotenv').config()
const cors = require('cors')
const userRoute = require('./routes/userRoutes') 
const infoRoute = require('./routes/infoRoutes') 
// const orderRoute = require('./routes/orderRoutes') 
const cookieParser = require('cookie-parser');


const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: "Invalid JSON format" });
    }
    next();
});
app.use(cors({
    origin : 'https://stylehaven.vercel.app',
    credentials : true
}))
app.use(cookieParser());


app.use('/api/users',userRoute)
app.use('/api/data', infoRoute)
// app.use('/api/orders',orderRoute)


DB_CONNECT
app.listen(PORT, ()=>{
    console.log(`server started : http://localhost:${PORT}/`)
})