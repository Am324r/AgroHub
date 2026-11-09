
import { useState, useEffect } from "react";

function App() {
    const [products, setProducts] = useState([]);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("sheep");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.log(err));
    }, []);

    async function addProduct(e) {
        e.preventDefault();

        const newProduct = {
            name: name,
            category: category,
            description: description,
            price: Number(price),
            quantity: Number(quantity)
        };

        try {
            const response = await fetch("/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newProduct)
            });

           if (!response.ok) {
              throw new Error("Failed to add product");
                              }

            const savedProduct = await response.json();

            setProducts([...products, savedProduct]);
            setMessage("Product added successfully!");

            setName("");
            setCategory("sheep");
            setDescription("");
            setPrice("");
            setQuantity("");
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
                        {product.name} - {product.price} EGP
                    </li>
                ))}
            </ul>

            <h2>Add Product (Admin)</h2>

            <form onSubmit={addProduct}>
                <input
                    type="text"
                    placeholder="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="sheep">Sheep</option>
                    <option value="grass">Grass</option>
                    <option value="seedling">Seedling</option>
                </select>

                <input
                    type="text"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <input
                    type="number"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    required
                />

                <input
                    type="number"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    required
                />

                <button type="submit">Add Product</button>
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
