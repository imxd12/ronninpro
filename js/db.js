export const DB = {
    KEYS: {
        BIKES: 'RonninPro_Bikes',
        FUEL: 'RonninPro_Fuel',
        SERVICE: 'RonninPro_Service',
        MAINT: 'RonninPro_Maintenance',
        MODS: 'RonninPro_Mods',
        RIDES: 'RonninPro_Rides',
        WASH: 'RonninPro_Wash',
        SETTINGS: 'RonninPro_Settings'
    },
    
    init() {
        for (let key in this.KEYS) {
            if (!localStorage.getItem(this.KEYS[key])) {
                localStorage.setItem(this.KEYS[key], JSON.stringify([]));
            }
        }
        
        const bikes = this.get(this.KEYS.BIKES);
        if(bikes.length === 0) {
            this.add(this.KEYS.BIKES, {
                name: 'My Ronin',
                model: 'TVS Ronin 225',
                cc: 225,
                purchaseDate: new Date().toISOString().split('T')[0],
                initialOdo: 0,
                insuranceExpiry: '',
                pollutionExpiry: '',
                regNumber: 'XX-00-XX-0000',
                vinNumber: '',
                engineNumber: '',
                fuelCapacity: '14',
                weight: '160',
                voltage: '12V 8Ah',
                tirePressFront: '28 psi',
                tirePressRear: '32 psi',
                serviceInterval: '6000'
            });
        }
    },

    get(key) {
        try {
            const val = JSON.parse(localStorage.getItem(key));
            if(key === this.KEYS.SETTINGS && !val) return { userName: 'Rider' };
            return val || (key === this.KEYS.SETTINGS ? {} : []);
        } catch (e) {
            if(key === this.KEYS.SETTINGS) return { userName: 'Rider' };
            return [];
        }
    },

    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    add(key, item) {
        const data = this.get(key);
        item.id = Date.now().toString();
        item.timestamp = new Date().toISOString();
        data.push(item);
        this.set(key, data);
        return item;
    },
    
    update(key, id, updatedProps) {
        let data = this.get(key);
        data = data.map(item => {
            if(item.id === id) return { ...item, ...updatedProps };
            return item;
        });
        this.set(key, data);
    },
    
    remove(key, id) {
        let data = this.get(key);
        data = data.filter(item => item.id !== id);
        this.set(key, data);
    }
};
