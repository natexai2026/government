// === System Terminal ===
const Terminal = {
    output: null,
    input: null,
    history: [],
    historyIndex: -1,

    init() {
        this.output = document.getElementById('terminal-output');
        this.input = document.getElementById('terminal-input');
        if (!this.output || !this.input) return;

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.execute(this.input.value.trim());
                this.input.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.input.value = this.history[this.history.length - 1 - this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.input.value = this.history[this.history.length - 1 - this.historyIndex];
                } else {
                    this.historyIndex = -1;
                    this.input.value = '';
                }
            }
        });

        this.log('G.O.V. TERMINAL v3.7.1', 'system');
        this.log('TYPE "help" FOR AVAILABLE COMMANDS', 'system');
        this.log('─'.repeat(40), 'system');
    },

    log(text, type = '') {
        if (!this.output) return;
        const line = document.createElement('div');
        line.className = 'terminal-line' + (type ? ' ' + type : '');
        line.textContent = text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    },

    execute(cmd) {
        if (!cmd) return;
        this.history.push(cmd);
        this.historyIndex = -1;
        this.log('> ' + cmd, '');

        const parts = cmd.toLowerCase().split(' ');
        const command = parts[0];
        const args = parts.slice(1).join(' ');

        switch (command) {
            case 'help':
                this.log('AVAILABLE COMMANDS:', 'system');
                this.log('  help          - Show this message', 'system');
                this.log('  status        - System status report', 'system');
                this.log('  goto <place>  - Navigate to location', 'system');
                this.log('  news          - Refresh intel feed', 'system');
                this.log('  cctv          - Load nearby cameras', 'system');
                this.log('  weather       - Weather for current area', 'system');
                this.log('  threat        - Threat assessment', 'system');
                this.log('  clear         - Clear terminal', 'system');
                this.log('  time          - Current timestamps', 'system');
                this.log('  scan          - Area scan', 'system');
                this.log('  encrypt <msg> - Encrypt a message', 'system');
                break;

            case 'status':
                this.log('SYSTEM STATUS: OPERATIONAL', 'success');
                this.log('  MAP ENGINE: ONLINE', 'success');
                this.log('  NEWS FEED: ACTIVE', 'success');
                this.log('  CCTV NETWORK: STANDBY', 'success');
                this.log('  WEATHER SVC: ONLINE', 'success');
                this.log('  UPTIME: ' + document.getElementById('uptime')?.textContent || '--', '');
                break;

            case 'goto':
                if (args) {
                    this.log('NAVIGATING TO: ' + args.toUpperCase(), 'warning');
                    if (window.GOV && window.GOV.searchLocation) {
                        window.GOV.searchLocation(args);
                    }
                } else {
                    this.log('USAGE: goto <location>', 'error');
                }
                break;

            case 'news':
                this.log('REFRESHING INTELLIGENCE FEED...', 'warning');
                if (window.GOV && window.GOV.refreshNews) {
                    window.GOV.refreshNews();
                }
                break;

            case 'cctv':
                this.log('SCANNING FOR CAMERAS IN CURRENT AREA...', 'warning');
                if (window.GOV && window.GOV.loadCCTV) {
                    window.GOV.loadCCTV();
                }
                break;

            case 'weather':
                this.log('FETCHING WEATHER DATA...', 'warning');
                if (window.GOV && window.GOV.refreshWeather) {
                    window.GOV.refreshWeather();
                }
                break;

            case 'threat':
                this.log('THREAT LEVEL: ' + (document.getElementById('threat-text')?.textContent || 'UNKNOWN'), 'warning');
                this.log('  SEISMIC: ' + (document.getElementById('seismic-level')?.textContent || '--'), '');
                this.log('  CIVIL UNREST: ' + (document.getElementById('unrest-level')?.textContent || '--'), '');
                this.log('  CYBER: ' + (document.getElementById('cyber-level')?.textContent || '--'), '');
                this.log('  HEALTH: ' + (document.getElementById('health-level')?.textContent || '--'), '');
                break;

            case 'clear':
                this.output.innerHTML = '';
                this.log('TERMINAL CLEARED', 'system');
                break;

            case 'time':
                const now = new Date();
                this.log('UTC:   ' + now.toUTCString(), '');
                this.log('LOCAL: ' + now.toLocaleString(), '');
                this.log('EPOCH: ' + Math.floor(now.getTime() / 1000), '');
                break;

            case 'scan':
                this.log('INITIATING AREA SCAN...', 'warning');
                this.typeEffect([
                    'SCANNING RADIO FREQUENCIES... OK',
                    'SCANNING NETWORK TRAFFIC... OK',
                    'SCANNING SATELLITE IMAGERY... OK',
                    'SCANNING SOCIAL MEDIA CHATTER... OK',
                    'SCAN COMPLETE: NO ANOMALIES DETECTED'
                ], 400);
                break;

            case 'encrypt':
                if (args) {
                    const encrypted = btoa(args).split('').map(c => {
                        return String.fromCharCode(c.charCodeAt(0) + 3);
                    }).join('');
                    this.log('ENCRYPTED: ' + encrypted, 'success');
                } else {
                    this.log('USAGE: encrypt <message>', 'error');
                }
                break;

            default:
                this.log('UNKNOWN COMMAND: ' + command, 'error');
                this.log('TYPE "help" FOR AVAILABLE COMMANDS', 'system');
        }
    },

    typeEffect(lines, delay) {
        lines.forEach((line, i) => {
            setTimeout(() => {
                this.log('  ' + line, 'success');
            }, delay * (i + 1));
        });
    }
};
