const express = require('express');
const mongoose = require('mongoose');
const Greenhouse = require('../models/Greenhouse');
const {requireAuth, requireAdmin} = require('../middleware/auth');
const router = express.Router();
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const fail = (res,message,code=400) => res.status(code).json({message});
const number = x => typeof x === 'number' && Number.isFinite(x);
router.param('id',(req,res,next,id) => mongoose.isValidObjectId(id) ? next() : fail(res,'Invalid greenhouse ID'));
router.param('rentalId',(req,res,next,id) => mongoose.isValidObjectId(id) ? next() : fail(res,'Invalid request ID'));
router.get('/',wrap(async(req,res) => {
 const houses = await Greenhouse.find().select('-rentals.customer -rentals.phone -rentals.notes -rentals.seedling -rentals.proposedShare -rentals.agreedShare -rentals.agreedMonthlyPrice -rentals.expectedMonthlyPrice').lean();
 res.json(houses.map(h => ({...h,rentals:undefined,bookings:h.rentals.filter(r=>r.status==='approved').map(r=>({startDate:r.startDate,endDate:r.endDate}))})));
}));
router.use(requireAuth);
router.get('/requests',wrap(async(req,res)=> {
 const houses = await Greenhouse.find(req.user.role === 'admin' ? {} : {'rentals.customer':req.user.id}).populate('rentals.customer','name email');
 res.json(houses.flatMap(h=>h.rentals.filter(r=>req.user.role==='admin'||String(r.customer?._id)===req.user.id).map(r=>({...r.toObject(),greenhouseId:h._id,greenhouseName:h.name}))));
}));
function fields(body) {
 const {name,size,monthlyPrice,status} = body;
 if(typeof name!=='string'||!name.trim()||name.trim().length>100||!number(size)||size<=0||!number(monthlyPrice)||monthlyPrice<0||!['available','busy','maintenance'].includes(status)) return null;
 return {name:name.trim(),size,monthlyPrice,status};
}
router.post('/',requireAdmin,wrap(async(req,res)=>{
 const data=fields(req.body); if(!data)return fail(res,'Enter a name, positive size, nonnegative price and valid status');
 res.status(201).json(await Greenhouse.create(data));
}));
router.put('/:id',requireAdmin,wrap(async(req,res)=>{
 const data=fields(req.body); if(!data)return fail(res,'Invalid greenhouse details');
 const h=await Greenhouse.findByIdAndUpdate(req.params.id,{$set:data},{new:true,runValidators:true});
 if(!h)return fail(res,'Greenhouse not found',404);res.json({message:'Greenhouse updated'});
}));
router.delete('/:id',requireAdmin,wrap(async(req,res)=>{
 // Keep request history: only unused greenhouses may be deleted.
 const h=await Greenhouse.findOneAndDelete({_id:req.params.id,'rentals.0':{$exists:false}});
 if(!h)return fail(res,'Greenhouse missing or has rental history; use maintenance instead',409);
 res.json({message:'Greenhouse deleted'});
}));
router.post('/:id/requests',wrap(async(req,res)=>{
 if(req.user.role!=='customer')return fail(res,'Only customers can request rentals',403);
 const {seedling,phone,notes='',durationMonths,proposedShare,startDate}=req.body;
 if(typeof seedling!=='string'||!seedling.trim()||seedling.trim().length>100||typeof phone!=='string'||!/^\+?[0-9 ()-]{7,20}$/.test(phone)||phone.replace(/\D/g,'').length<7||typeof notes!=='string'||notes.length>1000||!Number.isInteger(durationMonths)||durationMonths<1||durationMonths>24||!number(proposedShare)||proposedShare<0||proposedShare>100||typeof startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(startDate))return fail(res,'Check crop, phone, date, duration (1–24) and percentage (0–100)');
 const start=new Date(startDate+'T00:00:00Z');
 if(!Number.isFinite(+start)||start.toISOString().slice(0,10)!==startDate||startDate<new Date().toISOString().slice(0,10))return fail(res,'Choose today or a future date');
 // Clamp month-end dates rather than rolling into a second month.
 const end=new Date(start);end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+durationMonths);
 const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(start.getUTCDate(),last));
 const h=await Greenhouse.findById(req.params.id);if(!h)return fail(res,'Greenhouse not found',404);
 const rental={customer:req.user.id,seedling:seedling.trim(),phone,notes,durationMonths,proposedShare,startDate:start,endDate:end,expectedMonthlyPrice:h.monthlyPrice};
 const updated=await Greenhouse.findOneAndUpdate({_id:h._id,status:'available',rentals:{$not:{$elemMatch:{status:'approved',startDate:{$lt:end},endDate:{$gt:start}}}}},{$push:{rentals:rental}},{runValidators:true});
 if(!updated)return fail(res,'Greenhouse unavailable for these dates',409);
 res.status(201).json({message:'Request sent for discussion and approval'});
}));
router.patch('/:id/requests/:rentalId',wrap(async(req,res)=>{
 const {status,agreedShare,agreedMonthlyPrice}=req.body;
 const admin=req.user.role==='admin';
 if(admin ? !['approved','rejected'].includes(status) : status!=='cancelled')return fail(res,'Action not allowed',403);
 const h=await Greenhouse.findById(req.params.id);const r=h?.rentals.id(req.params.rentalId);
 if(!r)return fail(res,'Request not found',404);
 if(!admin&&String(r.customer)!==req.user.id)return fail(res,'Action not allowed',403);
 const query={_id:h._id,rentals:{$elemMatch:{_id:r._id,status:'pending'}}};
 const update={'rentals.$[target].status':status};
 if(status==='approved') {
 if(!number(agreedShare)||agreedShare<0||agreedShare>100||!number(agreedMonthlyPrice)||agreedMonthlyPrice<0)return fail(res,'Enter final monthly price and share (0–100)');
 if(r.startDate<new Date(new Date().toISOString().slice(0,10)))return fail(res,'Start date has passed; ask customer to submit new dates');
 query.status='available';
 query.$nor=[{rentals:{$elemMatch:{status:'approved',startDate:{$lt:r.endDate},endDate:{$gt:r.startDate}}}}];
 update['rentals.$[target].agreedShare']=agreedShare;update['rentals.$[target].agreedMonthlyPrice']=agreedMonthlyPrice;
 }
 // One atomic document update prevents two concurrent approvals from overlapping.
 const result=await Greenhouse.updateOne(query,{$set:update},{arrayFilters:[{'target._id':r._id,'target.status':'pending'}],runValidators:true});
 if(!result.modifiedCount)return fail(res,'Request changed or greenhouse unavailable; refresh and try again',409);
 res.json({message:'Request '+status});
}));
module.exports=router;
