import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    name:{
        type:String,
    },
    userName:{
        type:String,
        required:true,
        unique:true
    },
    github:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },    image:{
        type:String,
        default:""
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away', 'busy'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    // Password reset fields
    passwordResetCode: {
        type: String,
        select: false // Don't include in queries by default
    },
    passwordResetExpiry: {
        type: Date,
        select: false
    },
    passwordResetAttempts: {
        type: Number,
        default: 0,
        select: false
    }
},{timestamps:true})

const User=mongoose.model("User",userSchema)

export default User