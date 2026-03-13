// === Weather Intelligence ===
// Uses Open-Meteo API - completely free, no API key needed
const Weather = {
    init() {
        // Will be called when location changes
    },

    async load(lat, lon) {
        const container = document.getElementById('weather-content');
        if (!container) return;

        container.innerHTML = '<div class="loading-text">ACQUIRING WEATHER DATA...</div>';

        try {
            // Open-Meteo: free, open-source, no API key
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,surface_pressure&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.current) {
                this.render(data.current, container);
                Terminal.log('WEATHER: DATA ACQUIRED [' + lat.toFixed(2) + ', ' + lon.toFixed(2) + ']', 'success');
            } else {
                container.innerHTML = '<div class="loading-text">NO WEATHER DATA</div>';
            }
        } catch (err) {
            Terminal.log('WEATHER ERROR: ' + err.message, 'error');
            container.innerHTML = '<div class="loading-text">WEATHER DATA UNAVAILABLE</div>';
        }
    },

    render(current, container) {
        const temp = Math.round(current.temperature_2m);
        const feelsLike = Math.round(current.apparent_temperature);
        const humidity = current.relative_humidity_2m;
        const windSpeed = Math.round(current.wind_speed_10m);
        const pressure = Math.round(current.surface_pressure);
        const weatherCode = current.weather_code;
        const desc = this.getWeatherDescription(weatherCode);
        const icon = this.getWeatherIcon(weatherCode);

        container.innerHTML = `
            <div class="weather-main">
                <span class="weather-icon">${icon}</span>
                <div>
                    <div class="weather-temp">${temp}°F</div>
                    <div class="weather-desc">${desc}</div>
                </div>
            </div>
            <div class="data-row">
                <span class="data-label">FEELS LIKE:</span>
                <span class="data-value">${feelsLike}°F</span>
            </div>
            <div class="data-row">
                <span class="data-label">HUMIDITY:</span>
                <span class="data-value">${humidity}%</span>
            </div>
            <div class="data-row">
                <span class="data-label">WIND:</span>
                <span class="data-value">${windSpeed} MPH</span>
            </div>
            <div class="data-row">
                <span class="data-label">PRESSURE:</span>
                <span class="data-value">${pressure} hPa</span>
            </div>
        `;
    },

    getWeatherDescription(code) {
        const codes = {
            0: 'CLEAR SKY',
            1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
            45: 'FOGGY', 48: 'DEPOSITING RIME FOG',
            51: 'LIGHT DRIZZLE', 53: 'MODERATE DRIZZLE', 55: 'DENSE DRIZZLE',
            56: 'FREEZING DRIZZLE', 57: 'DENSE FREEZING DRIZZLE',
            61: 'SLIGHT RAIN', 63: 'MODERATE RAIN', 65: 'HEAVY RAIN',
            66: 'FREEZING RAIN', 67: 'HEAVY FREEZING RAIN',
            71: 'SLIGHT SNOW', 73: 'MODERATE SNOW', 75: 'HEAVY SNOW',
            77: 'SNOW GRAINS',
            80: 'SLIGHT SHOWERS', 81: 'MODERATE SHOWERS', 82: 'VIOLENT SHOWERS',
            85: 'SLIGHT SNOW SHOWERS', 86: 'HEAVY SNOW SHOWERS',
            95: 'THUNDERSTORM', 96: 'THUNDERSTORM W/ HAIL', 99: 'THUNDERSTORM W/ HEAVY HAIL'
        };
        return codes[code] || 'UNKNOWN';
    },

    getWeatherIcon(code) {
        if (code === 0) return '☀';
        if (code <= 3) return '⛅';
        if (code <= 48) return '🌫';
        if (code <= 57) return '🌧';
        if (code <= 67) return '🌧';
        if (code <= 77) return '❄';
        if (code <= 82) return '🌧';
        if (code <= 86) return '❄';
        if (code >= 95) return '⛈';
        return '🌍';
    }
};
