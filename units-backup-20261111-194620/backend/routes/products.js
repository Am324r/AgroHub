const express=require('express');
const mongoose=require('mongoose');
const Product=require('../models/Product');
const {requireAuth,requireAdmin}=require('../middleware/auth');
const router=express.Router();
function valid(body){
 const {name,category,description='',price,quantity,minWeightKg,maxWeightKg}=body;
 const decimal=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&Math.abs(x*100-Math.round(x*100))<0.000001;
 if(typeof name!=='string'||!name.trim()||name.length>100||!['sheep','grass','seedling'].includes(category)||typeof description!=='string'||description.length>2000||!decimal(price)||!decimal(quantity))return null;
 if(category==='sheep'&&(!decimal(minWeightKg)||minWeightKg<=0||!decimal(maxWeightKg)||maxWeightKg<minWeightKg))return null;
 return {name:name.trim(),category,description,price,quantity,unit:'kg',...(category==='sheep'?{minWeightKg,maxWeightKg}:{})};
}
router.param('id',(req,res,next,id)=>mongoose.isValidObjectId(id)?next():res.status(400).json({message:'Invalid product ID'}));
router.get('/',async(req,res)=>{const filter={};if(req.query.category)filter.category=req.query.category;res.json(await Product.find(filter).select('-reservations').sort({createdAt:-1}));});
router.get('/:id',async(req,res)=>{const p=await Product.findById(req.params.id).select('-reservations');if(!p)return res.status(404).json({message:'Product not found'});res.json(p);});
router.post('/',requireAuth,requireAdmin,async(req,res)=>{const data=valid(req.body);if(!data)return res.status(400).json({message:'Enter kg price, kg stock (up to 2 decimals), and a valid sheep weight range'});const p=await Product.create(data);res.status(201).json(p);});
router.put('/:id',requireAuth,requireAdmin,async(req,res)=>{
 const data=valid(req.body);if(!data)return res.status(400).json({message:'Check kg price, stock and sheep weight range'});
 const old=await Product.findById(req.params.id);if(!old)return res.status(404).json({message:'Product not found'});
 // Reject a stale stock form instead of overwriting a checkout reservation.
 if(req.body.version!==old.__v)return res.status(409).json({message:'Stock changed. Refresh products, then edit again.'});
 const unset=data.category==='sheep'?{}:{minWeightKg:1,maxWeightKg:1};
 const p=await Product.findOneAndUpdate({_id:old._id,__v:old.__v},{$set:data,$unset:unset,$inc:{__v:1}},{new:true,runValidators:true}).select('-reservations');
 if(!p)return res.status(409).json({message:'Stock changed. Refresh products and try again.'});res.json(p);
});
router.delete('/:id',requireAuth,requireAdmin,async(req,res)=>{
 const p=await Product.findOneAndDelete({_id:req.params.id,'reservations.0':{$exists:false}});
 if(!p)return res.status(409).json({message:'Product missing or referenced by an order. Set available stock to zero instead.'});res.json({message:'Product deleted'});
});
module.exports=router;
