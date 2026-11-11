import { useEffect, useState } from 'react';
import Greenhouses from './Greenhouses';
import Hangars from './Hangars';
import Contracts from './Contracts';
import './AdminDashboard.css';
import './CustomerDashboard.css';
const menu = [['overview','Overview'],['products','Shop Products'],['services','Farm Services'],['greenhouse','Greenhouses'],['raising','Sheep Hangars'],['requests','My Rental Requests'],['contracts','Previous Sheep Contracts']];
export default function CustomerDashboard({ token, user, logout, products, initialTab = 'overview' }) {
    const [tab, setTab] = useState(initialTab);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    useEffect(() => {
        if (!['overview','requests'].includes(tab)) return;
        let active = true;
        async function load() {
            setLoading(true); setError('');
            try {
                const results = [];
                for (const [path,type,name] of [['greenhouses','Greenhouse','greenhouseName'],['hangars','Sheep Hangar','hangarName']]) {
                    const res = await fetch(`/api/${path}/requests`, { headers: { Authorization: `Bearer ${token}` } });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Could not load your requests');
                    results.push(...data.map(r => ({ ...r, type, spaceName:r[name], destination:path === 'hangars' ? 'raising' : 'greenhouse' })));
                }
                results.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
                if (active) setRequests(results);
            } catch (err) { if(active) setError(err.message); }
            finally { if(active) setLoading(false); }
        }
        load(); return () => { active = false; };
    }, [token, tab, refresh]);
    const cards = <div className="admin-inventory-grid"><article className="admin-inventory-card"><div className="admin-space-banner">GREENHOUSES</div><div className="admin-card-content"><h3>Room for your crops</h3><p>Compare sizes, monthly prices and available rental dates.</p><button onClick={() => setTab('greenhouse')}>Explore greenhouses</button></div></article><article className="admin-inventory-card"><div className="admin-space-banner hangar">SHEEP HANGARS</div><div className="admin-card-content"><h3>A place for your flock</h3><p>Choose a hangar, caretaker terms and optional farm feeding.</p><button onClick={() => setTab('raising')}>Explore sheep hangars</button></div></article></div>;
    return <div className="admin-app customer-dashboard"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-logo">A</span><div><strong>AgroHub</strong><small>Customer Dashboard</small></div></div><nav aria-label="Customer navigation">{menu.map(([value,label]) => <button key={value} className={tab === value ? 'active' : ''} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{label}</button>)}</nav><div className="admin-sidebar-footer"><p>{user.name}</p><small>Customer account</small><button onClick={logout}>Logout</button></div></aside><main className="admin-main"><header className="admin-topbar"><div><p className="admin-eyebrow">YOUR AGROHUB ACCOUNT</p><h1>{menu.find(item => item[0] === tab)?.[1] || 'Overview'}</h1><p>Welcome, {user.name}. Find your next farm opportunity.</p></div><div className="admin-account"><span className="admin-avatar">{user.name?.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><small>Customer</small></div></div></header>
    {['overview','requests'].includes(tab) && <><p role="status">{loading ? 'Loading your requests…' : error}</p><button className="admin-outline admin-refresh" disabled={loading} onClick={() => setRefresh(refresh + 1)}>Refresh my requests</button></>}
    {tab === 'overview' && <><div className="admin-stats"><article className="admin-stat"><span>My rental requests</span><strong>{loading || error ? '—' : requests.length}</strong></article><article className="admin-stat"><span>Pending approval</span><strong>{loading || error ? '—' : requests.filter(r => r.status === 'pending').length}</strong></article><article className="admin-stat"><span>Approved rentals</span><strong>{loading || error ? '—' : requests.filter(r => r.status === 'approved').length}</strong></article><article className="admin-stat"><span>Farm products</span><strong>{products.length}</strong></article></div><section className="admin-panel"><h2>Explore farm services</h2>{cards}</section><section className="admin-panel"><h2>Fresh from the farm</h2><p>Browse sheep, clover and seedlings with current prices and stock.</p><button onClick={() => setTab('products')}>Shop products</button></section></>}
    {tab === 'services' && <section className="admin-panel"><h2>Choose a farm service</h2>{cards}</section>}
    {tab === 'products' && <section className="admin-panel"><h2>Available farm products</h2><div className="admin-product-grid">{products.map(p => <article key={p._id} className="admin-product-card"><span className="admin-status">{p.category}</span><h3>{p.name}</h3><p>{p.description}</p><strong>{p.price} EGP</strong><p>{p.quantity > 0 ? `Available: ${p.quantity}` : 'Out of stock'}</p></article>)}{!products.length && <p>No products available.</p>}</div></section>}
    {tab === 'greenhouse' && <Greenhouses token={token} user={user} />}
    {tab === 'raising' && <Hangars token={token} user={user} />}
    {tab === 'contracts' && <section className="admin-panel"><Contracts token={token} user={user} products={products} /></section>}
    {tab === 'requests' && !loading && !error && <section className="admin-panel"><h2>My rental requests</h2><div className="admin-product-grid">{requests.map(r => <article className="admin-product-card" key={r.type+r._id}><span className={'admin-status '+r.status}>{r.status}</span><h3>{r.spaceName}</h3><p>{r.type}</p><p>{r.startDate.slice(0,10)} to {r.endDate.slice(0,10)}</p><button onClick={() => setTab(r.destination)}>View details / manage</button></article>)}{!requests.length && <p>You have no rental requests yet.</p>}</div></section>}
    </main></div>;
}
