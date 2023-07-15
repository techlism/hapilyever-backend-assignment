import express, { response } from "express";
import dotenv from 'dotenv';
import mongoose from "mongoose";

// our own modules
import {signup,login,protect,slots,bookSlot} from './controller/controller.js';

dotenv.config({path:'./config.env'});

const app = express();

mongoose.connect(process.env.DB_CONNECTION,{
    useNewUrlParser:true,
    // useCreateIndex:true,
    // useFindAndModify:false,
    useUnifiedTopology:true
}).then(()=>{
    console.log('Connected to DB');
}).catch(err=>{
    console.log(`Error in Connecting to DB : ${err.message}`);
});

app.use(express.json());

const Router = express.Router(); // Route handlers are like middlewares

Router.post('/signup', signup);
Router.post('/login', login); 
Router.get('/slots', protect,slots);
Router.post('/slots/book', bookSlot);
app.use(Router);

app.listen(process.env.PORT,()=>{
    console.log(`Server running on port ${process.env.PORT}`);
})