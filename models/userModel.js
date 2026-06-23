import mongoose from "mongoose";

const userModel = new mongoose.Schema({
    fullName:{
        type:String,
        required:true
    },
    username:{
      type:String,
      required:true,
      unique:true
    },
    email:{
      type:String,
      sparse:true,
      unique:true
    },
    password:{
        type:String,
        required:true
    },
    profilePhoto:{
        type:String,
        default:""
    },
    about:{
        type:String,
        default:"Available"
    },
    gender:{
        type:String,
        enum:["male", "female"],
        required:true
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: []
    }]
}, {timestamps:true});
export const User = mongoose.model("User", userModel);