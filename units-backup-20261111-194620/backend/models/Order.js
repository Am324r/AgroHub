const mongoose=require('mongoose');
module.exports=mongoose.model('Order',new mongoose.Schema({
 customer:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 requestKey:{type:String,required:true},
 phone:{type:String,required:true},address:{type:String,required:true},
 items:[{_id:false,product:mongoose.Schema.Types.ObjectId,name:String,category:String,quantity:Number,unitPrice:Number,lineTotal:Number,minWeightKg:Number,maxWeightKg:Number}],
 total:{type:Number,required:true},estimated:{type:Boolean,default:false},
 status:{type:String,enum:['processing','pending','confirmed','delivered','cancelling','cancelled','failed'],default:'processing'},
 failure:String
},{timestamps:true}).index({customer:1,requestKey:1},{unique:true}));
