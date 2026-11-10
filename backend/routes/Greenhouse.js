const express = require("express");
const mongoose = require("mongoose");

const Greenhouse = require("../models/Greenhouse");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Pass async errors to the central error handler.
const wrap = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

function fail(res, message, code = 400) {
    return res.status(code).json({ message });
}

function isNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

router.param("id", (req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) {
        return fail(res, "Invalid greenhouse ID");
    }

    next();
});

router.param("rentalId", (req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) {
        return fail(res, "Invalid request ID");
    }

    next();
});

// Public inventory: never expose customer details.
router.get(
    "/",
    wrap(async (req, res) => {
        const houses = await Greenhouse.find()
            .select(
                "-rentals.customer -rentals.phone -rentals.notes " +
                "-rentals.seedling -rentals.proposedShare " +
                "-rentals.agreedShare -rentals.agreedMonthlyPrice " +
                "-rentals.expectedMonthlyPrice"
            )
            .lean();

        const inventory = houses.map((house) => ({
            ...house,
            rentals: undefined,

            bookings: house.rentals
                .filter((rental) => rental.status === "approved")
                .map((rental) => ({
                    startDate: rental.startDate,
                    endDate: rental.endDate
                }))
        }));

        res.json(inventory);
    })
);

// Everything below requires login.
router.use(requireAuth);

// Admin sees all requests. Customers see only their own.
router.get(
    "/requests",
    wrap(async (req, res) => {
        const filter =
            req.user.role === "admin"
                ? {}
                : { "rentals.customer": req.user.id };

        const houses = await Greenhouse.find(filter)
            .populate("rentals.customer", "name email");

        const requests = houses.flatMap((house) =>
            house.rentals
                .filter(
                    (rental) =>
                        req.user.role === "admin" ||
                        String(rental.customer?._id) === req.user.id
                )
                .map((rental) => ({
                    ...rental.toObject(),
                    greenhouseId: house._id,
                    greenhouseName: house.name
                }))
        );

        res.json(requests);
    })
);

function greenhouseFields(body) {
    const { name, size, monthlyPrice, status } = body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100 ||
        !isNumber(size) ||
        size <= 0 ||
        !isNumber(monthlyPrice) ||
        monthlyPrice < 0 ||
        !["available", "busy", "maintenance"].includes(status)
    ) {
        return null;
    }

    return {
        name: name.trim(),
        size,
        monthlyPrice,
        status
    };
}

// Admin: add greenhouse.
router.post(
    "/",
    requireAdmin,
    wrap(async (req, res) => {
        const data = greenhouseFields(req.body);

        if (!data) {
            return fail(
                res,
                "Enter a name, positive size, nonnegative price and valid status"
            );
        }

        const greenhouse = await Greenhouse.create(data);

        res.status(201).json(greenhouse);
    })
);

// Admin: edit greenhouse.
router.put(
    "/:id",
    requireAdmin,
    wrap(async (req, res) => {
        const data = greenhouseFields(req.body);

        if (!data) {
            return fail(res, "Invalid greenhouse details");
        }

        const greenhouse = await Greenhouse.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            {
                new: true,
                runValidators: true
            }
        );

        if (!greenhouse) {
            return fail(res, "Greenhouse not found", 404);
        }

        res.json({
            message: "Greenhouse updated"
        });
    })
);

// Admin: delete only greenhouses without request history.
router.delete(
    "/:id",
    requireAdmin,
    wrap(async (req, res) => {
        const greenhouse = await Greenhouse.findOneAndDelete({
            _id: req.params.id,
            "rentals.0": { $exists: false }
        });

        if (!greenhouse) {
            return fail(
                res,
                "Greenhouse missing or has rental history; use maintenance instead",
                409
            );
        }

        res.json({
            message: "Greenhouse deleted"
        });
    })
);

