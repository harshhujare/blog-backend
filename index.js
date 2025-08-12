require('dotenv').config();
const express= require("express");
const connectDb =require("./connection/connect")
const cors = require("cors");
const cookieParser = require('cookie-parser');
const multerconfig=require("./config/multerconfig");
const userRoute=require("./routes/user");
const authRoute=require("./routes/checkcookieRoutes");
const imgroute=require("./routes/image");
const blogroute=require("./routes/blog")
const app=express();
const PORT = process.env.PORT || 8000;
app.set('trust proxy', 1);
app.use(cookieParser());
app.use('/public', express.static('public')); 

connectDb(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smpleBlog');

const allowedOrigins = (process.env.CLIENT_URL ? process.env.CLIENT_URL : 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use ('/user',userRoute);
app.use('/auth',authRoute);
app.use('/profile',imgroute); 
app.use('/blog',blogroute);
app.listen(PORT,()=>console.log(`server is started on port ${PORT}`));