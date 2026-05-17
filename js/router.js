import { UI } from './ui.js';
import { DB } from './db.js';
import { Analytics } from './analytics.js';
import { MapLogic } from './map.js';

export const Router = {
    async loadView(route) {
        try {
            document.querySelectorAll('.dock-item').forEach(i => i.classList.remove('active'));
            const activeDock = document.querySelector(`.dock-item[data-route="${route}"]`);
            if(activeDock) activeDock.classList.add('active');

            const appRoot = document.getElementById('app-root');
            
            // Outgoing Transition
            appRoot.classList.add('view-leaving');
            appRoot.classList.remove('view-entering');
            
            await new Promise(res => setTimeout(res, 150)); // Outgoing delay

            const response = await fetch(`./views/${route}.html`);
            const html = await response.text();
            appRoot.innerHTML = html;
            this.rehydrate(route);
            UI.initScrollAnimations();
            UI.playSensory('light');

            // Force reflow
            void appRoot.offsetWidth;
            
            // Incoming Transition
            appRoot.classList.remove('view-leaving');
            appRoot.classList.add('view-entering');

        } catch (e) {
            console.error(e);
            const appRoot = document.getElementById('app-root');
            appRoot.innerHTML = `<h2 class="text-center mt-4">Error loading view</h2>`;
            appRoot.classList.remove('view-leaving');
            appRoot.classList.add('view-entering');
        }
    },

    async loadModals() {
        try {
            const html = await fetch(`./views/modals.html`).then(res => res.text());
            document.getElementById('modals-root').innerHTML = html;
        } catch(e) {
            console.error("Modals failed to load.");
        }
    },

    fetchWeather() {
        const tempEl = document.getElementById('weather-temp');
        const descEl = document.getElementById('weather-desc');
        const iconEl = document.getElementById('weather-icon');
        const scoreEl = document.getElementById('weather-score');
        if(!tempEl || tempEl.dataset.loaded) return;

        if(!navigator.geolocation) {
            descEl.innerText = "Location disabled";
            return;
        }

        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
                .then(res => res.json())
                .then(data => {
                    if(!data.current_weather) return;
                    const w = data.current_weather;
                    tempEl.innerText = `${w.temperature}°C`;
                    tempEl.dataset.loaded = 'true';
                    
                    let desc = "Clear";
                    let icon = "fa-sun";
                    let color = "var(--accent)";
                    let score = 95;
                    let scoreColor = "var(--accent)";
                    
                    if(w.weathercode >= 1 && w.weathercode <= 3) { desc = "Partly Cloudy"; icon = "fa-cloud-sun"; }
                    else if(w.weathercode >= 45 && w.weathercode <= 48) { desc = "Foggy"; icon = "fa-smog"; score = 60; scoreColor = "#ffa502"; }
                    else if(w.weathercode >= 51 && w.weathercode <= 67) { desc = "Rainy"; icon = "fa-cloud-rain"; score = 40; color = "#1e90ff"; scoreColor = "var(--danger)"; }
                    else if(w.weathercode >= 71) { desc = "Snow/Harsh"; icon = "fa-snowflake"; score = 20; color = "#fff"; scoreColor = "var(--danger)"; }
                    
                    descEl.innerText = desc;
                    iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
                    iconEl.style.color = color;
                    
                    scoreEl.innerText = `${score}%`;
                    scoreEl.style.color = scoreColor;
                    scoreEl.style.background = score >= 80 ? 'rgba(0,255,204,0.1)' : 'rgba(255,71,87,0.1)';
                }).catch(() => {
                    descEl.innerText = "Offline";
                });
        }, () => {
            descEl.innerText = "Location denied";
        });
    },

    rehydrate(route) {
        if(route === 'dashboard') {
            this.renderGreeting();
            const stats = Analytics.calculateStats();
            document.getElementById('dash-odo').innerText = stats.totalOdo;
            document.getElementById('dash-mileage').innerText = stats.avgMileage.toFixed(2);
            document.getElementById('dash-fuel').innerText = stats.totalFuel.toFixed(2);
            document.getElementById('dash-maint').innerText = `$${stats.totalMaintCost}`;
            
            // Speedometer & Efficiency
            const speedValueEl = document.getElementById('dash-speed-value');
            const speedFillEl = document.getElementById('dash-speed-fill');
            const effBadgeEl = document.getElementById('dash-eff-badge');
            const estRangeEl = document.getElementById('dash-est-range');
            const fuelCapEl = document.getElementById('dash-fuel-cap');
            const costKmEl = document.getElementById('dash-cost-km');

            if(costKmEl) costKmEl.innerText = stats.costPerKm > 0 ? `$${stats.costPerKm.toFixed(2)}` : '--';

            if(speedValueEl) speedValueEl.innerText = stats.avgMileage.toFixed(1);
            if(speedFillEl) {
                const maxMileage = 60;
                let val = Math.min(stats.avgMileage, maxMileage);
                const pct = val / maxMileage;
                setTimeout(() => {
                    speedFillEl.style.strokeDashoffset = 283 - (141.5 * pct);
                    if(stats.efficiencyScore === 'A+' || stats.efficiencyScore === 'A') speedFillEl.style.stroke = 'var(--success)';
                    else if(stats.efficiencyScore === 'B') speedFillEl.style.stroke = '#1e90ff';
                    else if(stats.efficiencyScore === 'C') speedFillEl.style.stroke = '#ffa502';
                    else speedFillEl.style.stroke = 'var(--danger)';
                }, 100);
            }
            if(effBadgeEl) {
                effBadgeEl.className = 'eff-badge';
                let effClass = 'eff-C';
                if(stats.efficiencyScore === 'A+') effClass = 'eff-A-plus';
                else if(stats.efficiencyScore === 'A') effClass = 'eff-A';
                else if(stats.efficiencyScore === 'B') effClass = 'eff-B';
                else if(stats.efficiencyScore === 'D') effClass = 'eff-D';
                
                effBadgeEl.classList.add(effClass);
                effBadgeEl.innerText = `Efficiency: ${stats.efficiencyScore}`;
            }

            if(estRangeEl) estRangeEl.innerText = `${stats.estimatedRange} km`;
            if(fuelCapEl) fuelCapEl.innerText = `${stats.fuelCapacity} L`;

            // Smart Suggestions
            const suggestionsEl = document.getElementById('dash-ai-suggestions');
            if(suggestionsEl) {
                const suggestions = Analytics.getSmartSuggestions(stats);
                suggestionsEl.innerHTML = suggestions.map(s => `
                    <div class="ai-suggestion-panel mb-2">
                        <div class="ai-icon"><i class="fas ${s.icon}"></i></div>
                        <div class="ai-content">
                            <h4>${s.title}</h4>
                            <p>${s.text}</p>
                        </div>
                    </div>
                `).join('');
            }

            // Fetch Live Weather
            this.fetchWeather();
            
            // Render Recent Logs
            const allLogs = this.getAllFlatLogs().slice(0, 5);
            const container = document.getElementById('dash-recent-logs');
            if(allLogs.length === 0) container.innerHTML = '<p class="text-sub text-center">No logs yet.</p>';
            else container.innerHTML = allLogs.map(l => this.createLogHTML(l)).join('');
            
            // Render Components
            const components = DB.get(DB.KEYS.COMPONENTS) || [];
            const compList = document.getElementById('components-list');
            if(compList) {
                if(components.length === 0) {
                    compList.innerHTML = '<p class="text-sub text-center w-100" style="grid-column: 1/-1;">No components tracked yet.</p>';
                } else {
                    compList.innerHTML = components.map(c => {
                        const used = stats.totalOdo - parseFloat(c.installedOdo);
                        const life = parseFloat(c.lifespan);
                        const remaining = Math.max(0, life - used);
                        const pct = Math.max(0, Math.min(100, (remaining / life) * 100));
                        
                        let color = 'var(--accent)';
                        if(pct < 10) color = 'var(--danger)';
                        else if(pct < 30) color = '#ffa502';

                        return `
                            <div class="comp-card">
                                <div class="comp-icon"><i class="fas fa-cog"></i></div>
                                <div class="comp-title">${c.name}</div>
                                <div class="comp-bar-bg"><div class="comp-bar-fill" style="width: ${pct}%; background: ${color};"></div></div>
                                <div class="comp-pct" style="color: ${color};">${pct.toFixed(0)}% Left</div>
                                <button class="log-delete-btn" style="position: absolute; top: 10px; right: 10px; padding: 4px;" onclick="window.UI.confirm('Delete component?').then(res => { if(res) { localStorage.setItem('del_comp', '${c.id}'); window.dispatchEvent(new Event('delete-comp')); } })"><i class="fas fa-times"></i></button>
                            </div>
                        `;
                    }).join('');
                }
            }
        }
        
        if(route === 'map') {
            setTimeout(() => MapLogic.init(), 100);
        }
        
        if(route === 'logs') {
            const btns = document.querySelectorAll('.filter-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    btns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.renderLogs(e.target.dataset.filter);
                });
            });
            this.renderLogs('all');
        }

        if(route === 'analytics') {
            setTimeout(() => Analytics.renderCharts(), 200);
            document.getElementById('btn-export-pdf')?.addEventListener('click', () => Analytics.exportToPDF());
            document.getElementById('btn-share-whatsapp')?.addEventListener('click', () => {
                const stats = Analytics.calculateStats();
                const text = `Hey! Check out my bike's stats on Ronnin Pro:\nODO: ${stats.totalOdo} km\nMileage: ${stats.avgMileage.toFixed(2)} km/L\nTotal Fuel: ${stats.totalFuel.toFixed(2)} L\nEfficiency: ${stats.efficiencyScore}`;
                const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                window.open(whatsappUrl, '_blank');
            });
        }

        if(route === 'profile') {
            const bikes = DB.get(DB.KEYS.BIKES);
            if(bikes[0]) {
                const bike = bikes[0];
                const bikeName = document.getElementById('profile-bike-name');
                const bikeModel = document.getElementById('profile-bike-model');
                const pCc = document.getElementById('profile-cc');
                const pDate = document.getElementById('profile-date');
                const pInit = document.getElementById('profile-initial-odo');
                const pInt = document.getElementById('profile-service-interval');
                const pWeight = document.getElementById('profile-weight');
                const pCap = document.getElementById('profile-fuel-cap');
                const pVolts = document.getElementById('profile-volts');
                const pTf = document.getElementById('profile-tire-f');
                const pTr = document.getElementById('profile-tire-r');
                const pReg = document.getElementById('profile-reg');
                const pVin = document.getElementById('profile-vin');
                const pEng = document.getElementById('profile-eng-no');
                const pTs = document.getElementById('profile-top-speed');
                const pRn = document.getElementById('profile-rider-name');
                const pBlood = document.getElementById('profile-blood');
                const pEmg = document.getElementById('profile-emg');
                const pExp = document.getElementById('profile-exp');

                if(bikeName) bikeName.innerText = bike.name || 'My Ronin';
                if(bikeModel) bikeModel.innerText = bike.model || '---';
                if(pCc) pCc.innerText = bike.cc ? `${bike.cc} cc` : '---';
                if(pDate) pDate.innerText = bike.purchaseDate || '---';
                if(pInit) pInit.innerText = bike.initialOdo ? `${bike.initialOdo} km` : '0 km';
                if(pInt) pInt.innerText = bike.serviceInterval ? `Every ${bike.serviceInterval} km` : '---';
                
                if(pWeight) pWeight.innerText = bike.weight || '---';
                if(pCap) pCap.innerText = bike.fuelCapacity || '---';
                if(pVolts) pVolts.innerText = bike.voltage || '---';
                if(pTf) pTf.innerText = bike.tirePressFront || '---';
                if(pTr) pTr.innerText = bike.tirePressRear || '---';
                if(pReg) pReg.innerText = bike.regNumber || '---';
                if(pVin) pVin.innerText = bike.vinNumber || '---';
                if(pEng) pEng.innerText = bike.engineNumber || '---';
                
                const settings = DB.get(DB.KEYS.SETTINGS) || {};
                if(pTs) pTs.innerText = `${parseFloat(localStorage.getItem('RonninPro_TopSpeed') || '0').toFixed(0)} km/h`;
                if(pRn) pRn.innerText = settings.userName || 'Rider';
                if(pBlood) pBlood.innerText = settings.bloodGroup || '---';
                if(pEmg) pEmg.innerText = settings.emgContact || '---';
                if(pExp) pExp.innerText = settings.ridingExp ? `${settings.ridingExp} yrs` : '---';
                
                const formatExpiry = (dateStr) => {
                    if(!dateStr) return 'Not Set';
                    const diff = new Date(dateStr) - new Date();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if(days < 0) return `<span class="text-danger">EXPIRED - ${dateStr}</span>`;
                    if(days < 30) return `<span style="color:#ffa502">Expires in ${days} days</span>`;
                    return dateStr;
                };

                document.getElementById('profile-ins-exp').innerHTML = formatExpiry(bike.insuranceExpiry);
                document.getElementById('profile-puc-exp').innerHTML = formatExpiry(bike.pollutionExpiry);
                
                // Bind Edit Buttons logic to populate form
                document.querySelectorAll('.form-edit-btn').forEach(btn => {
                   btn.addEventListener('click', () => {
                       this.hydrateEditProfileForm(bike);
                       UI.openModal('modal-edit-profile');
                   });
                });
            }
            UI.setupProfileTabs();
        }
    },
    
    hydrateEditProfileForm(bike) {
        const settings = DB.get(DB.KEYS.SETTINGS) || {};
        document.getElementById('ep-username').value = settings.userName || '';
        document.getElementById('ep-blood').value = settings.bloodGroup || '';
        document.getElementById('ep-emg').value = settings.emgContact || '';
        document.getElementById('ep-exp').value = settings.ridingExp || '';
        
        document.getElementById('ep-id').value = bike.id;
        document.getElementById('ep-name').value = bike.name || '';
        document.getElementById('ep-model').value = bike.model || '';
        document.getElementById('ep-cc').value = bike.cc || '';
        document.getElementById('ep-iodo').value = bike.initialOdo || 0;
        document.getElementById('ep-date').value = bike.purchaseDate || '';
        document.getElementById('ep-sint').value = bike.serviceInterval || '';
        
        document.getElementById('ep-reg').value = bike.regNumber || '';
        document.getElementById('ep-vin').value = bike.vinNumber || '';
        document.getElementById('ep-eng').value = bike.engineNumber || '';
        document.getElementById('ep-insp').value = bike.insuranceExpiry || '';
        document.getElementById('ep-puc').value = bike.pollutionExpiry || '';
        
        document.getElementById('ep-fuelcap').value = bike.fuelCapacity || '';
        document.getElementById('ep-weight').value = bike.weight || '';
        document.getElementById('ep-voltage').value = bike.voltage || '';
        document.getElementById('ep-tiref').value = bike.tirePressFront || '';
        document.getElementById('ep-tirer').value = bike.tirePressRear || '';
    },

    getAllFlatLogs() {
        return [...DB.get(DB.KEYS.FUEL), ...DB.get(DB.KEYS.SERVICE), ...DB.get(DB.KEYS.MAINT)]
               .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    renderLogs(filter) {
        let list = this.getAllFlatLogs();
        if(filter !== 'all') {
            const fmap = { 'fuel':'Fuel', 'service':'Service', 'maintenance':'Maintenance' };
            list = list.filter(l => l.type === fmap[filter]);
        }
        const container = document.getElementById('main-log-list');
        if(!container) return;
        if(list.length === 0) container.innerHTML = '<p class="text-sub text-center mt-4">No logs found.</p>';
        else container.innerHTML = list.map(l => this.createLogHTML(l)).join('');
    },

    renderGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good Evening';
        if(hour >= 5 && hour < 12) greeting = 'Good Morning';
        else if(hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if(hour >= 17 && hour < 21) greeting = 'Good Evening';
        else greeting = 'Good Night';
        
        const settings = DB.get(DB.KEYS.SETTINGS) || { userName: 'Rider' };
        
        const greetEl = document.getElementById('dash-greeting');
        if(greetEl) greetEl.innerText = `${greeting}, ${settings.userName || 'Rider'}`;
        
        // Calculate health bar mapping roughly
        const bikes = DB.get(DB.KEYS.BIKES);
        const services = DB.get(DB.KEYS.SERVICE);
        if(bikes[0]) {
            let nextDue = 0;
            if(services.length > 0) nextDue = parseFloat(services[0].nextOdo);
            else nextDue = parseFloat(bikes[0].initialOdo) + parseFloat(bikes[0].serviceInterval || 6000);
            
            const stats = Analytics.calculateStats();
            const currentOdo = stats.totalOdo;
            const remaining = nextDue - currentOdo;
            
            const healthDistEl = document.getElementById('health-service-dist');
            const healthBarEl = document.getElementById('health-service-bar');
            if(healthDistEl) healthDistEl.innerText = remaining > 0 ? `${remaining} km remaining` : 'OVERDUE';
            if(healthBarEl) {
                const interval = parseFloat(bikes[0].serviceInterval || 6000);
                const progress = Math.max(0, Math.min(100, ((interval - remaining) / interval) * 100));
                healthBarEl.style.width = `${progress}%`;
                if(remaining < 200) healthBarEl.style.background = 'var(--danger)';
                else if(remaining < 1000) healthBarEl.style.background = '#ffa502';
                else healthBarEl.style.background = 'var(--accent)';
            }
        }
    },

    createLogHTML(log) {
        let title = log.type || 'Log', val = '', icon = '<i class="fas fa-clipboard-list"></i>';
        if(log.type === 'Fuel') { val = `$${log.price}`; icon = '<i class="fas fa-gas-pump" style="color:var(--accent)"></i>'; }
        if(log.type === 'Service') { title = log.typeText; val = `$${log.cost}`; icon = '<i class="fas fa-oil-can" style="color:var(--danger)"></i>'; }
        if(log.type === 'Maintenance') { title = log.part; val = `$${log.cost}`; icon = '<i class="fas fa-tools" style="color:var(--success)"></i>'; }

        let formattedDate = log.date;
        if(log.date) {
            const d = new Date(log.date);
            formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }

        return `
            <div class="log-item">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="font-size:24px; width:44px; height:44px; background:var(--surface-light); border-radius:22px; display:flex; justify-content:center; align-items:center;">
                        ${icon}
                    </div>
                    <div class="log-details">
                        <div class="log-title">${title}</div>
                        <div class="log-date">${formattedDate || new Date().toLocaleDateString()}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="log-value" style="margin-right:8px;">${val}</div>
                    <button class="log-edit-btn" data-id="${log.id}" data-type="${log.type}"><i class="fas fa-edit"></i></button>
                    <button class="log-delete-btn" data-id="${log.id}" data-type="${log.type}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    }
};
