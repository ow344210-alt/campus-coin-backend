const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
    {
        user: {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        month: {
            type:Date,
            required: true,
    },
    limitAmount: {
            type:Number,
            required:[true, 'Budget limit is required'],
            min:[0, 'Limit cannot be negative'],
        },
    alertThresholdPercent: {
            type:Number,
            default:80, 
        },
    alertSent: {
            type:Boolean,
            default:false,
        },
    exceededSent: {
            type:Boolean,
            default:false,
        },

    },
    { timestamps: true }
);

budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
