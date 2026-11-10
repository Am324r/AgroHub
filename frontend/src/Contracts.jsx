import { useState, useEffect } from "react";

function Contracts({ token, user, products }) {
    const [contracts, setContracts] = useState([]);
    const [message, setMessage] = useState("");
    const [form, setForm] = useState({ productId: "", sheepCount: "", durationMonths: "", notes: "" });

    const isAdmin = user.role === "admin";
    const sheepProducts = products.filter((p) => p.category === "sheep");

    function api(url, options = {}) {
        return fetch(url, {
            ...options,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        });
    }

    useEffect(() => {
        api("/api/contracts")
            .then((res) => res.json())
            .then((data) => setContracts(Array.isArray(data) ? data : []))
            .catch(() => setMessage("Could not load contracts"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    function replaceContract(updated) {
        // PATCH responses don't include the populated customer, so keep the old one
        setContracts(contracts.map((c) => (c._id === updated._id ? { ...updated, customer: c.customer } : c)));
    }

    async function request(url, method, body) {
        try {
            const response = await api(url, { method, body: body ? JSON.stringify(body) : undefined });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Request failed");
            return data;
        } catch (err) {
            setMessage(err.message);
            return null;
        }
    }

    async function submitRequest(e) {
        e.preventDefault();
        const data = await request("/api/contracts", "POST", {
            ...form,
            sheepCount: Number(form.sheepCount),
            durationMonths: Number(form.durationMonths)
        });
        if (data) {
            setContracts([data, ...contracts]);
            setForm({ productId: "", sheepCount: "", durationMonths: "", notes: "" });
            setMessage("Contract request sent. Waiting for admin approval.");
        }
    }

    async function approve(c) {
        const share = window.prompt("Customer profit share % (0-100)", String(c.customerSharePercent));
        if (share === null) return;
        const data = await request(`/api/contracts/${c._id}/approve`, "PATCH", { customerSharePercent: Number(share) });
        if (data) { replaceContract(data); setMessage("Contract approved"); }
    }

    async function reject(c) {
        const data = await request(`/api/contracts/${c._id}/reject`, "PATCH");
        if (data) { replaceContract(data); setMessage("Contract rejected"); }
    }

    async function complete(c) {
        const profit = window.prompt("Total profit for this contract (EGP)");
        if (profit === null) return;
        const data = await request(`/api/contracts/${c._id}/complete`, "PATCH", { totalProfit: Number(profit) });
        if (data) { replaceContract(data); setMessage("Contract completed"); }
    }

    async function cancel(c) {
        const data = await request(`/api/contracts/${c._id}/cancel`, "PATCH");
        if (data) { replaceContract(data); setMessage("Contract cancelled"); }
    }

    return (
        <div>
            <h2>Sheep-Raising Contracts</h2>

            {!isAdmin && (
                <form onSubmit={submitRequest}>
                    <select
                        value={form.productId}
                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                        required
                    >
                        <option value="">Choose a sheep product</option>
                        {sheepProducts.map((p) => (
                            <option key={p._id} value={p._id}>
                                {p.name} - {p.price} EGP each
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Number of sheep"
                        min="1"
                        value={form.sheepCount}
                        onChange={(e) => setForm({ ...form, sheepCount: e.target.value })}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Duration (months, 1-24)"
                        min="1"
                        max="24"
                        value={form.durationMonths}
                        onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                    <button type="submit">Request Contract</button>
                </form>
            )}

            <p>{message}</p>

            <h3>{isAdmin ? "All Contracts" : "My Contracts"}</h3>
            {contracts.length === 0 && <p>No contracts yet.</p>}
            <ul>
                {contracts.map((c) => (
                    <li key={c._id}>
                        {isAdmin && c.customer && <strong>{c.customer.name} ({c.customer.email}): </strong>}
                        {c.sheepCount} x {c.productName} for {c.durationMonths} month(s), investment{" "}
                        {c.totalInvestment} EGP, customer share {c.customerSharePercent}% - <strong>{c.status}</strong>
                        {c.status === "completed" && (
                            <> | profit {c.totalProfit} EGP (customer {c.customerShare}, farm {c.farmShare})</>
                        )}{" "}
                        {isAdmin && c.status === "pending" && (
                            <>
                                <button onClick={() => approve(c)}>Approve</button>{" "}
                                <button onClick={() => reject(c)}>Reject</button>
                            </>
                        )}
                        {isAdmin && c.status === "active" && (
                            <button onClick={() => complete(c)}>Complete</button>
                        )}
                        {!isAdmin && c.status === "pending" && (
                            <button onClick={() => cancel(c)}>Cancel</button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Contracts;
