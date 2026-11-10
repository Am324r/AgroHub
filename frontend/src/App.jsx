import { useState, useEffect } from "react";

const EMPTY_FORM = { name: "", category: "sheep", description: "", price: "", quantity: "" };

function App() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch(() => setMessage("Could not load products"));
    }, []);

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

        const payload = {
            ...form,
            price: Number(form.price),
            quantity: Number(form.quantity)
        };

        const isEdit = editingId !== null;
        const url = isEdit ? `/api/products/${editingId}` : "/api/products";

        try {
            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Request failed");

            setProducts(
                isEdit
                    ? products.map((p) => (p._id === data._id ? data : p))
                    : [data, ...products]
            );
            setMessage(isEdit ? "Product updated!" : "Product added successfully!");
            cancelEdit();
        } catch (err) {
            setMessage(err.message);
        }
    }

    async function deleteProduct(id) {
        if (!window.confirm("Delete this product?")) return;

        try {
            const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete product");

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

            <h2>Our Products</h2>
            <ul>
                {products.map((product) => (
                    <li key={product._id}>
                        {product.name} ({product.category}) - {product.price} EGP - qty {product.quantity}{" "}
                        <button onClick={() => startEdit(product)}>Edit</button>{" "}
                        <button onClick={() => deleteProduct(product._id)}>Delete</button>
                    </li>
                ))}
            </ul>

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

            <p>{message}</p>

            <h2>Our Services</h2>
            <ul>
                <li>Sheep Raising</li>
                <li>Greenhouse Rental</li>
            </ul>
        </div>
    );
}

export default App;
