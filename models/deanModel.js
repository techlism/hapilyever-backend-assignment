import mongoose from "mongoose";
const dean = new mongoose.Schema(
    {
        name:{
            type:String,
            required:[true,'A user must have a valid name'],
            trim:true
        },
        universityID:{
            type:String,
            unique:true,
            required:[true,'A user must have a university ID']
        },
        password:{
            type: String,
            required:[true,'Please enter a password'],
            select:false // This will ensure that it is not visible in the response that user gets
        },
        availableSlots:{
            type:Array,
            default:[]
        },
        pendingSlots:{
            type:Array,
            default:[]            
        },
        role:{
            type:String,
            default:"dean"
        }
    }
)
const deanSchema = mongoose.model('deanSchema',dean);
export default deanSchema;