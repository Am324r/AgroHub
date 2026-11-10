import { useState, useEffect } from "react";
import Contracts from "./Contracts";

const EMPTY_FORM = { name: "", category: "sheep", description: "", price: "", quantity: "" };
const EMPTY_AUTH = { name: "", email: "", password: "" };

function App() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");

    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState("login");
    const [authForm, setAuthForm] = useState(EMPTY_AUTH);

    const isAdmin = user?.role === "admin";

    // fetch wrapper that adds the token when logged in
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
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch(() => setMessage("Could not load products"));
    }, []);

    // Restore the session from a saved token
    useEffect(() => {
        if (!token) return;
        fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => (res.ok ? res.json() : Promise.reject()))
            .then((data) => setUser(data.user))
            .catch(() => logout());
    }, [token]);

    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    async function submitAuth(e) {
        e.preventDefault();
        try {
            const response = await fetch(`/api/auth/${authMode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(authForm)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Request failed");

            localStorage.setItem("token", data.token);
            setToken(data.token);
            setUser(data.user);
            setAuthForm(EMPTY_AUTH);
            setMessage(`Welcome, ${data.user.name}!`);
        } catch (err) {
            setMessage(err.message);
        }
    }

    function updateField(field, value) {
        setForm({ ...form, [field]: value });
    }

    function startEdit(product) {
        setEditingId(product._id);
        setForm({
            name: product.name,
            category: product.category,
            description: product.description || "",
            price: String(product.price),
            quantity: String(product.quantity)
        });
        setMessage("");
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function saveProduct(e) {
        e.preventDefault();

        const payload = { ...form, price: Number(form.price), quantity: Number(form.quantity) };
        const isEdit = editingId !== null;

        try {
            const response = await api(isEdit ? `/api/products/${editingId}` : "/api/products", {
                method: isEdit ? "PUT" : "POST",
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Request failed");

            setProducts(isEdit ? products.map((p) => (p._id === data._id ? data : p)) : [data, ...products]);
            setMessage(isEdit ? "Product updated!" : "Product added successfully!");
            cancelEdit();
        } catch (err) {
            setMessage(err.message);
        }
    }

    async function deleteProduct(id) {
        if (!window.confirm("Delete this product?")) return;

        try {
            const response = await api(`/api/products/${id}`, { method: "DELETE" });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete product");
            }
            setProducts(products.filter((p) => p._id !== id));
            setMessage("Product deleted");
        } catch (err) {
            setMessage(err.message);
        }
    }

    return (
        <div>
            <h1>Welcome to AgroHub</h1>
            <p>Your farm products and services in one place.</p>

            {user ? (
                <p>
                    Logged in as {user.name} ({user.role}) <button onClick={logout}>Logout</button>
                </p>
            ) : (
                <div>
                    <h2>{authMode === "login" ? "Login" : "Register"}</h2>
                    <form onSubmit={submitAuth}>
                        {authMode === "register" && (
                            <input
                                type="text"
                                placeholder="Name"
                                value={authForm.name}
                                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                                required
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={authForm.email}
                            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password (min 6 characters)"
                            value={authForm.password}
                            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                            required
                        />
                        <button type="submit">{authMode === "login" ? "Login" : "Register"}</button>
                    </form>
                    <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                        {authMode === "login" ? "Need an account? Register" : "Have an account? Login"}
                    </button>
                </div>
            )}

            <p>{message}</p>

            <h2>Our Products</h2>
            <ul>
                {products.map((product) => (
                    <li key={product._id}>
                        {product.name} ({product.category}) - {product.price} EGP - qty {product.quantity}
                        {isAdmin && (
                            <>
                                {" "}
                                <button onClick={() => startEdit(product)}>Edit</button>{" "}
                                <button onClick={() => deleteProduct(product._id)}>Delete</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            {isAdmin && (
                <>
                    <h2>{editingId ? "Edit Product (Admin)" : "Add Product (Admin)"}</h2>
                    <form onSubmit={saveProduct}>
                        <input
                            type="text"
                            placeholder="Product Name"
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            required
                        />
                        <select value={form.category} onChange={(e) => updateField("category", e.target.value)}>
                            <option value="sheep">Sheep</option>
                            <option value="grass">Grass</option>
                            <option value="seedling">Seedling</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Description"
                            value={form.description}
                            onChange={(e) => updateField("description", e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="Price"
                            value={form.price}
                            onChange={(e) => updateField("price", e.target.value)}
                            min="0"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Quantity"
                            value={form.quantity}
                            onChange={(e) => updateField("quantity", e.target.value)}
                            min="0"
                            required
                        />
                        <button type="submit">{editingId ? "Save Changes" : "Add Product"}</button>
                        {editingId && (
                            <button type="button" onClick={cancelEdit}>
                                Cancel
                            </button>
                        )}
                    </form>
                </>
            )}

            {user && <Contracts token={token} user={user} products={products} />}

            <h2>Our Services</h2>
            <ul>
                <li>Sheep Raising</li>
                <li>Greenhouse Rental</li>
            </ul>
        </div>
    );
}

export default App;
