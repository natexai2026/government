// === Interactive World Map (Leaflet) ===
const MapEngine = {
    map: null,
    currentLat: 40.7128,
    currentLon: -74.0060,
    tileLayers: {},
    activeLayer: 'dark',
    gridLayer: null,
    gridVisible: false,

    init() {
        this.map = L.map('map', {
            center: [20, 0],
            zoom: 3,
            zoomControl: false,
            attributionControl: false,
            minZoom: 2,
            maxZoom: 19,
            worldCopyJump: true,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 120,
            zoomAnimation: true,
            markerZoomAnimation: true,
            inertia: true,
            inertiaDeceleration: 2000,
            maxBoundsViscosity: 1.0,
            maxBounds: [[-85, -Infinity], [85, Infinity]]
        });

        // Tile layers - all free, no API key needed
        // CartoDB dark_all: natively dark-themed, no filter needed
        this.tileLayers.dark = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            { maxZoom: 20, subdomains: 'abcd' }
        );

        // CartoDB dark with labels only (cleaner at low zoom)
        this.tileLayers.satellite = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 18 }
        );

        // Stamen toner - high contrast black and white
        this.tileLayers.topo = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
            { maxZoom: 20, subdomains: 'abcd' }
        );

        this.tileLayers.dark.addTo(this.map);

        // Events
        this.map.on('moveend', () => this.onMapMove());
        this.map.on('zoomend', () => this.onZoomChange());
        this.map.on('mousemove', (e) => this.onMouseMove(e));
        this.map.on('click', (e) => this.onMapClick(e));

        // Layer toggle buttons
        document.getElementById('btn-dark')?.addEventListener('click', () => this.setLayer('dark'));
        document.getElementById('btn-satellite')?.addEventListener('click', () => this.setLayer('satellite'));
        document.getElementById('btn-topo')?.addEventListener('click', () => this.setLayer('topo'));
        document.getElementById('btn-grid')?.addEventListener('click', () => this.toggleGrid());

        // Search
        document.getElementById('search-btn')?.addEventListener('click', () => {
            const q = document.getElementById('search-input')?.value;
            if (q) this.searchLocation(q);
        });

        document.getElementById('search-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = e.target.value;
                if (q) this.searchLocation(q);
            }
        });

        this.onZoomChange();
        this.updateLocation();
    },

    setLayer(name) {
        const tilePane = document.querySelector('.leaflet-tile-pane');

        Object.values(this.tileLayers).forEach(l => this.map.removeLayer(l));
        this.tileLayers[name].addTo(this.map);
        this.activeLayer = name;

        // Update filter - only satellite needs adjustment, others are natively dark
        if (tilePane) {
            tilePane.className = 'leaflet-tile-pane';
            if (name === 'satellite') tilePane.classList.add('satellite');
        }

        // Update button states
        document.querySelectorAll('.map-controls .map-ctrl-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('btn-' + name)?.classList.add('active');

        Terminal.log('MAP LAYER: ' + name.toUpperCase(), 'system');
    },

    toggleGrid() {
        if (this.gridVisible && this.gridLayer) {
            this.map.removeLayer(this.gridLayer);
            this.gridVisible = false;
            document.getElementById('btn-grid')?.classList.remove('active');
            Terminal.log('GRID: DISABLED', 'system');
        } else {
            this.createGrid();
            this.gridVisible = true;
            document.getElementById('btn-grid')?.classList.add('active');
            Terminal.log('GRID: ENABLED', 'system');
        }
    },

    createGrid() {
        if (this.gridLayer) this.map.removeLayer(this.gridLayer);

        const lines = [];
        for (let lat = -80; lat <= 80; lat += 10) {
            lines.push(L.polyline([[lat, -180], [lat, 180]], {
                color: '#00ff41', weight: 0.3, opacity: 0.3, dashArray: '4,8'
            }));
        }
        for (let lng = -180; lng <= 180; lng += 10) {
            lines.push(L.polyline([[-90, lng], [90, lng]], {
                color: '#00ff41', weight: 0.3, opacity: 0.3, dashArray: '4,8'
            }));
        }
        this.gridLayer = L.layerGroup(lines);
        this.gridLayer.addTo(this.map);
    },

    onMapMove() {
        const center = this.map.getCenter();
        this.currentLat = center.lat;
        this.currentLon = center.lng;
        this.updateLocation();
    },

    onZoomChange() {
        const zoom = this.map.getZoom();
        const el = document.getElementById('zoom-level');
        if (el) el.textContent = 'ZOOM: ' + zoom;
    },

    onMouseMove(e) {
        const el = document.getElementById('mouse-coords');
        if (el) {
            el.textContent = e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4);
        }
    },

    onMapClick(e) {
        this.currentLat = e.latlng.lat;
        this.currentLon = e.latlng.lng;
        this.updateLocation();
        this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    },

    updateLocation() {
        document.getElementById('current-lat').textContent = this.currentLat.toFixed(4);
        document.getElementById('current-lon').textContent = this.currentLon.toFixed(4);
    },

    async searchLocation(query) {
        Terminal.log('SEARCHING: ' + query.toUpperCase(), 'warning');
        const resultsDiv = document.getElementById('search-results');
        if (resultsDiv) resultsDiv.innerHTML = '<div class="loading-text">SEARCHING...</div>';

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await response.json();

            if (data.length > 0) {
                if (resultsDiv) resultsDiv.innerHTML = '';

                data.forEach(result => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = result.display_name.substring(0, 60);
                    item.addEventListener('click', () => {
                        this.flyTo(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
                        if (resultsDiv) resultsDiv.innerHTML = '';
                    });
                    if (resultsDiv) resultsDiv.appendChild(item);
                });

                // Auto-navigate to first result
                const first = data[0];
                this.flyTo(parseFloat(first.lat), parseFloat(first.lon), first.display_name);
            } else {
                if (resultsDiv) resultsDiv.innerHTML = '<div class="loading-text">NO RESULTS</div>';
                Terminal.log('NO RESULTS FOR: ' + query.toUpperCase(), 'error');
            }
        } catch (err) {
            Terminal.log('SEARCH ERROR: ' + err.message, 'error');
            if (resultsDiv) resultsDiv.innerHTML = '<div class="loading-text">SEARCH ERROR</div>';
        }
    },

    flyTo(lat, lon, name) {
        this.currentLat = lat;
        this.currentLon = lon;
        this.map.flyTo([lat, lon], 12, { duration: 1.5 });
        this.updateLocation();

        if (name) {
            const shortName = name.split(',').slice(0, 2).join(',').toUpperCase();
            document.getElementById('current-location').textContent = shortName;
            Terminal.log('NAVIGATED TO: ' + shortName, 'success');
        }

        // Trigger data refresh
        setTimeout(() => {
            if (window.GOV) {
                window.GOV.refreshWeather();
                window.GOV.refreshNews();
                window.GOV.loadCCTV();
                window.GOV.updateAreaStats(lat, lon);
            }
        }, 500);
    },

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await response.json();
            if (data.display_name) {
                const shortName = data.display_name.split(',').slice(0, 2).join(',').toUpperCase();
                document.getElementById('current-location').textContent = shortName;

                const addr = data.address || {};
                document.getElementById('country-name').textContent = (addr.country || '--').toUpperCase();
                document.getElementById('current-timezone').textContent = 'UTC' + (lon > 0 ? '+' : '') + Math.round(lon / 15);

                Terminal.log('LOCATION: ' + shortName, '');

                if (window.GOV) {
                    window.GOV.refreshWeather();
                    window.GOV.refreshNews();
                    window.GOV.loadCCTV();
                    window.GOV.updateAreaStats(lat, lon);
                }
            }
        } catch (err) {
            // Silently fail for reverse geocode
        }
    }
};
