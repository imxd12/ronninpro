import { DB } from './db.js';

export const Analytics = {
    charts: {},

    calculateStats() {
        const fuelLogs = DB.get(DB.KEYS.FUEL).sort((a,b) => new Date(a.date) - new Date(b.date));
        const maintenance = DB.get(DB.KEYS.MAINT);
        const services = DB.get(DB.KEYS.SERVICE);
        const bikes = DB.get(DB.KEYS.BIKES);

        let totalOdo = bikes[0] ? bikes[0].initialOdo : 0;
        let totalFuel = fuelLogs.reduce((acc, log) => acc + parseFloat(log.liters), 0);
        let avgMileage = 0;

        if (fuelLogs.length > 0) totalOdo = Math.max(totalOdo, ...fuelLogs.map(l => parseFloat(l.odo)));
        if (services.length > 0) totalOdo = Math.max(totalOdo, ...services.map(l => parseFloat(l.odo)));

        if (fuelLogs.length > 1) {
            let totalDistance = 0, totalL = 0;
            for(let i = 1; i < fuelLogs.length; i++) {
                let dist = fuelLogs[i].odo - fuelLogs[i-1].odo;
                if(dist > 0) { totalDistance += dist; totalL += parseFloat(fuelLogs[i].liters); }
            }
            if(totalL > 0) avgMileage = totalDistance / totalL;
        }
        
        const serviceCost = services.reduce((acc, log) => acc + parseFloat(log.cost), 0);
        const maintCostItem = maintenance.reduce((acc, log) => acc + parseFloat(log.cost), 0);

        return {
            totalOdo,
            totalFuel,
            totalMaintCost: serviceCost + maintCostItem,
            avgMileage
        };
    },

    renderCharts(retries = 0) {
        // Ensure globals exist, retry slightly to handle offline slow load
        if(!window.Chart) {
            if(retries < 5) setTimeout(() => this.renderCharts(retries + 1), 200);
            return;
        }
        
        const fuelLogs = DB.get(DB.KEYS.FUEL).sort((a,b) => new Date(a.date) - new Date(b.date));
        let mLabels = [], mData = [];

        for(let i = 1; i < fuelLogs.length; i++) {
            let dist = fuelLogs[i].odo - fuelLogs[i-1].odo;
            let liters = parseFloat(fuelLogs[i].liters);
            if(dist > 0 && liters > 0) {
                mLabels.push(fuelLogs[i].date);
                mData.push((dist/liters).toFixed(2));
            }
        }

        const ctxMileage = document.getElementById('mileageChart');
        if(ctxMileage) {
            if(this.charts.mileage) this.charts.mileage.destroy();
            this.charts.mileage = new window.Chart(ctxMileage, {
                type: 'line',
                data: {
                    labels: mLabels,
                    datasets: [{
                        label: 'Mileage',
                        data: mData,
                        borderColor: '#00ffcc',
                        backgroundColor: 'rgba(0, 255, 204, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                 scales: { x: { display: false }, y: { display:false }} }
            });
        }

        const services = DB.get(DB.KEYS.SERVICE);
        const maintenance = DB.get(DB.KEYS.MAINT);
        const ctxExp = document.getElementById('expensePieChart');
        
        if(ctxExp) {
            const fuelCost = fuelLogs.reduce((acc, log) => acc + parseFloat(log.price), 0);
            const serviceCost = services.reduce((acc, log) => acc + parseFloat(log.cost), 0);
            const maintC = maintenance.reduce((acc, log) => acc + parseFloat(log.cost), 0);

            if(this.charts.expenses) this.charts.expenses.destroy();
            this.charts.expenses = new window.Chart(ctxExp, {
                type: 'doughnut',
                data: {
                    labels: ['Fuel', 'Service', 'Maintenance'],
                    datasets: [{
                        data: [fuelCost, serviceCost, maintC],
                        backgroundColor: ['#00ffcc', '#ff4757', '#2ed573'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels:{color:'#fff'} } } }
            });
        }
    },

    exportToPDF() {
        if(!window.jspdf) return alert('PDF Library not loaded yet.');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22); doc.text("Ronnin Pro Report", 20, 20);
        const stats = this.calculateStats();
        doc.setFontSize(14);
        doc.text(`ODO: ${stats.totalOdo} km | Mileage: ${stats.avgMileage.toFixed(2)} km/L`, 20, 35);
        doc.save("ronnin_report.pdf");
    }
};
