const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type:String,
            required:[true, 'Name is required'],
            trim:true,
        },
        email: {
            type:String,
            required:[true, 'Email is required'],
            unique:true,
            lowercase:true,
            trim:true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],

        },
        password:{
            type:String,
            required:[true, 'Password is required'],
            minlength:6,
            select:false,

        },
        role: {
        type:String,
        enum:['student', 'admin'],
        default:'student',
        },
        academicYear: {
        type:String,
        default:'',
        },
        monthlyAllowanceBaseline: {
        type:Number,
        default:0,
        },
        monthlySavingsGoal: {
        type:Number,
        default:0,
        },
        avatarUrl: {
        type:String,
        default:'',
        },
        resetPasswordToken: {
        type:String,
        select:false,
        },
        resetPasswordExpire: {
        type:Date,
        select:false,
        },
        isActive: {
        type:Boolean,
        default:true,
        },
        lastLoginAt: {
        type:Date,
        },
        
    },
{ timestamps: true } 
);

module.exports = mongoose.model('User', userSchema);