// === Real-Time News / Intelligence Feed ===
// Uses free RSS-to-JSON APIs and public news sources - no API key needed
const NewsFeed = {
    feedContainer: null,
    currentCountry: '',
    refreshInterval: null,

    init() {
        this.feedContainer = document.getElementById('news-feed');
        this.loadGlobalNews();
        // Auto-refresh every 5 minutes
        this.refreshInterval = setInterval(() => this.refresh(), 300000);
    },

    async loadGlobalNews() {
        this.showLoading();
        try {
            // Use multiple free RSS feeds via rss2json (free, no key needed for basic usage)
            const feeds = [
                'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
                'https://feeds.bbci.co.uk/news/world/rss.xml',
                'https://feeds.reuters.com/Reuters/worldNews'
            ];

            const allArticles = [];

            // Fetch from multiple sources concurrently
            const promises = feeds.map(feed => this.fetchRSSFeed(feed));
            const results = await Promise.allSettled(promises);

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    allArticles.push(...result.value);
                }
            });

            if (allArticles.length === 0) {
                // Fallback: try alternative approach
                await this.loadFromGNews();
                return;
            }

            // Sort by date
            allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

            this.renderArticles(allArticles.slice(0, 20));
            Terminal.log('INTEL FEED: ' + allArticles.length + ' ARTICLES LOADED', 'success');
        } catch (err) {
            Terminal.log('NEWS FEED ERROR: ' + err.message, 'error');
            await this.loadFromGNews();
        }
    },

    async fetchRSSFeed(url) {
        try {
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            if (data.status === 'ok' && data.items) {
                return data.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    date: item.pubDate,
                    source: data.feed?.title || 'UNKNOWN',
                    description: item.description?.replace(/<[^>]*>/g, '').substring(0, 100) || ''
                }));
            }
            return [];
        } catch {
            return [];
        }
    },

    async loadFromGNews() {
        try {
            // GNews free tier - no key needed for CORS-proxied requests
            // Fallback to a public aggregator
            const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss%3Fhl%3Den-US%26gl%3DUS%26ceid%3DUS%3Aen');
            const data = await response.json();

            if (data.status === 'ok' && data.items) {
                const articles = data.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    date: item.pubDate,
                    source: 'GOOGLE NEWS',
                    description: item.description?.replace(/<[^>]*>/g, '').substring(0, 100) || ''
                }));
                this.renderArticles(articles.slice(0, 20));
                Terminal.log('INTEL FEED: LOADED VIA SECONDARY SOURCE', 'warning');
            } else {
                this.showError('FEED TEMPORARILY UNAVAILABLE');
            }
        } catch (err) {
            this.showError('ALL FEEDS OFFLINE');
        }
    },

    async loadLocalNews(lat, lon) {
        this.showLoading();

        try {
            // Try to get country-specific news
            const geoResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5`,
                { headers: { 'Accept': 'application/json' } }
            );
            const geoData = await geoResponse.json();
            const country = geoData.address?.country || '';
            const countryCode = geoData.address?.country_code?.toUpperCase() || '';

            if (country) {
                this.currentCountry = country;
                // Get news for this country/region
                const searchQuery = country;
                const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en&gl=${countryCode || 'US'}&ceid=${countryCode || 'US'}:en`;
                const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (data.status === 'ok' && data.items && data.items.length > 0) {
                    const articles = data.items.map(item => ({
                        title: item.title,
                        link: item.link,
                        date: item.pubDate,
                        source: 'REGIONAL INTEL',
                        description: item.description?.replace(/<[^>]*>/g, '').substring(0, 100) || ''
                    }));
                    this.renderArticles(articles.slice(0, 15));
                    Terminal.log('INTEL: LOADED ' + articles.length + ' REGIONAL ARTICLES (' + country.toUpperCase() + ')', 'success');
                    return;
                }
            }

            // Fallback to global
            await this.loadGlobalNews();
        } catch (err) {
            Terminal.log('LOCAL NEWS ERROR: ' + err.message, 'error');
            await this.loadGlobalNews();
        }
    },

    renderArticles(articles) {
        if (!this.feedContainer) return;
        this.feedContainer.innerHTML = '';

        articles.forEach(article => {
            const item = document.createElement('div');
            item.className = 'news-item';

            const timeStr = article.date ? this.formatTime(article.date) : '--:--';

            item.innerHTML = `
                <div class="news-item-time">${timeStr}</div>
                <div class="news-item-source">${this.escapeHtml(article.source)}</div>
                <div class="news-item-title">
                    <a href="${this.escapeHtml(article.link)}" target="_blank" rel="noopener">
                        ${this.escapeHtml(article.title)}
                    </a>
                </div>
            `;
            this.feedContainer.appendChild(item);
        });
    },

    formatTime(dateStr) {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = Math.floor((now - date) / 60000);
            if (diff < 1) return 'JUST NOW';
            if (diff < 60) return diff + 'M AGO';
            if (diff < 1440) return Math.floor(diff / 60) + 'H AGO';
            return Math.floor(diff / 1440) + 'D AGO';
        } catch {
            return '--:--';
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showLoading() {
        if (this.feedContainer) {
            this.feedContainer.innerHTML = '<div class="loading-text">INTERCEPTING TRANSMISSIONS...</div>';
        }
    },

    showError(msg) {
        if (this.feedContainer) {
            this.feedContainer.innerHTML = `<div class="loading-text">${msg}</div>`;
        }
    },

    refresh() {
        if (window.GOV && MapEngine) {
            this.loadLocalNews(MapEngine.currentLat, MapEngine.currentLon);
        } else {
            this.loadGlobalNews();
        }
    }
};
