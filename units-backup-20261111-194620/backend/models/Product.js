const mongoose = require('mongoose');
const decimal = v => Number.isFinite(v) && v >= 0 && Math.abs(v * 100 - Math.round(v * 100)) < 0.000001;
const productSchema = new mongoose.Schema({
 name: {type:String,required:true,trim:true},
 category: {type:String,enum:['sheep','grass','seedling'],required:true},
 description: {type:String,trim:true,default:''},
 price: {type:Number,required:true,min:0,validate:decimal},
 quantity: {type:Number,required:true,min:0,validate:decimal},
 unit: {type:String,enum:['kg']},
 minWeightKg: {type:Number,min:0.01},
 maxWeightKg: {type:Number,min:0.01},
 reservations: [{_id:false,orderId:mongoose.Schema.Types.ObjectId,quantity:Number}]
},{timestamps:true});
module.exports=mongoose.model('Product',productSchema);
