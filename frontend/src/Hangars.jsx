import { useEffect, useState } from "react";

import "./Greenhouses.css";

import {
    availability,
    availabilityText
} from "./greenhouseAvailability.mjs";

const EMPTY_HANGAR = {
    name: "",
    maxSheep: "",
    monthlyPrice: "",
    caretakerPercent: "",
    feedingPercent: "",
    status: "available"
};

const EMPTY_RENTAL = {
    sheepCount: "",
    phone: "",
    startDate: "",
    durationMonths: "",
    feeding: false,
    acceptedTerms: false,
    notes: ""
};

function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function Hangars({ token, user, onLogin }) {
    const [hangars, setHangars] = useState([]);
    const [requests, setRequests] = useState([]);

    const [form, setForm] = useState(EMPTY_HANGAR);
    const [editingId, setEditingId] = useState(null);

    const [selected, setSelected] = useState(null);
    const [rental, setRental] = useState(EMPTY_RENTAL);

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const isAdmin = user?.role === "admin";
    const today = new Date().toISOString().slice(0, 10);

    async function api(path, method = "GET", body) {
        const response = await fetch("/api/hangars" + path, {
            method,

            headers: {
                "Content-Type": "application/json",
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {})
            },

            body: body === undefined
                ? undefined
                : JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }

    async function reload() {
        const [inventory, rentals] = await Promise.all([
            api(""),
            user ? api("/requests") : Promise.resolve([])
        ]);

        setHangars(inventory);
        setRequests(rentals);
    }

    useEffect(() => {
        let active = true;

        async function load() {
            setLoading(true);

            try {
                const responses = await Promise.all([
                    fetch("/api/hangars"),

                    ...(user
                        ? [
                            fetch("/api/hangars/requests", {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            })
                        ]
                        : [])
                ]);

                const data = await Promise.all(
                    responses.map(async (response) => {
                        const body = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                body.message || "Could not load hangars"
                            );
                        }

                        return body;
                    })
                );

                if (active) {
                    setHangars(data[0]);
                    setRequests(data[1] || []);
                }
            } catch (err) {
                if (active) setMessage(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, [token, user]);

    async function act(action) {
        setBusy(true);
        setMessage("");

        try {
            const result = await action();
            await reload();
            setMessage(result.message || "Saved successfully");
        } catch (err) {
            setMessage(err.message);
        } finally {
            setBusy(false);
        }
    }

    function updateForm(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value
        }));
    }

    function updateRental(field, value) {
        setRental((current) => ({
            ...current,
            [field]: value,
            // Require acceptance again after changing the request.
            acceptedTerms: false
        }));
    }

    function saveHangar(e) {
        e.preventDefault();

        act(async () => {
            const result = await api(
                editingId ? "/" + editingId : "",
                editingId ? "PUT" : "POST",
                {
                    ...form,
                    maxSheep: Number(form.maxSheep),
                    monthlyPrice: Number(form.monthlyPrice),
                    caretakerPercent: Number(form.caretakerPercent),
                    feedingPercent: Number(form.feedingPercent)
                }
            );

            setForm(EMPTY_HANGAR);
            setEditingId(null);

            return result;
        });
    }

    function editHangar(hangar) {
        setEditingId(hangar._id);

        setForm({
            name: hangar.name,
            maxSheep: hangar.maxSheep,
            monthlyPrice: hangar.monthlyPrice,
            caretakerPercent: hangar.caretakerPercent,
            feedingPercent: hangar.feedingPercent,
            status: hangar.status
        });
    }

    function chooseHangar(hangar) {
        if (!user) {
            onLogin();
            return;
        }

        setSelected(hangar);

        setRental({
            ...EMPTY_RENTAL,
            startDate: availability(hangar, today).date || today
        });
    }

    function submitRental(e) {
        e.preventDefault();

        act(async () => {
            const result = await api(
                "/" + selected._id + "/requests",
                "POST",
                {
                    ...rental,
                    sheepCount: Number(rental.sheepCount),
                    durationMonths: Number(rental.durationMonths),

                    quotedMonthlyPrice: selected.monthlyPrice,
                    quotedCaretakerPercent: selected.caretakerPercent,
                    quotedFeedingPercent: selected.feedingPercent
                }
            );

            setSelected(null);
            setRental(EMPTY_RENTAL);

            return result;
        });
    }

    const farmPercent = selected
        ? selected.caretakerPercent +
          (rental.feeding ? selected.feedingPercent : 0)
        : 0;

    const totalRent = selected
        ? roundMoney(
            selected.monthlyPrice *
            Number(rental.durationMonths || 0)
        )
        : 0;

    return (
        <section className="gh">
            <h2>Sheep Hangar Rental</h2>

            <p>
                Rent a whole hangar for your sheep.
                The farm provides a caretaker.
                Farm-provided feeding is optional.
            </p>

            <p role="status" aria-live="polite">
                {message}
            </p>

            {loading ? (
                <p>Loading hangars…</p>
            ) : (
                <>
                    <div className="gh-grid">
                        {hangars.map((hangar) => (
                            <article
                                className="gh-card"
                                key={hangar._id}
                            >
                                <span className="gh-badge">
                                    {hangar.status}
                                </span>

                                <h3>{hangar.name}</h3>

                                <p>
                                    Maximum capacity:{" "}
                                    <strong>{hangar.maxSheep} sheep</strong>
                                </p>

                                <p>
                                    <strong>
                                        {hangar.monthlyPrice.toLocaleString()} EGP
                                    </strong>
                                    {" "}/ month
                                </p>

                                <p>
                                    Caretaker:{" "}
                                    {hangar.caretakerPercent}% of final profit
                                </p>

                                <p>
                                    Optional feeding: extra{" "}
                                    {hangar.feedingPercent}% of final profit
                                </p>

                                <p className="gh-availability">
                                    {availabilityText(hangar, today)}
                                </p>

                                {hangar.bookings.length > 0 && (
                                    <details>
                                        <summary>Reserved periods</summary>

                                        {hangar.bookings.map((booking, index) => (
                                            <p key={index}>
                                                {booking.startDate.slice(0, 10)}
                                                {" "}to{" "}
                                                {booking.endDate.slice(0, 10)}
                                                {" "}(end exclusive)
                                            </p>
                                        ))}
                                    </details>
                                )}

                                <div className="gh-actions">
                                    {isAdmin ? (
                                        <>
                                            <button
                                                disabled={busy}
                                                onClick={() => editHangar(hangar)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                disabled={busy}
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            "Delete this hangar? Hangars with rental history cannot be deleted."
                                                        )
                                                    ) {
                                                        act(() =>
                                                            api(
                                                                "/" + hangar._id,
                                                                "DELETE"
                                                            )
                                                        );
                                                    }
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            disabled={
                                                busy ||
                                                hangar.status !== "available"
                                            }
                                            onClick={() => chooseHangar(hangar)}
                                        >
                                            Rent hangar
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}

                        {hangars.length === 0 && (
                            <p>No hangars registered yet.</p>
                        )}

                        {isAdmin && (
                            <form
                                className="gh-card gh-form"
                                onSubmit={saveHangar}
                            >
                                <h3>
                                    {editingId ? "Edit hangar" : "Add hangar"}
                                </h3>

                                <label>
                                    Hangar name
                                    <input
                                        required
                                        maxLength={100}
                                        value={form.name}
                                        onChange={(e) =>
                                            updateForm("name", e.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Maximum sheep capacity
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="1"
                                        value={form.maxSheep}
                                        onChange={(e) =>
                                            updateForm("maxSheep", e.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Monthly rent (EGP)
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={form.monthlyPrice}
                                        onChange={(e) =>
                                            updateForm(
                                                "monthlyPrice",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Farm caretaker share of profit (%)
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={form.caretakerPercent}
                                        onChange={(e) =>
                                            updateForm(
                                                "caretakerPercent",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Extra feeding share of profit (%)
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={form.feedingPercent}
                                        onChange={(e) =>
                                            updateForm(
                                                "feedingPercent",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <p>
                                    Combined percentages must not exceed 100%.
                                </p>

                                <label>
                                    Status
                                    <select
                                        value={form.status}
                                        onChange={(e) =>
                                            updateForm("status", e.target.value)
                                        }
                                    >
                                        <option value="available">
                                            Available
                                        </option>
                                        <option value="busy">
                                            Busy
                                        </option>
                                        <option value="maintenance">
                                            Maintenance
                                        </option>
                                    </select>
                                </label>

                                <button disabled={busy}>
                                    Save hangar
                                </button>

                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(null);
                                            setForm(EMPTY_HANGAR);
                                        }}
                                    >
                                        Cancel edit
                                    </button>
                                )}
                            </form>
                        )}
                    </div>

                    {selected && user && !isAdmin && (
                        <form
                            className="gh-card gh-form gh-rental"
                            onSubmit={submitRental}
                        >
                            <h3>Rent {selected.name}</h3>

                            <p className="gh-availability">
                                {availabilityText(selected, today)}
                            </p>

                            <div className="gh-grid">
                                <label>
                                    Number of sheep
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={selected.maxSheep}
                                        step="1"
                                        value={rental.sheepCount}
                                        onChange={(e) =>
                                            updateRental(
                                                "sheepCount",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Phone number
                                    <input
                                        type="tel"
                                        required
                                        minLength={7}
                                        maxLength={20}
                                        value={rental.phone}
                                        onChange={(e) =>
                                            updateRental("phone", e.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Start date
                                    <input
                                        type="date"
                                        required
                                        min={
                                            availability(selected, today).date ||
                                            today
                                        }
                                        value={rental.startDate}
                                        onChange={(e) =>
                                            updateRental(
                                                "startDate",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Duration (months)
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="24"
                                        step="1"
                                        value={rental.durationMonths}
                                        onChange={(e) =>
                                            updateRental(
                                                "durationMonths",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            <label>
                                Feeding arrangement
                                <select
                                    value={rental.feeding ? "farm" : "customer"}
                                    onChange={(e) =>
                                        updateRental(
                                            "feeding",
                                            e.target.value === "farm"
                                        )
                                    }
                                >
                                    <option value="customer">
                                        I arrange feeding — no extra percentage
                                    </option>
                                    <option value="farm">
                                        Farm feeds my sheep — extra{" "}
                                        {selected.feedingPercent}% of profit
                                    </option>
                                </select>
                            </label>

                            <label>
                                Notes
                                <textarea
                                    maxLength={1000}
                                    value={rental.notes}
                                    onChange={(e) =>
                                        updateRental("notes", e.target.value)
                                    }
                                />
                            </label>

                            <div className="gh-card">
                                <h4>Your rental terms</h4>

                                <p>
                                    Monthly rent: {selected.monthlyPrice} EGP
                                </p>

                                <p>
                                    Total rent for selected duration:{" "}
                                    {totalRent} EGP
                                </p>

                                <p>
                                    Farm caretaker share:{" "}
                                    {selected.caretakerPercent}%
                                </p>

                                <p>
                                    Additional feeding share:{" "}
                                    {rental.feeding
                                        ? selected.feedingPercent
                                        : 0}%
                                </p>

                                <p>
                                    <strong>
                                        Farm receives {farmPercent}% of final
                                        profit. You receive {100 - farmPercent}%.
                                    </strong>
                                </p>

                                <p>
                                    Rent is charged separately from the profit
                                    split. Final profit is the agreed amount
                                    entered when the rental is completed.
                                </p>
                            </div>

                            <label>
                                Accept rental terms
                                <select
                                    required
                                    value={rental.acceptedTerms ? "yes" : ""}
                                    onChange={(e) =>
                                        setRental({
                                            ...rental,
                                            acceptedTerms: e.target.value === "yes"
                                        })
                                    }
                                >
                                    <option value="">
                                        Please choose
                                    </option>
                                    <option value="yes">
                                        I accept the rent, caretaker percentage
                                        and selected feeding arrangement
                                    </option>
                                </select>
                            </label>

                            <p>
                                The whole hangar is reserved only after admin
                                approval. Your dates must not overlap another
                                approved rental.
                            </p>

                            <button disabled={busy || !rental.acceptedTerms}>
                                Send rental request
                            </button>

                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setSelected(null)}
                            >
                                Cancel
                            </button>
                        </form>
                    )}

                    {user && (
                        <>
                            <h3>
                                {isAdmin
                                    ? "All hangar rental requests"
                                    : "My hangar rentals"}
                            </h3>

                            <div className="gh-grid">
                                {requests.map((request) => (
                                    <RentalCard
                                        key={request._id}
                                        request={request}
                                        isAdmin={isAdmin}
                                        busy={busy}
                                        onAction={(status, extra = {}) =>
                                            act(() =>
                                                api(
                                                    `/${request.hangarId}/requests/${request._id}`,
                                                    "PATCH",
                                                    { status, ...extra }
                                                )
                                            )
                                        }
                                    />
                                ))}

                                {requests.length === 0 && (
                                    <p>No hangar rental requests yet.</p>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </section>
    );
}

function RentalCard({ request, isAdmin, busy, onAction }) {
    const [profit, setProfit] = useState("");

    const farmPercent =
        request.caretakerPercent +
        (request.feeding ? request.feedingPercent : 0);

    return (
        <article className="gh-card">
            <span className="gh-badge">{request.status}</span>

            <h4>{request.hangarName}</h4>

            {isAdmin && (
                <p>
                    {request.customer?.name}
                    <br />
                    {request.customer?.email}
                    <br />
                    Phone: {request.phone}
                </p>
            )}

            <p>{request.sheepCount} sheep</p>

            <p>
                {request.startDate.slice(0, 10)}
                {" "}to{" "}
                {request.endDate.slice(0, 10)}
            </p>

            <p>
                {request.durationMonths} months ·{" "}
                {request.monthlyPrice} EGP / month
            </p>

            <p>
                Total rent:{" "}
                {roundMoney(
                    request.monthlyPrice * request.durationMonths
                )} EGP
            </p>

            <p>
                Feeding:{" "}
                {request.feeding
                    ? "Provided by the farm"
                    : "Arranged by the customer"}
            </p>

            <p>
                Caretaker: {request.caretakerPercent}% · feeding:{" "}
                {request.feeding ? request.feedingPercent : 0}%
            </p>

            <p>
                Farm profit share: {farmPercent}% · customer:{" "}
                {100 - farmPercent}%
            </p>

            {request.notes && <p>{request.notes}</p>}

            {request.status === "pending" && (
                <div className="gh-actions">
                    {isAdmin ? (
                        <>
                            <button
                                disabled={busy}
                                onClick={() => onAction("approved")}
                            >
                                Approve accepted terms
                            </button>

                            <button
                                disabled={busy}
                                onClick={() => onAction("rejected")}
                            >
                                Reject
                            </button>
                        </>
                    ) : (
                        <button
                            disabled={busy}
                            onClick={() => onAction("cancelled")}
                        >
                            Cancel request
                        </button>
                    )}
                </div>
            )}

            {isAdmin && request.status === "approved" && (
                <form
                    className="gh-form"
                    onSubmit={(e) => {
                        e.preventDefault();

                        onAction("completed", {
                            totalProfit: Number(profit)
                        });
                    }}
                >
                    <label>
                        Agreed final profit (EGP)
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={profit}
                            onChange={(e) => setProfit(e.target.value)}
                        />
                    </label>

                    <p>
                        Completion is allowed on or after the rental end date.
                        Rent is recorded separately.
                    </p>

                    <button disabled={busy}>
                        Complete and calculate shares
                    </button>
                </form>
            )}

            {request.status === "completed" && (
                <div>
                    <p>Final profit: {request.totalProfit} EGP</p>
                    <p>Farm profit share: {request.farmProfitShare} EGP</p>
                    <p>
                        Customer profit share:{" "}
                        {request.customerProfitShare} EGP
                    </p>
                    <p>Separate rental charge: {request.totalRent} EGP</p>
                </div>
            )}
        </article>
    );
}