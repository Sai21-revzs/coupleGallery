// Shared settings for the memory gallery

export const API_URL = 'http://localhost:5000';

// The four photo layouts. `value` matches what is stored in the database.
export const LAYOUTS = [
    { value: 'layout-1', name: 'Solo', count: 1, description: 'One large photo' },
    { value: 'layout-2h', name: 'Horizontal', count: 2, description: 'Two photos side by side' },
    { value: 'layout-2v', name: 'Vertical', count: 2, description: 'Two photos stacked' },
    { value: 'layout-4', name: 'Window Grid', count: 4, description: 'Four photos, 2 × 2' },
];

export const getLayout = (value) => LAYOUTS.find(l => l.value === value);

// Turn a stored path like "/uploads/photos/x.jpg" into a full URL on our own server
export const mediaUrl = (path) => `${API_URL}${path}`;
