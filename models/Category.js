const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
        {
         name: {
            type:String,
            required:[true, 'Category name is required'],
            trim:true,
        },  
        type: {
            type: String,
            enum: ['income', 'expense'],
            required: true,
        }, 
        isDefault:{
            type:Boolean,
            default:false,
        },
        user: {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            default:null, 
        },
        icon: {
            type:String,
            default:'',
        },
        color: {
            type:String,
            default:'#6366F1',
        },
           
        },
        {timestamps: true }
    );

 categorySchema.index({ name: 1, type: 1, user: 1 }, { unique: true });   

 module.exports = mongoose.model('Category', categorySchema);