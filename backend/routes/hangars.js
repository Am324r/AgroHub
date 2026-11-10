const express = require('express');
const mongoose = require('mongoose');
const Hangar = require('../models/Hangar');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (res, message, code = 400) => res.status(code).json({ message });
const number = x => typeof x === 'number' && Number.isFinite(x);
const today = () => new Date().toISOString().slice(0, 10);
const money = n => Math.round((n + Number.EPSILON) * 100) / 100;
const reserved = ['approved', 'completed'];
for (const param of ['id', 'rentalId']) {
    router.param(param, (req, res, next, value) => mongoose.isValidObjectId(value) ? next() : fail(res, 'Invalid ' + param));
}
router.get('/', wrap(async (req, res) => {
    const hangars = await Hangar.find().lean();
    res.json(hangars.map(h => ({
        _id: h._id, name: h.name, maxSheep: h.maxSheep,
        monthlyPrice: h.monthlyPrice, caretakerPercent: h.caretakerPercent,
        feedingPercent: h.feedingPercent, status: h.status,
        bookings: h.rentals.filter(r => reserved.includes(r.status)).map(r => ({ startDate: r.startDate, endDate: r.endDate }))
    })));
}));
router.use(requireAuth);
router.get('/requests', wrap(async (req, res) => {
    const admin = req.user.role === 'admin';
    const hangars = await Hangar.find(admin ? {} : { 'rentals.customer': req.user.id }).populate('rentals.customer', 'name email');
    res.json(hangars.flatMap(h => h.rentals.filter(r => admin || String(r.customer?._id) === String(req.user.id)).map(r => ({ ...r.toObject(), hangarId: h._id, hangarName: h.name }))));
}));
function fields(body) {
    const { name, maxSheep, monthlyPrice, caretakerPercent, feedingPercent, status } = body;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || !Number.isInteger(maxSheep) || maxSheep < 1 || !number(monthlyPrice) || monthlyPrice < 0 || !number(caretakerPercent) || caretakerPercent < 0 || !number(feedingPercent) || feedingPercent < 0 || caretakerPercent + feedingPercent > 100 || !['available', 'busy', 'maintenance'].includes(status)) return null;
    return { name: name.trim(), maxSheep, monthlyPrice, caretakerPercent, feedingPercent, status };
}
router.post('/', requireAdmin, wrap(async (req, res) => {
    const data = fields(req.body);
    if (!data) return fail(res, 'Check hangar details. Combined percentages must not exceed 100%.');
    const h = await Hangar.create(data);
    res.status(201).json({ message: 'Hangar added', id: h._id });
}));
router.put('/:id', requireAdmin, wrap(async (req, res) => {
    const data = fields(req.body);
    if (!data) return fail(res, 'Check hangar details. Combined percentages must not exceed 100%.');
    const h = await Hangar.findOneAndUpdate({ _id: req.params.id, rentals: { $not: { $elemMatch: { status: { $in: ['pending', 'approved'] }, endDate: { $gt: new Date(today()) }, sheepCount: { $gt: data.maxSheep } } } } }, { $set: data }, { runValidators: true });
    if (!h) return fail(res, 'Hangar missing or capacity is below an existing rental request', 409);
    res.json({ message: 'Hangar updated' });
}));
router.delete('/:id', requireAdmin, wrap(async (req, res) => {
    const h = await Hangar.findOneAndDelete({ _id: req.params.id, 'rentals.0': { $exists: false } });
    if (!h) return fail(res, 'Hangar missing or has rental history. Use maintenance instead.', 409);
    res.json({ message: 'Hangar deleted' });
}));
router.post('/:id/requests', wrap(async (req, res) => {
    if (req.user.role !== 'customer') return fail(res, 'Only customers can rent a hangar', 403);
    const { sheepCount, phone, startDate, durationMonths, feeding, acceptedTerms, notes = '', quotedMonthlyPrice, quotedCaretakerPercent, quotedFeedingPercent } = req.body;
    if (!Number.isInteger(sheepCount) || sheepCount < 1 || typeof phone !== 'string' || !/^\+?[0-9 ()-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7 || typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 24 || typeof feeding !== 'boolean' || acceptedTerms !== true || typeof notes !== 'string' || notes.length > 1000 || !number(quotedMonthlyPrice) || quotedMonthlyPrice < 0 || !number(quotedCaretakerPercent) || quotedCaretakerPercent < 0 || !number(quotedFeedingPercent) || quotedFeedingPercent < 0 || quotedCaretakerPercent + quotedFeedingPercent > 100) return fail(res, 'Check sheep count, phone, dates, duration and acceptance of terms');
    const start = new Date(startDate + 'T00:00:00Z');
    if (!Number.isFinite(+start) || start.toISOString().slice(0, 10) !== startDate || startDate < today()) return fail(res, 'Choose today or a future date');
    const end = new Date(start);
    end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + durationMonths);
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(start.getUTCDate(), last));
    // Match the terms the customer accepted; never silently apply new prices.
    const h = await Hangar.findOneAndUpdate({
        _id: req.params.id, status: 'available', maxSheep: { $gte: sheepCount },
        monthlyPrice: quotedMonthlyPrice, caretakerPercent: quotedCaretakerPercent, feedingPercent: quotedFeedingPercent,
        rentals: { $not: { $elemMatch: { status: { $in: reserved }, startDate: { $lt: end }, endDate: { $gt: start } } } }
    }, { $push: { rentals: {
        customer: req.user.id, sheepCount, phone, notes, startDate: start, endDate: end,
        durationMonths, feeding, monthlyPrice: quotedMonthlyPrice,
        caretakerPercent: quotedCaretakerPercent, feedingPercent: quotedFeedingPercent
    } } }, { runValidators: true });
    if (!h) return fail(res, 'Hangar unavailable, capacity exceeded, or terms changed. Refresh and try again.', 409);
    res.status(201).json({ message: 'Rental request sent for admin approval' });
}));
router.patch('/:id/requests/:rentalId', wrap(async (req, res) => {
    const { status, totalProfit } = req.body;
    const admin = req.user.role === 'admin';
    if (admin ? !['approved', 'rejected', 'completed'].includes(status) : status !== 'cancelled') return fail(res, 'Action not allowed', 403);
    const h = await Hangar.findById(req.params.id);
    const r = h?.rentals.id(req.params.rentalId);
    if (!r) return fail(res, 'Rental request not found', 404);
    if (!admin && String(r.customer) !== String(req.user.id)) return fail(res, 'Action not allowed', 403);
    const previous = status === 'completed' ? 'approved' : 'pending';
    const query = { _id: h._id, rentals: { $elemMatch: { _id: r._id, status: previous } } };
    const update = { 'rentals.$[target].status': status };
    if (status === 'approved') {
        if (r.startDate < new Date(today())) return fail(res, 'Start date has passed. Ask the customer to submit new dates.');
        query.status = 'available'; query.maxSheep = { $gte: r.sheepCount };
        query.$nor = [{ rentals: { $elemMatch: { status: { $in: reserved }, startDate: { $lt: r.endDate }, endDate: { $gt: r.startDate } } } }];
    }
    if (status === 'completed') {
        if (r.endDate > new Date(today())) return fail(res, 'Complete this rental on or after its end date');
        if (!number(totalProfit) || totalProfit < 0) return fail(res, 'Enter a nonnegative final profit');
        const profit = money(totalProfit);
        const farmShare = money(profit * (r.caretakerPercent + (r.feeding ? r.feedingPercent : 0)) / 100);
        update['rentals.$[target].totalProfit'] = profit;
        update['rentals.$[target].farmProfitShare'] = farmShare;
        update['rentals.$[target].customerProfitShare'] = money(profit - farmShare);
        update['rentals.$[target].totalRent'] = money(r.monthlyPrice * r.durationMonths);
    }
    // The conflict check and approval are one atomic document operation.
    const result = await Hangar.updateOne(query, { $set: update }, { arrayFilters: [{ 'target._id': r._id, 'target.status': previous }], runValidators: true });
    if (!result.modifiedCount) return fail(res, 'Request changed or hangar unavailable. Refresh and try again.', 409);
    res.json({ message: 'Rental ' + status });
}));
module.exports = router;
