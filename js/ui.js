let audioCtx = null;

export const UI = {
    initAudio() {
        if(!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if(audioCtx.state === 'suspended') audioCtx.resume();
    },

    playSensory(type = 'light') {
        try {
            this.initAudio();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            const now = audioCtx.currentTime;

            if(type === 'light') {
                if(navigator.vibrate) navigator.vibrate(10);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } 
            else if(type === 'heavy') {
                if(navigator.vibrate) navigator.vibrate(30);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
            else if(type === 'success') {
                if(navigator.vibrate) navigator.vibrate([20, 40, 20]);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(1200, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch(e) {} // Fail silently if audio is blocked or unsupported
    },
    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.scroll-anim').forEach(el => observer.observe(el));
    },

    openModal(id) {
        document.getElementById(id).classList.add('active');
        const fabMenu = document.getElementById('fab-menu');
        if(fabMenu) fabMenu.classList.remove('active');
        const mainFab = document.getElementById('main-fab');
        if(mainFab) mainFab.classList.remove('rotate');
        
        const modal = document.getElementById(id);
        if(modal) {
            const dateInputs = modal.querySelectorAll('input[type="date"]');
            const today = new Date().toISOString().split('T')[0];
            dateInputs.forEach(input => {
                if(!input.value) input.value = today;
            });
        }
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if(modal) modal.classList.remove('active');
    },

    alert(msg, title = 'Alert', icon = 'fa-info-circle', iconColor = 'var(--accent)') {
        return new Promise(resolve => {
            const modal = document.getElementById('custom-alert-modal');
            document.getElementById('custom-alert-title').innerText = title;
            document.getElementById('custom-alert-msg').innerText = msg;
            
            const iconEl = document.getElementById('custom-alert-icon');
            iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
            iconEl.style.color = iconColor;
            
            document.getElementById('custom-alert-cancel').style.display = 'none';
            const okBtn = document.getElementById('custom-alert-ok');
            
            const handleOk = () => {
                this.closeModal('custom-alert-modal');
                okBtn.removeEventListener('click', handleOk);
                resolve(true);
            };
            
            okBtn.addEventListener('click', handleOk);
            this.openModal('custom-alert-modal');
        });
    },

    confirm(msg, title = 'Confirm', icon = 'fa-question-circle') {
        return new Promise(resolve => {
            const modal = document.getElementById('custom-alert-modal');
            document.getElementById('custom-alert-title').innerText = title;
            document.getElementById('custom-alert-msg').innerText = msg;
            
            const iconEl = document.getElementById('custom-alert-icon');
            iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
            iconEl.style.color = 'var(--accent)';
            
            const cancelBtn = document.getElementById('custom-alert-cancel');
            const okBtn = document.getElementById('custom-alert-ok');
            cancelBtn.style.display = 'block';
            
            const handleOk = () => {
                this.closeModal('custom-alert-modal');
                cleanup();
                resolve(true);
            };
            const handleCancel = () => {
                this.closeModal('custom-alert-modal');
                cleanup();
                resolve(false);
            };
            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            this.openModal('custom-alert-modal');
        });
    },

    prompt(msg, defaultText = '', title = 'Input Required', icon = 'fa-keyboard') {
        return new Promise(resolve => {
            const modal = document.getElementById('custom-alert-modal');
            document.getElementById('custom-alert-title').innerText = title;
            document.getElementById('custom-alert-msg').innerText = msg;
            
            const iconEl = document.getElementById('custom-alert-icon');
            iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
            iconEl.style.color = 'var(--accent)';
            
            const promptInput = document.getElementById('custom-alert-prompt');
            promptInput.style.display = 'block';
            promptInput.value = defaultText;
            
            const cancelBtn = document.getElementById('custom-alert-cancel');
            const okBtn = document.getElementById('custom-alert-ok');
            cancelBtn.style.display = 'block';
            
            const handleOk = () => {
                this.closeModal('custom-alert-modal');
                cleanup();
                resolve(promptInput.value);
            };
            const handleCancel = () => {
                this.closeModal('custom-alert-modal');
                cleanup();
                resolve(null);
            };
            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                promptInput.style.display = 'none';
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            this.openModal('custom-alert-modal');
            setTimeout(() => promptInput.focus(), 100);
        });
    },

    setupHamburgerMenu() {
        const toggleBtn = document.getElementById('header-settings');
        const overlay = document.getElementById('hamburger-overlay');
        const closeBtn = document.getElementById('menu-close');
        
        const openMenu = () => {
            document.body.classList.add('menu-open');
            this.playSensory('heavy');
        };
        const closeMenu = () => {
            document.body.classList.remove('menu-open');
            this.playSensory('light');
        };

        if(toggleBtn) toggleBtn.addEventListener('click', openMenu);
        if(closeBtn) closeBtn.addEventListener('click', closeMenu);
        if(overlay) overlay.addEventListener('click', closeMenu);

        const openCalcBtn = document.getElementById('btn-open-calc');
        if(openCalcBtn) {
            openCalcBtn.addEventListener('click', () => {
                this.openModal('modal-smart-calc');
                closeMenu();
                this.setupCalculator();
            });
        }

        // Theme Toggle Logic
        const toggle = document.getElementById('theme-toggle');
        if(toggle) {
            const isLight = localStorage.getItem('RonninPro_Theme') === 'light';
            toggle.checked = isLight;
            
            toggle.addEventListener('change', (e) => {
                if(e.target.checked) {
                    document.body.dataset.theme = 'light';
                    localStorage.setItem('RonninPro_Theme', 'light');
                } else {
                    document.body.dataset.theme = 'dark';
                    localStorage.setItem('RonninPro_Theme', 'dark');
                }
            });
        }

        // Riding Modes Logic
        const modes = document.querySelectorAll('.mode-card');
        modes.forEach(mode => {
            mode.addEventListener('click', (e) => {
                modes.forEach(m => m.classList.remove('active'));
                mode.classList.add('active');
                
                const selectedMode = mode.dataset.mode;
                if(selectedMode === 'cyber') {
                    document.body.removeAttribute('data-ride-mode');
                } else {
                    document.body.setAttribute('data-ride-mode', selectedMode);
                }
                localStorage.setItem('RonninPro_RideMode', selectedMode);
                this.playSensory('success');
            });
        });

        // Initialize saved mode
        const savedMode = localStorage.getItem('RonninPro_RideMode');
        if(savedMode) {
            modes.forEach(m => m.classList.remove('active'));
            const activeCard = document.querySelector(`.mode-card[data-mode="${savedMode}"]`);
            if(activeCard) activeCard.classList.add('active');
            
            if(savedMode !== 'cyber') {
                document.body.setAttribute('data-ride-mode', savedMode);
            }
        }

        // Export Data Binding
        const exportBtn = document.getElementById('btn-export-data');
        if(exportBtn) {
            exportBtn.addEventListener('click', () => {
                import('./analytics.js').then(module => {
                    module.Analytics.exportToPDF();
                    this.playSensory('success');
                }).catch(e => console.error(e));
            });
        }

        const exportJsonBtn = document.getElementById('btn-export-json');
        if(exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "ronnin_backup.json");
                dlAnchorElem.click();
                this.playSensory('success');
            });
        }

        const importFileInput = document.getElementById('file-import');
        if(importFileInput) {
            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if(file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const parsedData = JSON.parse(event.target.result);
                            for(let key in parsedData) {
                                if(key.startsWith('RonninPro_')) {
                                    localStorage.setItem(key, parsedData[key]);
                                }
                            }
                            this.alert('Backup imported successfully! The app will now reload.', 'Success', 'fa-check-circle').then(() => {
                                window.location.reload();
                            });
                        } catch(err) {
                            this.alert('Failed to parse backup file.', 'Error', 'fa-times-circle', 'var(--danger)');
                            console.error(err);
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }

        // SOS Binding
        const saveSosBtn = document.getElementById('btn-save-sos');
        if(saveSosBtn) {
            saveSosBtn.addEventListener('click', () => {
                const blood = document.getElementById('sos-blood').value;
                const contact = document.getElementById('sos-contact').value;
                localStorage.setItem('RonninPro_SOS_Blood', blood);
                localStorage.setItem('RonninPro_SOS_Contact', contact);
                this.playSensory('success');
                
                // visually indicate success
                const origText = saveSosBtn.innerText;
                saveSosBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
                setTimeout(() => { saveSosBtn.innerHTML = origText; }, 2000);
            });
            
            // Load initial
            const blood = localStorage.getItem('RonninPro_SOS_Blood');
            const contact = localStorage.getItem('RonninPro_SOS_Contact');
            if(blood) document.getElementById('sos-blood').value = blood;
            if(contact) document.getElementById('sos-contact').value = contact;
        }
    },

    setupLiquidDock() {
        const items = document.querySelectorAll('.dock-items .dock-item:not(.center-fab)');
        const indicator = document.querySelector('.active-indicator');
        
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const rect = item.getBoundingClientRect();
                const parentRect = item.parentElement.getBoundingClientRect();
                const leftPos = rect.left - parentRect.left + (rect.width/2) - 24;
                
                indicator.style.left = `${leftPos}px`;
            });
        });

        setTimeout(() => {
            if(items[0]) {
                const rect = items[0].getBoundingClientRect();
                const parentRect = items[0].parentElement.getBoundingClientRect();
                indicator.style.left = `${rect.left - parentRect.left + (rect.width/2) - 24}px`;
            }
        }, 100);

        const innerFab = document.getElementById('main-fab');
        const menu = document.getElementById('fab-menu');
        if(innerFab && menu) {
            innerFab.addEventListener('click', (e) => {
                e.stopPropagation();
                innerFab.classList.toggle('rotate');
                menu.classList.toggle('active');
            });
            
            // Close FAB when clicking outside
            document.addEventListener('click', (e) => {
                if(menu.classList.contains('active') && !menu.contains(e.target) && !innerFab.contains(e.target)) {
                    innerFab.classList.remove('rotate');
                    menu.classList.remove('active');
                }
            });
        }
    },

    setupProfileTabs() {
        const btns = document.querySelectorAll('.ptab-btn');
        const contents = document.querySelectorAll('.ptab-content');
        
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                btns.forEach(b => b.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                const targetId = `ptab-${btn.dataset.ptab}`;
                document.getElementById(targetId).classList.add('active');
            });
        });
    },

    setupCalculator() {
        if(this.calcSetupDone) return;
        this.calcSetupDone = true;
        
        const display = document.getElementById('calc-display');
        const historyDisplay = document.getElementById('calc-history-display');
        const historyList = document.getElementById('calc-history-list');
        const btns = document.querySelectorAll('.calc-btn');
        let currentExpr = '';
        
        const renderHistory = () => {
            const hist = JSON.parse(localStorage.getItem('RonninPro_CalcHistory') || '[]');
            historyList.innerHTML = hist.map(h => `<div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.1)">${h}</div>`).join('');
        };
        renderHistory();

        document.getElementById('calc-clear-history')?.addEventListener('click', () => {
            localStorage.setItem('RonninPro_CalcHistory', '[]');
            renderHistory();
        });

        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = e.target.dataset.val;
                if(val === 'C') {
                    currentExpr = '';
                    display.innerText = '0';
                    historyDisplay.innerText = '';
                } else if(val === 'DEL') {
                    currentExpr = currentExpr.slice(0, -1);
                    display.innerText = currentExpr || '0';
                } else if(val === '=') {
                    try {
                        // eslint-disable-next-line no-eval
                        const res = eval(currentExpr.replace(/[^0-9+\-*/.%]/g, ''));
                        const histStr = `${currentExpr} = ${res}`;
                        historyDisplay.innerText = currentExpr + ' =';
                        currentExpr = String(res);
                        display.innerText = currentExpr;
                        
                        const hist = JSON.parse(localStorage.getItem('RonninPro_CalcHistory') || '[]');
                        hist.unshift(histStr);
                        if(hist.length > 20) hist.pop();
                        localStorage.setItem('RonninPro_CalcHistory', JSON.stringify(hist));
                        renderHistory();
                    } catch(err) {
                        display.innerText = 'Error';
                        currentExpr = '';
                    }
                } else {
                    if(currentExpr === '0' && val !== '.') currentExpr = val;
                    else currentExpr += val;
                    display.innerText = currentExpr;
                }
                this.playSensory('light');
            });
        });
    }
};
