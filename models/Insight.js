const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
    {
        user:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'User',
                required:true,
            },
        month:{
                type:Date,
                required:true,
            },
        type:{
                type:String,
                enum:['monthly_summary','saving_tip','forecast','anomaly_alert'],
                required:true,
            },
        summaryText: {
                type:String, 
                default:'',
            },
        tipText: {
                type:String,
                default:'',
            },
        relatedCategory: {
                type:mongoose.Schema.Types.ObjectId,
                ref:'Category',
                default:null,
            },
            impactScore: {
                type:Number,
                default:0,
            },
            isPinned: {
                type:Boolean,
                default:false,
            },
            isDismissed: {
                type:Boolean,
                default:false,
            },
            generatedAt: {
                type:Date,
                default: Date.now,
            },
    },
        { timestamps: true }
);

insightSchema.index({ user: 1, month: -1, type: 1 });
module.exports = mongoose.model('Insight', insightSchema);
