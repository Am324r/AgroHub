import { useState, useEffect } from "react";



import AdminDashboard from "./AdminDashboard";
import Home from "./Home";
import AuthPage from "./AuthPage";
import CustomerDashboard from "./CustomerDashboard";

const EMPTY_FORM = {
    name: "",
    category: "sheep",
    description: "",
    price: "",
    quantity: "",
    unit: "kg",
    minWeightKg: "",
    maxWeightKg: "",
    version: 0
};

const EMPTY_AUTH = {
    name: "",
    email: "",
    password: ""
};

function App() {
    const [page, setPage] = useState("home");
    const [pendingTab, setPendingTab] = useState("overview");
    const [authBusy, setAuthBusy] = useState(false);

    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");

    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState("login");
    const [authForm, setAuthForm] = useState(EMPTY_AUTH);

    const isAdmin = user?.role === "admin";

    function navigate(nextPage) {
        setMessage("");
        if (nextPage === "home") { setPage("home"); return; }
        setPendingTab(["products", "services"].includes(nextPage) ? nextPage : "overview");
        setPage("account");
    }

    function openService(serviceName) {
        setPendingTab(serviceName);
        setMessage("");
        setPage("account");
    }

    function api(url, options = {}) {
        return fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
    }

    useEffect(() => {
        fetch("/api/products")
            .then((res) => {
                if (!res.ok) throw new Error("Could not load products");
                return res.json();
            })
            .then((data) => setProducts(data))
            .catch((err) => setMessage(err.message));
    }, []);

    useEffect(() => {
        if (!token) return;
        let active = true;

        fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => {
                if (!res.ok) throw new Error("Invalid session");
                return res.json();
            })
            .then((data) => { if (active) setUser(data.user); })
            .catch(() => {
                if (!active) return;
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
            });
        return () => { active = false; };
    }, [token]);

    function logout() {
        setPendingTab("overview");
        setAuthForm(EMPTY_AUTH);
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        navigate("home");
    }

    async function submitAuth(e) {
        e.preventDefault();
        if (authBusy) return;
        setAuthBusy(true);
        setMessage("");
        try {
            const response = await fetch(`/api/auth/${authMode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(authForm)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Request failed");
            }

            localStorage.setItem("token", data.token);
            setToken(data.token);
            setUser(data.user);
            setAuthForm(EMPTY_AUTH);
            setMessage(`Welcome, ${data.user.name}!`);
            setPage("dashboard");
        } catch (err) {
            setMessage(err.message);
        } finally {
            setAuthBusy(false);
        }
    }

    async function refreshProducts() {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Could not refresh products');
        setProducts(await res.json());
    }

    function updateField(field, value) {
        setForm({ ...form, [field]: value, ...(field === "category" && value === "sheep" ? {unit:"kg"} : {}) });
    }

    function startEdit(product) {
        setEditingId(product._id);

        setForm({
            name: product.name,
            category: product.category,
            description: product.description || "",
            price: String(product.price),
            quantity: String(product.quantity),
            unit: product.unit || "kg",
            minWeightKg: product.minWeightKg ?? "",
            maxWeightKg: product.maxWeightKg ?? "",
            version: product.__v ?? 0
        });

        setMessage("");
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function saveProduct(e) {
        e.preventDefault();

        const payload = {
            ...form,
            price: Number(form.price),
            quantity: Number(form.quantity),
            minWeightKg: Number(form.minWeightKg),
            maxWeightKg: Number(form.maxWeightKg)
        };

        const isEdit = editingId !== null;

        try {
            const response = await api(
                isEdit ? `/api/products/${editingId}` : "/api/products",
                {
                    method: isEdit ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Request failed");
            }

            setProducts((current) =>
                isEdit
                    ? current.map((p) => p._id === data._id ? data : p)
                    : [data, ...current]
            );

            setMessage(
                isEdit ? "Product updated!" : "Product added successfully!"
            );

            cancelEdit();
        } catch (err) {
            setMessage(err.message);
        }
    }

    async function deleteProduct(id) {
        if (!window.confirm("Delete this product?")) return;

        try {
            const response = await api(`/api/products/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete product");
            }

            setProducts((current) =>
                current.filter((p) => p._id !== id)
            );

            setMessage("Product deleted");
        } catch (err) {
            setMessage(err.message);
        }
    }

    // Show the admin dashboard after all hooks and handler functions.
    if (isAdmin) {
        return (
            <AdminDashboard
                token={token}
                user={user}
                logout={logout}
                products={products}
                form={form}
                editingId={editingId}
                message={message}
                updateField={updateField}
                saveProduct={saveProduct}
                startEdit={startEdit}
                deleteProduct={deleteProduct}
                cancelEdit={cancelEdit}
                onStockChange={refreshProducts}
            />
        );
    }

    if (token && !user) {
        return <main className="auth-page"><section className="auth-card"><h2>Opening your account…</h2><p>Checking your saved session.</p></section></main>;
    }

    if (user) {
        return <CustomerDashboard key={user.id || user._id || token} token={token} user={user} logout={logout} products={products} onStockChange={refreshProducts} initialTab={pendingTab} />;
    }

    if (page === "account") {
        return <AuthPage mode={authMode} form={authForm} setForm={setAuthForm} setMode={mode => { setAuthMode(mode); setMessage(""); }} submit={submitAuth} busy={authBusy} message={message} onHome={() => navigate("home")} />;
    }

    return (
        <div className="public-shell">
            <header>
                <h1>AgroHub</h1>
                <p>Your Farm Marketplace and Services</p>
                <nav>
                    <button onClick={() => navigate("home")}>Home</button>
                    <button onClick={() => navigate("products")}>Shop Products</button>
                    <button onClick={() => navigate("services")}>Farm Services</button>
                    <button onClick={() => navigate("account")}>Login / Register</button>
                </nav>
            </header>
            <p role="status">{message}</p>
            <Home user={null} navigate={navigate} openService={openService} />
        </div>
    );
}
export default App;