// Customer: submit rental request.
router.post(
    "/:id/requests",
    wrap(async (req, res) => {
        if (req.user.role !== "customer") {
            return fail(
                res,
                "Only customers can request rentals",
                403
            );
        }

        const {
            seedling,
            phone,
            notes = "",
            durationMonths,
            proposedShare,
            startDate
        } = req.body;

        if (
            typeof seedling !== "string" ||
            !seedling.trim() ||
            seedling.trim().length > 100 ||
            typeof phone !== "string" ||
            !/^\+?[0-9 ()-]{7,20}$/.test(phone) ||
            phone.replace(/\D/g, "").length < 7 ||
            typeof notes !== "string" ||
            notes.length > 1000 ||
            !Number.isInteger(durationMonths) ||
            durationMonths < 1 ||
            durationMonths > 24 ||
            !isNumber(proposedShare) ||
            proposedShare < 0 ||
            proposedShare > 100 ||
            typeof startDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
        ) {
            return fail(
                res,
                "Check crop, phone, date, duration (1–24) and percentage (0–100)"
            );
        }

        const start = new Date(startDate + "T00:00:00Z");
        const today = new Date().toISOString().slice(0, 10);

        if (
            !Number.isFinite(+start) ||
            start.toISOString().slice(0, 10) !== startDate ||
            startDate < today
        ) {
            return fail(res, "Choose today or a future date");
        }

        // Calculate the end date and clamp month-end dates.
        const end = new Date(start);

        end.setUTCDate(1);
        end.setUTCMonth(end.getUTCMonth() + durationMonths);

        const lastDay = new Date(
            Date.UTC(
                end.getUTCFullYear(),
                end.getUTCMonth() + 1,
                0
            )
        ).getUTCDate();

        end.setUTCDate(
            Math.min(start.getUTCDate(), lastDay)
        );

        const greenhouse = await Greenhouse.findById(req.params.id);

        if (!greenhouse) {
            return fail(res, "Greenhouse not found", 404);
        }

        const rental = {
            customer: req.user.id,
            seedling: seedling.trim(),
            phone,
            notes,
            durationMonths,
            proposedShare,
            startDate: start,
            endDate: end,
            expectedMonthlyPrice: greenhouse.monthlyPrice
        };

        // A pending request does not reserve dates.
        // Existing approved bookings must not overlap.
        const updated = await Greenhouse.findOneAndUpdate(
            {
                _id: greenhouse._id,
                status: "available",

                rentals: {
                    $not: {
                        $elemMatch: {
                            status: "approved",
                            startDate: { $lt: end },
                            endDate: { $gt: start }
                        }
                    }
                }
            },
            {
                $push: {
                    rentals: rental
                }
            },
            {
                runValidators: true
            }
        );

        if (!updated) {
            return fail(
                res,
                "Greenhouse unavailable for these dates",
                409
            );
        }

        res.status(201).json({
            message: "Request sent for discussion and approval"
        });
    })
);

// Admin: approve/reject.
// Customer: cancel their own pending request.
router.patch(
    "/:id/requests/:rentalId",
    wrap(async (req, res) => {
        const {
            status,
            agreedShare,
            agreedMonthlyPrice
        } = req.body;

        const isAdmin = req.user.role === "admin";

        const invalidAction = isAdmin
            ? !["approved", "rejected"].includes(status)
            : status !== "cancelled";

        if (invalidAction) {
            return fail(res, "Action not allowed", 403);
        }

        const greenhouse = await Greenhouse.findById(req.params.id);
        const rental = greenhouse?.rentals.id(req.params.rentalId);

        if (!rental) {
            return fail(res, "Request not found", 404);
        }

        if (
            !isAdmin &&
            String(rental.customer) !== req.user.id
        ) {
            return fail(res, "Action not allowed", 403);
        }

        const query = {
            _id: greenhouse._id,

            rentals: {
                $elemMatch: {
                    _id: rental._id,
                    status: "pending"
                }
            }
        };

        const update = {
            "rentals.$[target].status": status
        };

        if (status === "approved") {
            if (
                !isNumber(agreedShare) ||
                agreedShare < 0 ||
                agreedShare > 100 ||
                !isNumber(agreedMonthlyPrice) ||
                agreedMonthlyPrice < 0
            ) {
                return fail(
                    res,
                    "Enter final monthly price and share (0–100)"
                );
            }

            const today = new Date(
                new Date().toISOString().slice(0, 10)
            );

            if (rental.startDate < today) {
                return fail(
                    res,
                    "Start date has passed; ask customer to submit new dates"
                );
            }

            query.status = "available";

            query.$nor = [
                {
                    rentals: {
                        $elemMatch: {
                            status: "approved",
                            startDate: { $lt: rental.endDate },
                            endDate: { $gt: rental.startDate }
                        }
                    }
                }
            ];

            update["rentals.$[target].agreedShare"] =
                agreedShare;

            update["rentals.$[target].agreedMonthlyPrice"] =
                agreedMonthlyPrice;
        }

        // Check conflicts and approve in one atomic document update.
        const result = await Greenhouse.updateOne(
            query,
            {
                $set: update
            },
            {
                arrayFilters: [
                    {
                        "target._id": rental._id,
                        "target.status": "pending"
                    }
                ],
                runValidators: true
            }
        );

        if (!result.modifiedCount) {
            return fail(
                res,
                "Request changed or greenhouse unavailable; refresh and try again",
                409
            );
        }

        res.json({
            message: "Request " + status
        });
    })
);

module.exports = router;