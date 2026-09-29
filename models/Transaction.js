const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
      user: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },  
    category: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required:true,
    },
    type: {
        type:String,
        enum:['income', 'expense'],
        required:true,
    },
    amount: {
        type:Number,
        required:[true, 'Amount is required'],
        min:[0, 'Amount cannot be negative'],
    },
    description: {
        type:String,
        trim:true,
        default:'',
    },
    date: {
        type:Date,
        required:true,
        default:Date.now,
    },


    aiSuggestedCategory: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        default:null,
    },
    wasAiSuggestionAccepted: {
        type:Boolean,
        default:null, 
    },


    isRecurring: {
        type:Boolean,
        default:false,
    },
    recurrence: {
      frequency: {
            type:String,
            enum:['weekly', 'monthly', null],
            default:null,
      },
      nextRunDate: {
            type:Date,
            default:null,
      },
    },


    source: {
            type:String,
            enum:['manual', 'csv_import', 'recurring_auto'],
            default:'manual',
    },
    isFlaggedAnomaly: {
            type:Boolean,
            default:false, 
    },
    anomalyReason: {
        type:String,
        default:'',
    },

    },
    { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });

 
module.exports = mongoose.model('Transaction', transactionSchema);