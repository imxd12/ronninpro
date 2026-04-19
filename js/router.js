import { UI } from './ui.js';
import { DB } from './db.js';
import { Analytics } from './analytics.js';

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

    rehydrate(route) {
        if(route === 'dashboard') {
            this.renderGreeting();
            const stats = Analytics.calculateStats();
            document.getElementById('dash-odo').innerText = stats.totalOdo;
            document.getElementById('dash-mileage').innerText = stats.avgMileage.toFixed(2);
            document.getElementById('dash-fuel').innerText = stats.totalFuel.toFixed(2);
            document.getElementById('dash-maint').innerText = `$${stats.totalMaintCost}`;
            
            // Render Recent
            const allLogs = this.getAllFlatLogs().slice(0, 5);
            const container = document.getElementById('dash-recent-logs');
            if(allLogs.length === 0) container.innerHTML = '<p class="text-sub text-center">No logs yet.</p>';
            else container.innerHTML = allLogs.map(l => this.createLogHTML(l)).join('');
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
        }

        if(route === 'profile') {
            const bikes = DB.get(DB.KEYS.BIKES);
            if(bikes[0]) {
                const b = bikes[0];
                // Hero Basics
                document.getElementById('profile-bike-name').innerText = b.name;
                document.getElementById('profile-bike-model').innerText = b.model;
                
                // Overview Tab
                document.getElementById('profile-cc').innerText = b.cc + ' cc';
                document.getElementById('profile-date').innerText = b.purchaseDate;
                document.getElementById('profile-initial-odo').innerText = b.initialOdo + ' km';
                document.getElementById('profile-service-interval').innerText = (b.serviceInterval || '6000') + ' km';
                
                // Specs Tab
                document.getElementById('profile-weight').innerText = b.weight || '---';
                document.getElementById('profile-fuel-cap').innerText = b.fuelCapacity || '---';
                document.getElementById('profile-volts').innerText = b.voltage || '---';
                document.getElementById('profile-tire-f').innerText = b.tirePressFront || '---';
                document.getElementById('profile-tire-r').innerText = b.tirePressRear || '---';
                
                // Docs Tab
                document.getElementById('profile-reg').innerText = b.regNumber || '---';
                document.getElementById('profile-vin').innerText = b.vinNumber || '---';
                document.getElementById('profile-eng-no').innerText = b.engineNumber || '---';
                
                const formatExpiry = (dateStr) => {
                    if(!dateStr) return 'Not Set';
                    const diff = new Date(dateStr) - new Date();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if(days < 0) return `<span class="text-danger">EXPIRED - ${dateStr}</span>`;
                    if(days < 30) return `<span style="color:#ffa502">Expires in ${days} days</span>`;
                    return dateStr;
                };

                document.getElementById('profile-ins-exp').innerHTML = formatExpiry(b.insuranceExpiry);
                document.getElementById('profile-puc-exp').innerHTML = formatExpiry(b.pollutionExpiry);
                
                // Bind Edit Buttons logic to populate form
                document.querySelectorAll('.form-edit-btn').forEach(btn => {
                   btn.addEventListener('click', () => {
                       this.hydrateEditProfileForm(b);
                       UI.openModal('modal-edit-profile');
                   });
                });
            }
            UI.setupProfileTabs();
        }
    },
    
    hydrateEditProfileForm(b) {
        const settings = DB.get(DB.KEYS.SETTINGS) || { userName: 'Rider' };
        document.getElementById('ep-username').value = settings.userName || '';
        document.getElementById('ep-id').value = b.id;
        document.getElementById('ep-name').value = b.name || '';
        document.getElementById('ep-model').value = b.model || '';
        document.getElementById('ep-cc').value = b.cc || '';
        document.getElementById('ep-iodo').value = b.initialOdo || 0;
        document.getElementById('ep-date').value = b.purchaseDate || '';
        document.getElementById('ep-sint').value = b.serviceInterval || '';
        
        document.getElementById('ep-reg').value = b.regNumber || '';
        document.getElementById('ep-vin').value = b.vinNumber || '';
        document.getElementById('ep-eng').value = b.engineNumber || '';
        document.getElementById('ep-insp').value = b.insuranceExpiry || '';
        document.getElementById('ep-puc').value = b.pollutionExpiry || '';
        
        document.getElementById('ep-fuelcap').value = b.fuelCapacity || '';
        document.getElementById('ep-weight').value = b.weight || '';
        document.getElementById('ep-voltage').value = b.voltage || '';
        document.getElementById('ep-tiref').value = b.tirePressFront || '';
        document.getElementById('ep-tirer').value = b.tirePressRear || '';
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
