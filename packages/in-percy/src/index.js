// Returns true if executing in the Percy rendering environment
export default function inPercy() {
    const hasHostname = typeof window === 'object' && window.location && window.location.hostname;
    return hasHostname && window.location.hostname.match('proxyme.percy.io');
}
