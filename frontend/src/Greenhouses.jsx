import { useEffect, useState } from 'react';
import './Greenhouses.css';
import { availability, availabilityText, formatDate, rentalConflict } from './greenhouseAvailability.mjs';
const emptyHouse = { name: '', size: '', monthlyPrice: '', status: 'available' };
const emptyRental = { seedling: '', phone: '', startDate: '', durationMonths: '', proposedShare: '', notes: '' };
export default function Greenhouses({ token, user, onLogin }) {
    const [houses, setHouses] = useState([]);
    const [requests, setRequests] = useState([]);
    const [house, setHouse] = useState(emptyHouse);
    const [editing, setEditing] = useState(null);
    const [selected, setSelected] = useState(null);
    const [rental, setRental] = useState(emptyRental);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const admin = user?.role === 'admin';
    async function api(path, method = 'GET', body) {
        const res = await fetch('/api/greenhouses' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Request failed');
        return data;
    }
    async function load() {
        const [inventory, rentals] = await Promise.all([api(''), user ? api('/requests') : Promise.resolve([])]);
        setHouses(inventory); setRequests(rentals);
    }
    useEffect(() => {
        let active = true;
        async function initial() {
            setLoading(true);
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const responses = await Promise.all([fetch('/api/greenhouses'), ...(user ? [fetch('/api/greenhouses/requests', { headers })] : [])]);
                const data = await Promise.all(responses.map(async res => { const body = await res.json(); if (!res.ok) throw new Error(body.message || 'Could not load greenhouses'); return body; }));
                if (active) { setHouses(data[0]); setRequests(data[1] || []); }
            } catch (err) { if (active) setMessage(err.message); }
            finally { if (active) setLoading(false); }
        }
        initial(); return () => { active = false; };
    }, [token, user]);
    async function act(fn) {
        setBusy(true); setMessage('');
        try { const result = await fn(); await load(); setMessage(result?.message || 'Saved successfully'); }
        catch (err) { setMessage(err.message); }
        finally { setBusy(false); }
    }
    function saveHouse(e) {
        e.preventDefault();
        act(async () => { const data = await api(editing ? '/' + editing : '', editing ? 'PUT' : 'POST', { ...house, size: Number(house.size), monthlyPrice: Number(house.monthlyPrice) }); setHouse(emptyHouse); setEditing(null); return data; });
    }
    const today = new Date().toISOString().slice(0, 10);
    const occupied = h => h.status !== 'maintenance' && (h.status === 'busy' || availability(h, today).date > today);
    const selectedAvailability = selected ? availability(selected, today) : null;
    const conflict = selected ? rentalConflict(selected, rental.startDate, Number(rental.durationMonths)) : false;
    return <section className="gh">
        <h2>Greenhouse Rental</h2><p>Choose a growing space. Monthly prices are expected prices; final terms are agreed with the farm.</p>
        <p role="status" aria-live="polite">{message}</p>
        {loading ? <p>Loading greenhouses…</p> : <>
            {admin && <div className="gh-grid gh-summary">{[['Total', houses.length], ['Available now', houses.filter(h => h.status === 'available' && !occupied(h)).length], ['Busy now', houses.filter(occupied).length], ['Maintenance', houses.filter(h => h.status === 'maintenance').length]].map(([label, count]) => <article className="gh-card" key={label}><strong>{count}</strong><span>{label}</span></article>)}</div>}
            <div className="gh-grid">
                {houses.map(h => <article className="gh-card" key={h._id}>
                    <span className="gh-badge">{occupied(h) ? 'Busy now' : h.status}</span><h3>{h.name}</h3>
                    <p>{h.size} m²</p><p><strong>{h.monthlyPrice.toLocaleString()} EGP</strong> / month</p>
                    <p className="gh-availability">{availabilityText(h, today)}</p>
                    {availability(h, today).nextBooking && <p>Next reservation starts {formatDate(availability(h, today).nextBooking)}. Your rental must finish by that date or use another free period.</p>}
                    {h.bookings.length > 0 && <details><summary>Reserved periods</summary>{h.bookings.map((b, i) => <p key={i}>{b.startDate.slice(0, 10)} to {b.endDate.slice(0, 10)} (end exclusive)</p>)}</details>}
                    {admin ? <div className="gh-actions"><button disabled={busy} onClick={() => { setEditing(h._id); setHouse({ name: h.name, size: h.size, monthlyPrice: h.monthlyPrice, status: h.status }); }}>Edit</button><button disabled={busy} onClick={() => { if (window.confirm('Delete this greenhouse? Greenhouses with request history are kept.')) act(() => api('/' + h._id, 'DELETE')); }}>Delete</button></div> : <button disabled={busy || h.status !== 'available'} onClick={() => { if (!user) { onLogin(); return; } setSelected(h); setRental({ ...emptyRental, startDate: availability(h, today).date || today }); }}>Request rental</button>}
                </article>)}
                {!houses.length && <p>No greenhouses registered yet.</p>}
                {admin && <form className="gh-card gh-form" onSubmit={saveHouse}>
                    <h3>{editing ? 'Edit greenhouse' : 'Add greenhouse'}</h3>
                    <label>Name / number<input required maxLength={100} value={house.name} onChange={e => setHouse({ ...house, name: e.target.value })} /></label>
                    <label>Size (m²)<input type="number" required min="0.01" step="0.01" value={house.size} onChange={e => setHouse({ ...house, size: e.target.value })} /></label>
                    <label>Expected EGP / month<input type="number" required min="0" step="0.01" value={house.monthlyPrice} onChange={e => setHouse({ ...house, monthlyPrice: e.target.value })} /></label>
                    <label>Status<select value={house.status} onChange={e => setHouse({ ...house, status: e.target.value })}>{['available', 'busy', 'maintenance'].map(s => <option key={s}>{s}</option>)}</select></label>
                    <button disabled={busy}>Save greenhouse</button>{editing && <button type="button" onClick={() => { setEditing(null); setHouse(emptyHouse); }}>Cancel edit</button>}
                </form>}
            </div>
            {selected && user && !admin && <form className="gh-card gh-form gh-rental" onSubmit={e => { e.preventDefault(); if (conflict) { setMessage('These dates overlap an approved rental. Choose another start date or a shorter duration.'); return; } act(async () => { const data = await api('/' + selected._id + '/requests', 'POST', { ...rental, durationMonths: Number(rental.durationMonths), proposedShare: Number(rental.proposedShare) }); setSelected(null); return data; }); }}>
                <h3>Request {selected.name}</h3><p className="gh-availability">{availabilityText(selected, today)}</p><p>{selected.size} m² · {selected.monthlyPrice} EGP / month expected</p>
                <div className="gh-grid">
                    <label>Seedling / crop name<input required maxLength={100} value={rental.seedling} onChange={e => setRental({ ...rental, seedling: e.target.value })} /></label>
                    <label>Phone number<input type="tel" required pattern="\+?[0-9 ()\-]{7,20}" value={rental.phone} onChange={e => setRental({ ...rental, phone: e.target.value })} /></label>
                    <label>Start date<input type="date" required min={selectedAvailability?.date || today} value={rental.startDate} onChange={e => setRental({ ...rental, startDate: e.target.value })} /></label>
                    <label>Duration (months)<input type="number" required min="1" max="24" step="1" value={rental.durationMonths} onChange={e => setRental({ ...rental, durationMonths: e.target.value })} /></label>
                    <label>Proposed customer profit share (%)<input type="number" required min="0" max="100" step="0.01" value={rental.proposedShare} onChange={e => setRental({ ...rental, proposedShare: e.target.value })} /></label>
                    <label>Notes<textarea maxLength={1000} value={rental.notes} onChange={e => setRental({ ...rental, notes: e.target.value })} /></label>
                </div><p>Submitting starts a discussion. Dates are reserved only after admin approval.</p><p role="status">{conflict ? "These dates overlap an approved rental. Choose another start date or a shorter duration." : ""}</p><button disabled={busy || conflict}>Send request</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
            </form>}
            {user && <><h3>{admin ? 'All rental requests' : 'My rental requests'}</h3><div className="gh-grid">{requests.map(r => <RequestCard key={r._id} r={r} admin={admin} busy={busy} onAction={(status, terms = {}) => act(() => api(`/${r.greenhouseId}/requests/${r._id}`, 'PATCH', { status, ...terms }))} />)}{!requests.length && <p>No rental requests yet.</p>}</div></>}
        </>}
    </section>;
}
function RequestCard({ r, admin, busy, onAction }) {
    const [price, setPrice] = useState(r.expectedMonthlyPrice);
    const [share, setShare] = useState(r.proposedShare);
    return <article className="gh-card"><span className="gh-badge">{r.status}</span><h4>{r.greenhouseName} · {r.seedling}</h4>
        {admin && <p>{r.customer?.name} · {r.customer?.email}<br />Phone: {r.phone}</p>}
        <p>{r.startDate.slice(0, 10)} to {r.endDate.slice(0, 10)}<br />{r.durationMonths} months · proposed customer share {r.proposedShare}%</p>
        <p>Expected {r.expectedMonthlyPrice} EGP / month</p>{r.notes && <p>{r.notes}</p>}
        {r.status === 'approved' && <p>Agreed: {r.agreedMonthlyPrice} EGP / month · customer share {r.agreedShare}%</p>}
        {r.status === 'pending' && (admin ? <form className="gh-form" onSubmit={e => { e.preventDefault(); onAction('approved', { agreedMonthlyPrice: Number(price), agreedShare: Number(share) }); }}>
            <label>Agreed EGP / month<input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label>
            <label>Agreed customer share (%)<input required type="number" min="0" max="100" step="0.01" value={share} onChange={e => setShare(e.target.value)} /></label>
            <button disabled={busy}>Approve agreed terms</button><button type="button" disabled={busy} onClick={() => onAction('rejected')}>Reject</button>
        </form> : <button disabled={busy} onClick={() => onAction('cancelled')}>Cancel request</button>)}
    </article>;
}
