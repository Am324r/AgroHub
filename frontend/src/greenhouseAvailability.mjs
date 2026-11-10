// Bookings use [startDate, endDate): another rental may start on the end date.
export function availability(house, today) {
    if (house.status === 'maintenance') return { date: null, message: 'Under maintenance — availability date not set' };
    if (house.status === 'busy') return { date: null, message: 'Marked busy by the farm — contact us for availability' };
    const bookings = (house.bookings || [])
        .map(b => ({ start: b.startDate.slice(0, 10), end: b.endDate.slice(0, 10) }))
        .filter(b => b.end > today)
        .sort((a, b) => a.start.localeCompare(b.start));
    let date = today;
    for (const booking of bookings) {
        if (booking.start > date) break;
        if (booking.end > date) date = booking.end;
    }
    const next = bookings.find(b => b.start > date);
    return { date, nextBooking: next?.start || null };
}

export function formatDate(date) {
    return new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
}

export function availabilityText(house, today) {
    const result = availability(house, today);
    if (!result.date) return result.message;
    if (result.date === today) return 'Available now';
    const days = Math.round((Date.parse(result.date) - Date.parse(today)) / 86400000);
    const wait = days >= 45
        ? `about ${Math.round(days / 30)} months`
        : `${days} day${days === 1 ? '' : 's'}`;
    return `Available from ${formatDate(result.date)} — in ${wait}`;
}

export function rentalEnd(start, months) {
    const date = new Date(start + 'T00:00:00Z');
    const end = new Date(date);
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(date.getUTCDate(), lastDay));
    return end.toISOString().slice(0, 10);
}

export function rentalConflict(house, start, months) {
    if (!start || !Number.isInteger(months) || months < 1 || months > 24) return false;
    const end = rentalEnd(start, months);
    return (house.bookings || []).some(b => b.startDate.slice(0, 10) < end && b.endDate.slice(0, 10) > start);
}
