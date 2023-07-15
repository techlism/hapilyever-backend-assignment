import deanSchema from "../models/deanModel.js";
import studentSchema from "../models/studentModel.js";
import jwt from 'jsonwebtoken' ;
import dotenv from 'dotenv';
dotenv.config({path:'./config.env'});
import * as util from 'util'
import bcrypt from 'bcrypt';

const signToken = (id) => {
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRES
    });   //payload - all the data(in form of an object) that we want to carry with jwt (in general an unique id)
    //token is an javascript object        
}

const hashPass = async (password) =>{
    return await bcrypt.hash(password,10); // 10 indicates how cpu intensive the hashing should be
}

const comparePass = async (originalPass, enteredPass)=>{
    return await bcrypt.compare(enteredPass,originalPass);
}

const signup = async (request,response,next)=>{
    try {
        let newUser;
        
        if(request.body.role==='student'){
            newUser = await studentSchema.create({
                name:request.body.name,
                universityID:request.body.universityID,
                password:await hashPass(request.body.password)
            }); // We are explicitly defining all the data that we need so that no one should alter thier scope (role)
        }
        else if(request.body.role==='dean'){
            newUser= await deanSchema.create({
                name:request.body.name,
                universityID:request.body.universityID,
                password:await hashPass(request.body.password),
                availableSlots:request.body.availableSlots ? request.body.availableSlots : []            
            });
        }
        if(!newUser) next(new Error('User must have a defined role'))
        
        const token = signToken(newUser._id);
        response.status(201).json({
            data:{
                token,
                // for the signup we have directly logged in the user (sent jwt)
                user:{
                    name : newUser.name,
                    universityID: newUser.universityID
                }
            }
        });
        next();
    } 
    catch (error) {
        response.status(401).json({
            Error:`Unable to Signup ${error.message}`
        })
    }

}

const findUserbyToken = async (token)=>{
    const decoded = await util.promisify(jwt.verify)(token,process.env.JWT_SECRET);
    let loggedInUser;
    loggedInUser = await studentSchema.findById(decoded.id);
    return loggedInUser;
}

const login = async (request,response,next)=>{
    try {
        const {universityID,password} = request.body;
        // 1. Check if email and password are not empty
    
        if(!universityID || !password){
            response.status(400);
            next(new Error("Please enter valid ID and password"));
        }
    
        // 2. Check if user exists && password is correct (How to check the password ? Just encrypt the entered one then we can compare it the original encrypted one)
        let user ;
        user = await studentSchema.findOne({universityID}).select('+password'); // we are explicitly selecting our password
        if(!user) user = await deanSchema.findOne({universityID}).select('+password'); // If user is not a Student then search for Deans
        if(!user || !(await comparePass(password,user.password))){
            next(new Error('Incorrect university ID or password'));
        }
        // 3. If everything is okay, send the jwt to the client
        const token = signToken(user._id);
        response.status(200).json({
            token
        });        
    } catch (error) {
        response.status(404);
        response.json(error.message);
    }

}

// This is a middleware function to check user is authenticated or not to access the proctected routes

const protect = async function(request,response,next){
    try {
        // Getting the token
        let token;
        // http headers allow the client and the server to pass additional information with an http request/response.
        if(request.headers.authorization && request.headers.authorization.startsWith('Bearer')){
            token = request.headers.authorization.split(' ')[1]; // Bearer TOKEN
        }
        // console.log(token);
        if(!token){
            response.status(401).json({
                Unauthorized:"You are not logged in"
            })
            return;
        }
        // Validating the token (Verification) - It is an Object
        const decoded = await util.promisify(jwt.verify)(token,process.env.JWT_SECRET);
        
        // Check if user still exist (basically the account still exists or not) using the id
        let loggedInUser;
        loggedInUser = await studentSchema.findById(decoded.id);
        if(!loggedInUser) loggedInUser = await deanSchema.findById(decoded.id);
        // Still no user found user is logged out or never logged in 
        if(!loggedInUser) next(new Error('User does not exist'));
    
        request.user = loggedInUser ; // granted permission
        next(); //Finally user can access next route (protected)        
    } 
    catch (error) {
       response.status(401).json({
        errorName:error.name,
        message:error.message
       });
    }
}

const slots = async (request,response,next)=>{
    try {
        const users = await deanSchema.find();
        const allSlots = users.map((user) => ({
          deanName: user.name,
          slots: user.availableSlots.flat()
        }
        ));
        if(!allSlots) next(new Error('There are no available slots at this moment'));
        response.status(200).json(allSlots);        
    } catch (err) {
        response.status(404).json({
            error:"Cannot fetch slots",
            message:err.message
        })
    }
}

const bookSlot = async (request,response)=>{
    try {
        let token
        if(request.headers.authorization && request.headers.authorization.startsWith('Bearer')){
            token = request.headers.authorization.split(' ')[1]; // Bearer TOKEN
        }
        const student =await findUserbyToken(token);
        if(!student){
            next(new Error('No Student found'));
        }      
        const users = await deanSchema.find();
        const allSlots = users.map((user) => ({
          deanName: user.name,
          slots: user.availableSlots.flat()
        }));
        const selectedDean = allSlots.filter(slot=>slot.deanName===request.body.deanName)[0];
        const selectedSlot = selectedDean.slots[Number(request.body.slotNumber)-1];
       
        const dean = await deanSchema.findOne({name:selectedDean.deanName});
        const updatedSlot = dean.availableSlots.filter(slot=>{
            return JSON.stringify(slot) !== JSON.stringify(selectedSlot);

        })
        console.log(updatedSlot);
        dean.availableSlots=updatedSlot;
        dean.save();
        // Find the user and allocate the slot to that user.
        student.bookedSlots = [...student.bookedSlots,selectedSlot];
        student.save();
        response.status(200);
        response.json({bookedSlot : student.bookedSlots});
    } catch (err) {
        response.status(404).json({
            message:'Unable to Book Slot',
            error:err.message
        })
    }
}

export {signup,login,protect,slots,bookSlot};