import { useEffect, useState } from "react";
import Greenhouses from "./Greenhouses";
import Hangars from "./Hangars";
import Contracts from "./Contracts";
import "./AdminDashboard.css";

const MENU = [
    ["overview", "Overview"],
    ["products", "Products"],
    ["greenhouses", "Greenhouses"],
    ["hangars", "Sheep Hangars"],
    ["requests", "Rental Requests"],
    ["contracts", "Previous Sheep Contracts"]
];

function availableNow(space) {
    if (space.status !== "available") return false;

    const today = new Date().toISOString().slice(0, 10);

    return !space.bookings.some((booking) =>
        booking.startDate.slice(0, 10) <= today &&
        booking.endDate.slice(0, 10) > today
    );
}

function displayDate(value) {
    return value ? value.slice(0, 10) : "—";
}

export default function AdminDashboard({
    token,
    user,
    logout,
    products,
    form,
    editingId,
    message,
    updateField,
    saveProduct,
    startEdit,
    deleteProduct,
    cancelEdit
}) {
    const [tab, setTab] = useState("overview");

    const [greenhouses, setGreenhouses] = useState([]);
    const [hangars, setHangars] = useState([]);
    const [requests, setRequests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    useEffect(() => {
        // Reload summaries when returning from a management screen.
        if (tab !== "overview" && tab !== "requests") return;

        let active = true;

        async function getData(url) {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Could not load dashboard");
            }

            if (!Array.isArray(data)) {
                throw new Error("Unexpected dashboard response");
            }

            return data;
        }

        async function loadDashboard() {
            setLoading(true);
            setError("");

            try {
                const greenhouseData =
                    await getData("/api/greenhouses");

                const hangarData =
                    await getData("/api/hangars");

                const greenhouseRequests =
                    await getData("/api/greenhouses/requests");

                const hangarRequests =
                    await getData("/api/hangars/requests");

                const combinedRequests = [
                    ...greenhouseRequests.map((request) => ({
                        ...request,
                        type: "Greenhouse",
                        spaceName: request.greenhouseName,
                        managementTab: "greenhouses"
                    })),

                    ...hangarRequests.map((request) => ({
                        ...request,
                        type: "Sheep Hangar",
                        spaceName: request.hangarName,
                        managementTab: "hangars"
                    }))
                ];

                combinedRequests.sort(
                    (a, b) =>
                        new Date(b.createdAt) - new Date(a.createdAt)
                );

                if (active) {
                    setGreenhouses(greenhouseData);
                    setHangars(hangarData);
                    setRequests(combinedRequests);
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, [token, tab, reload]);

    const pendingRequests = requests.filter(
        (request) => request.status === "pending"
    );

    const availableSpaces =
        greenhouses.filter(availableNow).length +
        hangars.filter(availableNow).length;

    const title = MENU.find((item) => item[0] === tab)?.[1];

    function requestTable(rows) {
        return (
            <div className="admin-table-scroll">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Rental space</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((request) => (
                            <tr key={request.type + request._id}>
                                <td>
                                    <strong>
                                        {request.customer?.name ||
                                            "Customer unavailable"}
                                    </strong>

                                    <small>
                                        {request.customer?.email || ""}
                                    </small>
                                </td>

                                <td>
                                    {request.spaceName}
                                    <small>{request.type}</small>
                                </td>

                                <td>
                                    {displayDate(request.startDate)}
                                    <small>
                                        to {displayDate(request.endDate)}
                                    </small>
                                </td>

                                <td>
                                    <span
                                        className={
                                            "admin-status " + request.status
                                        }
                                    >
                                        {request.status}
                                    </span>
                                </td>

                                <td>
                                    <button
                                        className="admin-outline"
                                        onClick={() =>
                                            setTab(request.managementTab)
                                        }
                                    >
                                        Manage
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan="5">No rental requests yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="admin-app">
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <span className="admin-logo">A</span>

                    <div>
                        <strong>AgroHub</strong>
                        <small>Farm Administration</small>
                    </div>
                </div>

                <nav aria-label="Admin navigation">
                    {MENU.map(([value, label]) => (
                        <button
                            key={value}
                            className={tab === value ? "active" : ""}
                            aria-current={tab === value ? "page" : undefined}
                            onClick={() => setTab(value)}
                        >
                            {label}

                            {value === "requests" &&
                                pendingRequests.length > 0 && (
                                    <span className="admin-count">
                                        {pendingRequests.length}
                                    </span>
                                )}
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <p>{user.name}</p>
                    <small>Administrator</small>
                    <button onClick={logout}>Logout</button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div>
                        <p className="admin-eyebrow">AGROHUB ADMIN</p>
                        <h1>{title}</h1>
                        <p>
                            Manage your farm spaces, products and
                            customer requests.
                        </p>
                    </div>

                    <div className="admin-account">
                        <span className="admin-avatar">
                            {user.name?.charAt(0).toUpperCase()}
                        </span>

                        <div>
                            <strong>{user.name}</strong>
                            <small>Administrator</small>
                        </div>
                    </div>
                </header>

                {message && (
                    <p className="admin-message" role="status">
                        {message}
                    </p>
                )}

                {(tab === "overview" || tab === "requests") && (
                    <>
                        {error && (
                            <p className="admin-error" role="alert">
                                {error}
                            </p>
                        )}

                        <button
                            className="admin-outline admin-refresh"
                            disabled={loading}
                            onClick={() => setReload(reload + 1)}
                        >
                            {loading ? "Loading…" : "Refresh dashboard"}
                        </button>
                    </>
                )}

                {tab === "overview" && !loading && !error && (
                    <>
                        <div className="admin-stats">
                            <article className="admin-stat">
                                <span>Total greenhouses</span>
                                <strong>{greenhouses.length}</strong>
                                <small>
                                    {greenhouses.filter(availableNow).length}
                                    {" "}available now
                                </small>
                            </article>

                            <article className="admin-stat">
                                <span>Total sheep hangars</span>
                                <strong>{hangars.length}</strong>
                                <small>
                                    {hangars.filter(availableNow).length}
                                    {" "}available now
                                </small>
                            </article>

                            <article className="admin-stat">
                                <span>Pending rental requests</span>
                                <strong>{pendingRequests.length}</strong>
                                <small>Waiting for your review</small>
                            </article>

                            <article className="admin-stat">
                                <span>Available spaces</span>
                                <strong>{availableSpaces}</strong>
                                <small>Greenhouses and hangars combined</small>
                            </article>
                        </div>

                        <div className="admin-overview-grid">
                            <section className="admin-panel">
                                <div className="admin-section-heading">
                                    <h2>Inventory highlights</h2>
                                    <span>Farm rental spaces</span>
                                </div>

                                <div className="admin-inventory-grid">
                                    <article className="admin-inventory-card">
                                        <div className="admin-space-banner">
                                            GREENHOUSES
                                        </div>

                                        <div className="admin-card-content">
                                            <h3>
                                                {greenhouses[0]?.name ||
                                                    "Your greenhouses"}
                                            </h3>

                                            {greenhouses[0] ? (
                                                <>
                                                    <p>
                                                        {greenhouses[0].size} m²
                                                    </p>
                                                    <p>
                                                        {greenhouses[0]
                                                            .monthlyPrice
                                                            .toLocaleString()}
                                                        {" "}EGP / month
                                                    </p>
                                                </>
                                            ) : (
                                                <p>
                                                    Add your first greenhouse.
                                                </p>
                                            )}

                                            <button
                                                onClick={() =>
                                                    setTab("greenhouses")
                                                }
                                            >
                                                Manage greenhouses
                                            </button>
                                        </div>
                                    </article>

                                    <article className="admin-inventory-card">
                                        <div className="admin-space-banner hangar">
                                            SHEEP HANGARS
                                        </div>

                                        <div className="admin-card-content">
                                            <h3>
                                                {hangars[0]?.name ||
                                                    "Your sheep hangars"}
                                            </h3>

                                            {hangars[0] ? (
                                                <>
                                                    <p>
                                                        Up to{" "}
                                                        {hangars[0].maxSheep}
                                                        {" "}sheep
                                                    </p>
                                                    <p>
                                                        {hangars[0]
                                                            .monthlyPrice
                                                            .toLocaleString()}
                                                        {" "}EGP / month
                                                    </p>
                                                </>
                                            ) : (
                                                <p>
                                                    Add your first sheep hangar.
                                                </p>
                                            )}

                                            <button
                                                onClick={() => setTab("hangars")}
                                            >
                                                Manage sheep hangars
                                            </button>
                                        </div>
                                    </article>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <h2>Quick actions</h2>

                                <div className="admin-quick-actions">
                                    <button
                                        onClick={() => setTab("greenhouses")}
                                    >
                                        Manage / Add Greenhouse
                                    </button>

                                    <button onClick={() => setTab("hangars")}>
                                        Manage / Add Sheep Hangar
                                    </button>

                                    <button
                                        className="admin-outline"
                                        onClick={() => setTab("requests")}
                                    >
                                        Review rental requests
                                        {" "}({pendingRequests.length})
                                    </button>

                                    <button
                                        className="admin-outline"
                                        onClick={() => setTab("products")}
                                    >
                                        Manage products
                                    </button>
                                </div>
                            </section>
                        </div>

                        <section className="admin-panel">
                            <div className="admin-section-heading">
                                <h2>Recent rental requests</h2>

                                <button
                                    className="admin-outline"
                                    onClick={() => setTab("requests")}
                                >
                                    View all
                                </button>
                            </div>

                            {requestTable(requests.slice(0, 5))}
                        </section>
                    </>
                )}

                {tab === "requests" && !loading && !error && (
                    <section className="admin-panel">
                        <h2>All rental requests</h2>

                        <p>
                            Select Manage to open that service.
                            Its rental request cards contain the approval
                            and completion controls.
                        </p>

                        {requestTable(requests)}
                    </section>
                )}

                {tab === "greenhouses" && (
                    <Greenhouses token={token} user={user} />
                )}

                {tab === "hangars" && (
                    <Hangars token={token} user={user} />
                )}

                {tab === "contracts" && (
                    <section className="admin-panel">
                        <Contracts
                            token={token}
                            user={user}
                            products={products}
                        />
                    </section>
                )}

                {tab === "products" && (
                    <div className="admin-product-layout">
                        <section className="admin-panel">
                            <h2>Farm products</h2>

                            <div className="admin-product-grid">
                                {products.map((product) => (
                                    <article
                                        className="admin-product-card"
                                        key={product._id}
                                    >
                                        <span className="admin-status">
                                            {product.category}
                                        </span>

                                        <h3>{product.name}</h3>
                                        <p>{product.description}</p>
                                        <strong>{product.price} EGP</strong>
                                        <p>Stock: {product.quantity}</p>

                                        <div className="admin-actions">
                                            <button
                                                onClick={() =>
                                                    startEdit(product)
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="admin-outline"
                                                onClick={() =>
                                                    deleteProduct(product._id)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </article>
                                ))}

                                {products.length === 0 && (
                                    <p>No products added yet.</p>
                                )}
                            </div>
                        </section>

                        <section className="admin-panel">
                            <h2>
                                {editingId ? "Edit product" : "Add product"}
                            </h2>

                            <form
                                className="admin-form"
                                onSubmit={saveProduct}
                            >
                                <label>
                                    Product name
                                    <input
                                        required
                                        value={form.name}
                                        onChange={(e) =>
                                            updateField("name", e.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Category
                                    <select
                                        value={form.category}
                                        onChange={(e) =>
                                            updateField(
                                                "category",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="sheep">Sheep</option>
                                        <option value="grass">Clover / Grass</option>
                                        <option value="seedling">Seedling</option>
                                    </select>
                                </label>

                                <label>
                                    Description
                                    <textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            updateField(
                                                "description",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Price (EGP)
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={form.price}
                                        onChange={(e) =>
                                            updateField("price", e.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    Stock quantity
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="1"
                                        value={form.quantity}
                                        onChange={(e) =>
                                            updateField(
                                                "quantity",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <button type="submit">
                                    {editingId
                                        ? "Save changes"
                                        : "Add product"}
                                </button>

                                {editingId && (
                                    <button
                                        type="button"
                                        className="admin-outline"
                                        onClick={cancelEdit}
                                    >
                                        Cancel edit
                                    </button>
                                )}
                            </form>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}