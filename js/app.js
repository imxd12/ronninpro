import { DB } from './db.js';
import { UI } from './ui.js';
import { Router } from './router.js';

let deferredPrompt;
window.Router = Router;

// Catch the prompt globally as early as possible
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

async function bootstrap() {
    DB.init();
    
    // Register SW
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(e => console.error("SW Error:", e));
    }

    // Apply Global Theme First
    const globalTheme = localStorage.getItem('RonninPro_Theme');
    if(globalTheme === 'light') document.body.dataset.theme = 'light';

    // Load static shell assets
    await Router.loadModals();
    UI.setupHamburgerMenu();
    UI.setupLiquidDock();
    
    // Load default view
    await Router.loadView('dashboard');

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) splash.classList.add('hidden');
    }, 800);

    setupGlobalEvents();
    setupPWAInstall();
    setupOfflineDetection();
}

function setupOfflineDetection() {
    const banner = document.getElementById('offline-banner');
    if(!banner) return;
    
    const toggleBanner = () => {
        if(navigator.onLine) banner.classList.remove('active');
        else banner.classList.add('active');
    };
    
    window.addEventListener('online', toggleBanner);
    window.addEventListener('offline', toggleBanner);
    toggleBanner(); // initial check
}

function setupGlobalEvents() {
    document.querySelectorAll('.dock-item[data-route]').forEach(item => {
        item.addEventListener('click', (e) => {
            const route = e.currentTarget.dataset.route;
            Router.loadView(route);
        });
    });

    document.querySelectorAll('.fab-item[data-action]').forEach(item => {
        item.addEventListener('click', (e) => {
            UI.openModal(e.currentTarget.dataset.action);
        });
    });


    // Global Sensory Bindings
    document.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('.dock-item, .fab-icon, .btn-primary, .btn-secondary, .ptab-btn, .header-icon, .qa-btn, .close-modal, .log-delete-btn');
        if(target) {
            if(target.classList.contains('btn-primary') || target.classList.contains('log-delete-btn')) UI.playSensory('heavy');
            else UI.playSensory('light');
        }
    });

    // Close Modals & Global Delete delegation
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.close-modal');
        if(closeBtn) {
            UI.closeModal(closeBtn.dataset.close);
        }
        
        const deleteBtn = e.target.closest('.log-delete-btn');
        if(deleteBtn) {
            const id = deleteBtn.dataset.id;
            const type = deleteBtn.dataset.type;
            
            UI.confirm('Are you sure you want to delete this log?', 'Delete Log').then(res => {
                if(res) {
                    const map = { 'Fuel': DB.KEYS.FUEL, 'Service': DB.KEYS.SERVICE, 'Maintenance': DB.KEYS.MAINT };
                    if(map[type]) {
                        DB.remove(map[type], id);
                        const activeRoute = document.querySelector('.dock-item.active').dataset.route;
                        Router.rehydrate(activeRoute);
                    }
                }
            });
        }
        const editBtn = e.target.closest('.log-edit-btn');
        if(editBtn) {
            const id = editBtn.dataset.id;
            const type = editBtn.dataset.type;
            const map = { 'Fuel': DB.KEYS.FUEL, 'Service': DB.KEYS.SERVICE, 'Maintenance': DB.KEYS.MAINT };
            if(map[type]) {
                const logs = DB.get(map[type]);
                const log = logs.find(l => l.id === id);
                if(log) {
                    if(type === 'Fuel') {
                        document.getElementById('fuel-id').value = log.id;
                        document.getElementById('fuel-date').value = log.date;
                        document.getElementById('fuel-liters').value = log.liters;
                        document.getElementById('fuel-price').value = log.price;
                        document.getElementById('fuel-odo').value = log.odo;
                        document.getElementById('fuel-station').value = log.station || '';
                        document.getElementById('fuel-grade').value = log.grade || 'Regular';
                        UI.openModal('modal-add-fuel');
                    } else if(type === 'Service') {
                        document.getElementById('service-id').value = log.id;
                        document.getElementById('service-date').value = log.date || new Date().toISOString().split('T')[0];
                        document.getElementById('service-type').value = log.typeText;
                        document.getElementById('service-cost').value = log.cost;
                        document.getElementById('service-odo').value = log.odo;
                        document.getElementById('service-next-odo').value = log.nextOdo;
                        document.getElementById('service-center').value = log.center || '';
                        document.getElementById('service-notes').value = log.notes || '';
                        UI.openModal('modal-add-service');
                    } else if(type === 'Maintenance') {
                        document.getElementById('maint-id').value = log.id;
                        document.getElementById('maint-part').value = log.part;
                        document.getElementById('maint-cost').value = log.cost;
                        document.getElementById('maint-date').value = log.date;
                        document.getElementById('maint-reason').value = log.reason || 'Wear & Tear';
                        document.getElementById('maint-warranty').value = log.warranty || '';
                        UI.openModal('modal-add-maintenance');
                    }
                }
            }
        }
        
        const actionBtn = e.target.closest('[data-action]');
        if(actionBtn) {
            UI.openModal(actionBtn.dataset.action);
        }
    });
    
    window.addEventListener('delete-comp', () => {
        const id = localStorage.getItem('del_comp');
        if(id) {
            DB.remove(DB.KEYS.COMPONENTS, id);
            localStorage.removeItem('del_comp');
            Router.rehydrate('dashboard');
        }
    });

    document.addEventListener('submit', (e) => {
        if(e.target.id === 'form-add-fuel') {
            e.preventDefault();
            const id = document.getElementById('fuel-id').value;
            const data = {
                date: document.getElementById('fuel-date').value,
                liters: document.getElementById('fuel-liters').value,
                price: document.getElementById('fuel-price').value,
                odo: document.getElementById('fuel-odo').value,
                station: document.getElementById('fuel-station').value,
                grade: document.getElementById('fuel-grade').value,
                type: 'Fuel'
            };
            if(id) DB.update(DB.KEYS.FUEL, id, data);
            else DB.add(DB.KEYS.FUEL, data);
            postSubmit(e.target, 'modal-add-fuel');
        }
        else if(e.target.id === 'form-add-service') {
            e.preventDefault();
            const id = document.getElementById('service-id').value;
            const data = {
                typeText: document.getElementById('service-type').value,
                cost: document.getElementById('service-cost').value,
                odo: document.getElementById('service-odo').value,
                nextOdo: document.getElementById('service-next-odo').value,
                center: document.getElementById('service-center').value,
                notes: document.getElementById('service-notes').value,
                date: document.getElementById('service-date').value || new Date().toISOString().split('T')[0],
                type: 'Service'
            };
            if(id) DB.update(DB.KEYS.SERVICE, id, data);
            else DB.add(DB.KEYS.SERVICE, data);
            postSubmit(e.target, 'modal-add-service');
        }
        else if(e.target.id === 'form-add-maintenance') {
            e.preventDefault();
            const id = document.getElementById('maint-id').value;
            const data = {
                part: document.getElementById('maint-part').value,
                cost: document.getElementById('maint-cost').value,
                date: document.getElementById('maint-date').value,
                reason: document.getElementById('maint-reason').value,
                warranty: document.getElementById('maint-warranty').value,
                type: 'Maintenance'
            };
            if(id) DB.update(DB.KEYS.MAINT, id, data);
            else DB.add(DB.KEYS.MAINT, data);
            postSubmit(e.target, 'modal-add-maintenance');
        }
        else if(e.target.id === 'form-add-component') {
            e.preventDefault();
            const id = document.getElementById('comp-id').value;
            const data = {
                name: document.getElementById('comp-name').value,
                lifespan: document.getElementById('comp-lifespan').value,
                installedOdo: document.getElementById('comp-installed').value,
            };
            if(id) DB.update(DB.KEYS.COMPONENTS, id, data);
            else DB.add(DB.KEYS.COMPONENTS, data);
            postSubmit(e.target, 'modal-add-component');
        }
        else if(e.target.id === 'form-edit-profile') {
            e.preventDefault();
            // Save settings
            const settingsObj = DB.get(DB.KEYS.SETTINGS) || {};
            settingsObj.userName = document.getElementById('ep-username').value;
            settingsObj.bloodGroup = document.getElementById('ep-blood').value;
            settingsObj.emgContact = document.getElementById('ep-emg').value;
            settingsObj.ridingExp = document.getElementById('ep-exp').value;
            DB.set(DB.KEYS.SETTINGS, settingsObj);

            const id = document.getElementById('ep-id').value;
            DB.update(DB.KEYS.BIKES, id, {
                name: document.getElementById('ep-name').value,
                model: document.getElementById('ep-model').value,
                cc: document.getElementById('ep-cc').value,
                initialOdo: document.getElementById('ep-iodo').value,
                purchaseDate: document.getElementById('ep-date').value,
                serviceInterval: document.getElementById('ep-sint').value,
                
                regNumber: document.getElementById('ep-reg').value,
                vinNumber: document.getElementById('ep-vin').value,
                engineNumber: document.getElementById('ep-eng').value,
                insuranceExpiry: document.getElementById('ep-insp').value,
                pollutionExpiry: document.getElementById('ep-puc').value,
                
                fuelCapacity: document.getElementById('ep-fuelcap').value,
                weight: document.getElementById('ep-weight').value,
                voltage: document.getElementById('ep-voltage').value,
                tirePressFront: document.getElementById('ep-tiref').value,
                tirePressRear: document.getElementById('ep-tirer').value
            });
            postSubmit(e.target, 'modal-edit-profile');
        }
    });
}

function postSubmit(form, modalId) {
    if(form) form.reset();
    UI.closeModal(modalId);
    UI.playSensory('success');
    const activeRoute = document.querySelector('.dock-item.active').dataset.route;
    Router.rehydrate(activeRoute);
}

function setupPWAInstall() {
    const handlePrompt = () => {
        if(deferredPrompt) {
            // Show manual install button inside settings menu
            const manualGrp = document.getElementById('manual-install-group');
            if(manualGrp) manualGrp.style.display = 'block';

            // Auto-show beautiful custom modal somewhat delayed
            setTimeout(() => {
                UI.openModal('modal-install-prompt');
            }, 3000); 
        }
    };

    if(deferredPrompt) handlePrompt();
    else {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            handlePrompt();
        });
    }

    document.addEventListener('click', async (e) => {
        if(e.target.closest('#btn-trigger-install') || e.target.closest('#btn-manual-install')) {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                UI.closeModal('modal-install-prompt');
                document.body.classList.remove('menu-open');
                const manualGrp = document.getElementById('manual-install-group');
                if(manualGrp && outcome === 'accepted') manualGrp.style.display = 'none';
                deferredPrompt = null;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', bootstrap);
