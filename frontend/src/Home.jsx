import "./Home.css";

export default function Home({ user, navigate, openService }) {
    return (
        <main className="public-home">
            <section className="home-hero">
                <div className="home-hero-content">
                    <span className="home-eyebrow">
                        WELCOME TO AGROHUB
                    </span>

                    <h1>Your farm opportunities start here.</h1>

                    <p>
                        Browse farm products, find a greenhouse for your
                        crops, or rent a sheep hangar with care from our farm.
                    </p>

                    <div className="home-actions">
                        <button onClick={() => navigate("products")}>
                            Shop Products
                        </button>

                        <button
                            className="home-secondary"
                            onClick={() => navigate("services")}
                        >
                            Explore Farm Services
                        </button>
                    </div>
                </div>

                <div className="home-hero-art" aria-hidden="true">
                    <div className="home-sun"></div>

                    <div className="home-greenhouse">
                        <div className="home-roof"></div>
                        <div className="home-greenhouse-body">
                            <span>🌱</span>
                            <span>🌱</span>
                            <span>🌱</span>
                        </div>
                    </div>

                    <div className="home-field"></div>

                    <div className="home-art-label">
                        Space to grow. Care to thrive.
                    </div>
                </div>
            </section>

            <section className="home-section">
                <div className="home-section-heading">
                    <span className="home-eyebrow">
                        OUR FARM, YOUR NEXT STEP
                    </span>

                    <h2>What are you looking for?</h2>

                    <p>
                        Products and rental spaces, brought together
                        in one place.
                    </p>
                </div>

                <div className="home-services-grid">
                    <article className="home-service-card">
                        <div className="home-card-icon" aria-hidden="true">
                            🌾
                        </div>

                        <span className="home-card-label">
                            FARM PRODUCTS
                        </span>

                        <h3>Shop from the farm</h3>

                        <p>
                            Browse sheep, clover and seedlings.
                            Check current prices and stock availability.
                        </p>

                        <button onClick={() => navigate("products")}>
                            Browse Products <span aria-hidden="true">→</span>
                        </button>
                    </article>

                    <article className="home-service-card">
                        <div className="home-card-icon" aria-hidden="true">
                            🌱
                        </div>

                        <span className="home-card-label">
                            GREENHOUSE RENTAL
                        </span>

                        <h3>Give your crops room to grow</h3>

                        <p>
                            Compare greenhouse sizes, monthly prices
                            and available dates before requesting a rental.
                        </p>

                        <button onClick={() => openService("greenhouse")}>
                            Explore Greenhouses
                            <span aria-hidden="true">→</span>
                        </button>
                    </article>

                    <article className="home-service-card">
                        <div className="home-card-icon" aria-hidden="true">
                            🐑
                        </div>

                        <span className="home-card-label">
                            SHEEP HANGAR RENTAL
                        </span>

                        <h3>A place for your flock</h3>

                        <p>
                            Find a hangar that fits your sheep.
                            View caretaker terms and choose optional
                            farm-provided feeding.
                        </p>

                        <button onClick={() => openService("raising")}>
                            Explore Sheep Hangars
                            <span aria-hidden="true">→</span>
                        </button>
                    </article>
                </div>
            </section>

            <section className="home-how">
                <div className="home-section-heading">
                    <span className="home-eyebrow">HOW RENTING WORKS</span>
                    <h2>From browsing to booking</h2>
                </div>

                <div className="home-steps-grid">
                    <article>
                        <span className="home-step-number">01</span>
                        <h3>Find your space</h3>
                        <p>
                            Compare prices, capacity and rental availability.
                        </p>
                    </article>

                    <article>
                        <span className="home-step-number">02</span>
                        <h3>Send your request</h3>
                        <p>
                            Log in, choose your dates and review the rental terms.
                        </p>
                    </article>

                    <article>
                        <span className="home-step-number">03</span>
                        <h3>Get farm approval</h3>
                        <p>
                            The farm reviews your request.
                            Your dates are reserved after approval.
                        </p>
                    </article>
                </div>
            </section>

            {!user && (
                <section className="home-account-banner">
                    <div>
                        <h2>Ready to get started?</h2>
                        <p>
                            Log in or create an account to send rental
                            requests and follow their status.
                        </p>
                    </div>

                    <button onClick={() => navigate("account")}>
                        Login / Register
                    </button>
                </section>
            )}

            <footer className="home-footer">
                <strong>AgroHub</strong>
                <p>Farm products. Growing spaces. Sheep care.</p>
            </footer>
        </main>
    );
}