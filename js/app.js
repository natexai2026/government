// === G.O.V. Main Application Controller ===
window.GOV = {
    startTime: Date.now(),
    bootComplete: false,

    init() {
        this.showBootScreen().then(() => {
            Terminal.init();
            MapEngine.init();
            NewsFeed.init();
            CCTVManager.init();
            Weather.init();

            this.startClock();
            this.startUptime();

            // Load initial data for default location
            setTimeout(() => {
                this.refreshWeather();
                this.updateAreaStats(MapEngine.currentLat, MapEngine.currentLon);
                this.generateThreatLevel();
            }, 1000);

            Terminal.log('ALL SYSTEMS INITIALIZED', 'success');
            Terminal.log('CLEARANCE LEVEL 5 GRANTED', 'success');
            Terminal.log('─'.repeat(40), 'system');
            Terminal.log('WELCOME, OPERATOR.', 'system');

            this.bootComplete = true;
        });
    },

    async showBootScreen() {
        // Create boot screen
        const boot = document.createElement('div');
        boot.id = 'boot-screen';
        boot.innerHTML = '<div id="boot-text"></div><span id="boot-cursor"></span>';
        document.body.appendChild(boot);

        const bootLines = [
            'G.O.V. SYSTEM INITIALIZING...',
            '',
            '> LOADING KERNEL MODULES.......... OK',
            '> INITIALIZING SECURE COMMS........ OK',
            '> CONNECTING SATELLITE UPLINK...... OK',
            '> LOADING MAP ENGINE............... OK',
            '> INITIALIZING CCTV NETWORK........ OK',
            '> CONNECTING NEWS AGGREGATOR....... OK',
            '> LOADING WEATHER SERVICES......... OK',
            '> RUNNING DIAGNOSTICS.............. PASS',
            '> VERIFYING CLEARANCE.............. LEVEL 5',
            '',
            'ALL SYSTEMS OPERATIONAL.',
            'ACCESS GRANTED.',
            ''
        ];

        const textEl = document.getElementById('boot-text');
        for (const line of bootLines) {
            await this.typeBootLine(textEl, line);
            await this.sleep(80);
        }

        await this.sleep(400);
        boot.classList.add('fade-out');
        await this.sleep(500);
        boot.remove();
    },

    async typeBootLine(el, text) {
        const line = document.createElement('div');
        el.appendChild(line);
        for (let i = 0; i < text.length; i++) {
            line.textContent += text[i];
            if (text[i] === '.' && text[i+1] === '.') {
                // Speed through dots
                await this.sleep(5);
            } else {
                await this.sleep(15);
            }
        }
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    startClock() {
        const update = () => {
            const now = new Date();
            const utc = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
            document.getElementById('datetime').textContent = utc;

            // Update local time for target
            const lon = MapEngine.currentLon;
            const offsetHours = Math.round(lon / 15);
            const localTime = new Date(now.getTime() + offsetHours * 3600000);
            document.getElementById('local-time').textContent =
                localTime.toISOString().substring(11, 19);
        };
        update();
        setInterval(update, 1000);
    },

    startUptime() {
        const update = () => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
            const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            document.getElementById('uptime').textContent = 'UPTIME: ' + h + ':' + m + ':' + s;
        };
        update();
        setInterval(update, 1000);
    },

    refreshWeather() {
        Weather.load(MapEngine.currentLat, MapEngine.currentLon);
    },

    refreshNews() {
        NewsFeed.loadLocalNews(MapEngine.currentLat, MapEngine.currentLon);
    },

    loadCCTV() {
        if (CCTVManager.visible) {
            CCTVManager.loadCameras();
        }
    },

    searchLocation(query) {
        MapEngine.searchLocation(query);
    },

    updateAreaStats(lat, lon) {
        // Generate realistic area statistics based on location
        this.reverseGeocodeForStats(lat, lon);
        this.generateThreatLevel();
    },

    async reverseGeocodeForStats(lat, lon) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&extratags=1`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await response.json();

            if (data.address) {
                const country = data.address.country || '--';
                document.getElementById('country-name').textContent = country.toUpperCase();

                // Try to get population from extratags
                const pop = data.extratags?.population;
                if (pop) {
                    document.getElementById('population').textContent = parseInt(pop).toLocaleString();
                } else {
                    // Estimate based on location type
                    this.estimatePopulation(data);
                }
            }

            // Calculate timezone offset
            const offsetHours = Math.round(lon / 15);
            document.getElementById('current-timezone').textContent = 'UTC' + (offsetHours >= 0 ? '+' : '') + offsetHours;

        } catch {
            // Silently fail
        }
    },

    estimatePopulation(geoData) {
        const type = geoData.type || '';
        const popEl = document.getElementById('population');
        const areaEl = document.getElementById('area-size');
        const densEl = document.getElementById('density');

        // Rough estimates based on place type
        let pop, area, density;
        if (type === 'city' || geoData.address?.city) {
            pop = Math.floor(Math.random() * 5000000) + 100000;
            area = Math.floor(Math.random() * 800) + 50;
        } else if (type === 'town' || geoData.address?.town) {
            pop = Math.floor(Math.random() * 100000) + 5000;
            area = Math.floor(Math.random() * 100) + 10;
        } else {
            pop = Math.floor(Math.random() * 5000) + 100;
            area = Math.floor(Math.random() * 500) + 50;
        }

        density = Math.floor(pop / area);

        if (popEl) popEl.textContent = pop.toLocaleString();
        if (areaEl) areaEl.textContent = area + ' KM²';
        if (densEl) densEl.textContent = density + '/KM²';
    },

    generateThreatLevel() {
        const levels = ['LOW', 'LOW', 'LOW', 'MODERATE', 'MODERATE', 'ELEVATED'];
        const colors = {
            'LOW': { class: 'threat-low', fill: 20 },
            'MODERATE': { class: 'threat-moderate', fill: 45 },
            'ELEVATED': { class: 'threat-high', fill: 65 },
            'HIGH': { class: 'threat-high', fill: 80 },
            'CRITICAL': { class: 'threat-critical', fill: 95 }
        };

        const subLevels = ['LOW', 'LOW', 'LOW', 'MODERATE', 'ELEVATED'];

        const overall = levels[Math.floor(Math.random() * levels.length)];
        const config = colors[overall];

        const threatText = document.getElementById('threat-text');
        const threatFill = document.getElementById('threat-fill');

        if (threatText) {
            threatText.textContent = overall;
            threatText.className = 'threat-text ' + config.class;
        }
        if (threatFill) {
            threatFill.style.width = config.fill + '%';
            if (config.fill > 60) {
                threatFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff3333)';
            } else if (config.fill > 40) {
                threatFill.style.background = 'linear-gradient(90deg, #00ff41, #ffaa00)';
            } else {
                threatFill.style.background = 'linear-gradient(90deg, #00ff41, #00cc33)';
            }
        }

        // Sub-levels
        ['seismic-level', 'unrest-level', 'cyber-level', 'health-level'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const level = subLevels[Math.floor(Math.random() * subLevels.length)];
                el.textContent = level;
                el.className = 'data-value ' + (colors[level]?.class || 'threat-low');
            }
        });
    }
};

// Boot the system
document.addEventListener('DOMContentLoaded', () => {
    window.GOV.init();
});
