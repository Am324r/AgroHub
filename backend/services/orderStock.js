const Product=require('../models/Product');
const Order=require('../models/Order');
// Each reservation and its stock change are atomic in one product document.
async function release(order){
 for(const item of order.items){
  await Product.collection.updateOne({_id:item.product,reservations:{$elemMatch:{orderId:order._id,quantity:item.quantity}}},[{$set:{quantity:{$round:[{$add:['$quantity',item.quantity]},2]},__v:{$add:[{$ifNull:['$__v',0]},1]},updatedAt:new Date(),reservations:{$filter:{input:'$reservations',as:'reservation',cond:{$ne:['$reservation.orderId',order._id]}}}}}]);
 }
}
async function recoverOrders(){
 // Called before accepting HTTP traffic on this single-server lab application.
 const interrupted=await Order.find({status:{$in:['processing','cancelling']}});
 for(const order of interrupted){await release(order);order.status=order.status==='cancelling'?'cancelled':'failed';order.failure='Interrupted operation recovered; reserved stock restored.';await order.save();}
}
module.exports={release,recoverOrders};
