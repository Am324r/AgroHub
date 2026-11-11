const express=require('express');
const mongoose=require('mongoose');
const Product=require('../models/Product');
const Order=require('../models/Order');
const {requireAuth,requireAdmin}=require('../middleware/auth');
const {release}=require('../services/orderStock');
const router=express.Router();router.use(requireAuth);
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
const error=(message,status=400)=>Object.assign(new Error(message),{status});
router.get('/',async(req,res)=>res.json(await Order.find(req.user.role==='admin'?{}:{customer:req.user.id}).populate('customer','name email').sort({createdAt:-1})));
router.post('/',async(req,res,next)=>{
 let order;
 try{
  if(req.user.role!=='customer')throw error('Only customers can place orders',403);
  const {items,phone,address,requestKey}=req.body;
  if(!Array.isArray(items)||!items.length||items.length>30||typeof phone!=='string'||!/^\+?[0-9 ()-]{7,20}$/.test(phone)||phone.replace(/\D/g,'').length<7||typeof address!=='string'||address.trim().length<8||address.length>500||typeof requestKey!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(requestKey))throw error('Check cart, phone and delivery address');
  const existing=await Order.findOne({customer:req.user.id,requestKey});
  if(existing){return res.status(existing.status==='processing'?409:existing.status==='failed'?400:200).json(existing.status==='processing'||existing.status==='failed'?{message:existing.status==='processing'?'This order is still being processed. Check My Orders before retrying.':'The earlier attempt failed. Review your cart and try again.'}:existing);}
  const seen=new Set();const lines=[];
  for(const item of items){
   if(!mongoose.isValidObjectId(item.productId)||seen.has(item.productId)||typeof item.quantity!=='number'||!Number.isFinite(item.quantity)||item.quantity<0.01||Math.abs(item.quantity*100-Math.round(item.quantity*100))>0.000001)throw error('Choose valid, unique products and quantities (up to 2 decimals)');
   seen.add(item.productId);
   const p=await Product.findById(item.productId);
   if(!p||!['kg','piece','bag','litre'].includes(p.unit))throw error('A product is not yet configured for sales',409);
   if((item.expectedUnit||'kg')!==p.unit)throw error('A product unit changed. Remove it and add it to the cart again.',409);
   if(['piece','bag'].includes(p.unit)&&!Number.isInteger(item.quantity))throw error('Piece and bag quantities must be whole numbers');
   if(p.price!==item.expectedPrice)throw error('A price changed. Refresh the shop and review your cart.',409);
   if(p.category==='sheep'&&(!p.minWeightKg||!p.maxWeightKg))throw error('Sheep weight range must be configured by admin',409);
   const lineTotal=money(p.price*item.quantity);
   if(!Number.isSafeInteger(Math.round(lineTotal*100)))throw error('Order amount is too large');
   lines.push({product:p._id,name:p.name,category:p.category,quantity:item.quantity,unit:p.unit,unitPrice:p.price,lineTotal,minWeightKg:p.minWeightKg,maxWeightKg:p.maxWeightKg});
  }
  const total=money(lines.reduce((sum,line)=>sum+line.lineTotal,0));
  if(!Number.isSafeInteger(Math.round(total*100)))throw error('Order amount is too large');
  order=await Order.create({customer:req.user.id,requestKey,phone,address:address.trim(),items:lines,total,estimated:lines.some(i=>i.category==='sheep')});
  for(const item of lines){
   const p=await Product.collection.findOneAndUpdate({_id:item.product,unit:item.unit,price:item.unitPrice,quantity:{$gte:item.quantity},'reservations.orderId':{$ne:order._id}},[{$set:{quantity:{$round:[{$subtract:['$quantity',item.quantity]},2]},__v:{$add:[{$ifNull:['$__v',0]},1]},updatedAt:new Date(),reservations:{$concatArrays:[{$ifNull:['$reservations',[]]},[{orderId:order._id,quantity:item.quantity}]]}}}],{returnDocument:'after'});
   if(!p)throw error(`Insufficient stock or changed price for ${item.name}. Refresh your cart.`,409);
  }
  order.status='pending';await order.save();res.status(201).json(order);
 }catch(err){
  if(order){try{await release(order);await Order.updateOne({_id:order._id,status:'processing'},{$set:{status:'failed',failure:err.message}});}catch(cleanup){return next(cleanup);}}
  if(err.code===11000)return res.status(409).json({message:'Order already submitted. Check My Orders.'});
  if(err.status)return res.status(err.status).json({message:err.message});next(err);
 }
});
router.patch('/:id/status',requireAdmin,async(req,res,next)=>{
 try{
  if(!mongoose.isValidObjectId(req.params.id))throw error('Invalid order ID');
  const {status}=req.body;const previous={confirmed:'pending',delivered:'confirmed',cancelled:'pending'}[status];
  if(!previous)throw error('Invalid order status');
  const order=await Order.findOneAndUpdate({_id:req.params.id,status:previous},{$set:{status:status==='cancelled'?'cancelling':status}},{new:true});
  if(!order)throw error('Order status changed; refresh and try again',409);
  if(status==='cancelled'){await release(order);order.status='cancelled';await order.save();}
  res.json(order);
 }catch(err){if(err.status)return res.status(err.status).json({message:err.message});next(err);}
});
module.exports=router;
