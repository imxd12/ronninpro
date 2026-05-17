import { DB } from './db.js';
import { UI } from './ui.js';

export const MapLogic = {
    map: null,
    tripLine: null,
    watchId: null,
    currentTripCoords: [],
    markers: [],
    speedWarningShown: false,
    lastPosition: null,
    
    init() {
        if(!document.getElementById('leaflet-map')) return;
        
        // Initialize map if not already done
        if(!this.map) {
            this.map = L.map('leaflet-map').setView([20.5937, 78.9629], 5); // Default to India roughly
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(this.map);
        }
        
        // Try to locate user immediately
        this.map.locate({setView: true, maxZoom: 16});
        
        this.map.on('locationfound', (e) => {
            const radius = e.accuracy;
            L.circle(e.latlng, radius).addTo(this.map);
        });

        this.setupListeners();
        this.renderRecentTrips();
    },

    setupListeners() {
        const startBtn = document.getElementById('btn-start-trip');
        const stopBtn = document.getElementById('btn-stop-trip');
        const hud = document.getElementById('trip-hud');
        
        startBtn?.addEventListener('click', () => {
            if(!navigator.geolocation) return UI.alert('Geolocation is not supported by your browser.', 'Error', 'fa-times-circle', 'var(--danger)');
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            hud.style.display = 'block';
            UI.playSensory('success');
            
            this.currentTripCoords = [];
            this.tripLine = L.polyline([], {color: '#00ffcc', weight: 4}).addTo(this.map);
            
            this.watchId = navigator.geolocation.watchPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const newLatLng = new L.LatLng(lat, lng);
                
                this.currentTripCoords.push(newLatLng);
                this.tripLine.addLatLng(newLatLng);
                this.map.panTo(newLatLng);
                
                // Calculate distance
                let dist = 0;
                for(let i = 1; i < this.currentTripCoords.length; i++) {
                    dist += this.currentTripCoords[i-1].distanceTo(this.currentTripCoords[i]);
                }
                document.getElementById('trip-dist').innerText = (dist / 1000).toFixed(2);
                
                // Speed Calculation
                let speedKmH = 0;
                if(position.coords.speed !== null) {
                    speedKmH = position.coords.speed * 3.6;
                } else if (this.lastPosition) {
                    const timeDiff = (position.timestamp - this.lastPosition.timestamp) / 1000; // seconds
                    if(timeDiff > 0) {
                        const distDiff = this.lastPosition.latlng.distanceTo(newLatLng); // meters
                        speedKmH = (distDiff / timeDiff) * 3.6;
                    }
                }
                this.lastPosition = { latlng: newLatLng, timestamp: position.timestamp };
                
                document.getElementById('trip-speed').innerText = speedKmH.toFixed(0);
                
                let topSpeed = parseFloat(localStorage.getItem('RonninPro_TopSpeed') || '0');
                if(speedKmH > topSpeed) {
                    topSpeed = speedKmH;
                    localStorage.setItem('RonninPro_TopSpeed', topSpeed);
                }
                document.getElementById('trip-top-speed').innerText = topSpeed.toFixed(0);
                
                if(speedKmH >= 80 && !this.speedWarningShown) {
                    this.speedWarningShown = true;
                    UI.playSensory('heavy');
                    // Show a custom UI alert instead of blocking native alert
                    const alertBanner = document.createElement('div');
                    alertBanner.className = 'offline-banner active';
                    alertBanner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> WARNING: Speed exceeds 80 km/h! Please ride safely.';
                    alertBanner.style.background = '#ff4757';
                    document.body.appendChild(alertBanner);
                    setTimeout(() => alertBanner.remove(), 5000);
                }
                
            }, (err) => {
                console.error(err);
            }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
        });
        
        stopBtn?.addEventListener('click', () => {
            navigator.geolocation.clearWatch(this.watchId);
            
            let dist = parseFloat(document.getElementById('trip-dist').innerText);
            
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            hud.style.display = 'none';
            UI.playSensory('heavy');
            
            if(dist > 0) {
                const routePts = this.currentTripCoords.map(ll => [ll.lat, ll.lng]);
                UI.prompt("Name this trip:", `Trip ${new Date().toLocaleDateString()}`).then(name => {
                    if(name) {
                        DB.add(DB.KEYS.TRIPS, {
                            name: name,
                            distance: dist,
                            date: new Date().toISOString().split('T')[0],
                            route: routePts
                        });
                        this.renderRecentTrips();
                    }
                });
            }
            if(this.tripLine) this.map.removeLayer(this.tripLine);
            this.tripLine = null;
        });

        // Locator Buttons
        document.getElementById('btn-find-fuel')?.addEventListener('click', () => this.findPlaces('fuel'));
        document.getElementById('btn-find-service')?.addEventListener('click', () => this.findPlaces('motorcycle repair'));
    },
    
    findPlaces(type) {
        if(!navigator.geolocation) return UI.alert('Geolocation needed for this feature.', 'Location Required', 'fa-map-marker-alt');
        
        // Use Overpass API or a simple Nominatim search for demo
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            this.map.setView([lat, lon], 14);
            
            // Clear old markers
            this.markers.forEach(m => this.map.removeLayer(m));
            this.markers = [];
            
            // Prioritize Mumbai / Navi Mumbai / Thane / Raigad
            const regionString = "Mumbai, Navi Mumbai, Thane, Raigad";
            const query = type === 'fuel' ? `fuel station in ${regionString}` : `motorcycle mechanic in ${regionString}`;
            
            // We use a broader viewbox if we want to search in that specific region, but since we want nearby:
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&lat=${lat}&lon=${lon}&radius=10000`)
                .then(res => res.json())
                .then(data => {
                    if(data.length === 0) return UI.alert('No places found nearby.', 'No Results', 'fa-search', 'var(--warning)');
                    data.forEach(place => {
                        const marker = L.marker([place.lat, place.lon]).addTo(this.map)
                            .bindPopup(`<b>${place.name || place.display_name.split(',')[0]}</b><br>${type === 'fuel' ? 'Fuel Station' : 'Service Center'}`);
                        this.markers.push(marker);
                    });
                    // Fit bounds
                    const group = new L.featureGroup(this.markers);
                    this.map.fitBounds(group.getBounds());
                    UI.playSensory('success');
                });
        });
    },
    
    renderRecentTrips() {
        const trips = DB.get(DB.KEYS.TRIPS) || [];
        const container = document.getElementById('trips-list');
        if(!container) return;
        
        if(trips.length === 0) {
            container.innerHTML = '<p class="text-sub text-center">No trips logged yet.</p>';
            return;
        }
        
        container.innerHTML = trips.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(trip => `
            <div class="log-item" style="border-radius: 16px; background: rgba(255,255,255,0.03); margin-bottom: 10px;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="font-size:20px; width:40px; height:40px; background:rgba(0, 255, 204, 0.1); border-radius:20px; display:flex; justify-content:center; align-items:center;">
                        <i class="fas fa-route text-accent"></i>
                    </div>
                    <div class="log-details">
                        <div class="log-title">${trip.name}</div>
                        <div class="log-date">${trip.date}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="log-value text-accent" style="margin-right:8px;">${trip.distance.toFixed(2)} km</div>
                    ${trip.route && trip.route.length > 0 ? `<button class="log-edit-btn btn-gpx" data-trip-id="${trip.id}" style="color:var(--success)" title="Export GPX"><i class="fas fa-download"></i></button>` : ''}
                    <button class="log-edit-btn" data-trip-id="${trip.id}"><i class="fas fa-edit"></i></button>
                    <button class="log-delete-btn" data-trip-id="${trip.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.log-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                UI.confirm('Delete this trip?', 'Delete Trip').then(res => {
                    if(res) {
                        DB.remove(DB.KEYS.TRIPS, e.currentTarget.dataset.tripId);
                        this.renderRecentTrips();
                    }
                });
            });
        });
        
        container.querySelectorAll('.log-edit-btn:not(.btn-gpx)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.tripId;
                const trip = DB.get(DB.KEYS.TRIPS).find(t => t.id === id);
                if(trip) {
                    UI.prompt('Edit Trip Name:', trip.name, 'Edit Trip').then(newName => {
                        if(newName && newName.trim()) {
                            DB.update(DB.KEYS.TRIPS, id, { name: newName.trim() });
                            this.renderRecentTrips();
                        }
                    });
                }
            });
        });

        container.querySelectorAll('.btn-gpx').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.tripId;
                const trip = DB.get(DB.KEYS.TRIPS).find(t => t.id === id);
                if(trip) this.exportGPX(trip);
            });
        });
    },

    exportGPX(trip) {
        if(!trip.route || trip.route.length === 0) return UI.alert('No route data for this trip.', 'Error', 'fa-times');
        let gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Ronnin Pro"><trk><name>${trip.name}</name><trkseg>`;
        trip.route.forEach(pt => {
            gpx += `<trkpt lat="${pt[0]}" lon="${pt[1]}"></trkpt>`;
        });
        gpx += `</trkseg></trk></gpx>`;
        
        const blob = new Blob([gpx], {type: 'application/gpx+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${trip.name.replace(/\\s+/g, '_')}.gpx`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
