import { DB } from './db.js';

export const Analytics = {
    charts: {},

    calculateStats() {
        const fuelLogs = DB.get(DB.KEYS.FUEL).sort((a,b) => new Date(a.date) - new Date(b.date));
        const maintenance = DB.get(DB.KEYS.MAINT);
        const services = DB.get(DB.KEYS.SERVICE);
        const bikes = DB.get(DB.KEYS.BIKES);

        let totalOdo = bikes[0] ? parseFloat(bikes[0].initialOdo) || 0 : 0;
        let totalFuel = fuelLogs.reduce((acc, log) => acc + parseFloat(log.liters || 0), 0);
        let avgMileage = 0;
        let recentMileage = 0;

        if (fuelLogs.length > 0) totalOdo = Math.max(totalOdo, ...fuelLogs.map(l => parseFloat(l.odo || 0)));
        if (services.length > 0) totalOdo = Math.max(totalOdo, ...services.map(l => parseFloat(l.odo || 0)));

        let costPerKm = 0;

        if (fuelLogs.length > 1) {
            let totalDistance = 0, totalL = 0;
            for(let i = 1; i < fuelLogs.length; i++) {
                let dist = fuelLogs[i].odo - fuelLogs[i-1].odo;
                if(dist > 0) { 
                    totalDistance += dist; 
                    totalL += parseFloat(fuelLogs[i].liters);
                    recentMileage = dist / parseFloat(fuelLogs[i].liters);
                    if(i === fuelLogs.length - 1 && fuelLogs[i].price) {
                        costPerKm = parseFloat(fuelLogs[i].price) / dist;
                    }
                }
            }
            if(totalL > 0) avgMileage = totalDistance / totalL;
        }
        
        const serviceCost = services.reduce((acc, log) => acc + parseFloat(log.cost || 0), 0);
        const maintCostItem = maintenance.reduce((acc, log) => acc + parseFloat(log.cost || 0), 0);

        let efficiencyScore = 'C';
        if (avgMileage >= 40) efficiencyScore = 'A+';
        else if (avgMileage >= 35) efficiencyScore = 'A';
        else if (avgMileage >= 30) efficiencyScore = 'B';
        else if (avgMileage >= 25) efficiencyScore = 'C';
        else if (avgMileage > 0) efficiencyScore = 'D';
        else efficiencyScore = '-';

        let fuelCapacity = bikes[0] ? parseFloat(bikes[0].fuelCapacity) || 14 : 14;
        let estimatedRange = Math.round(fuelCapacity * (avgMileage || 30));

        return {
            totalOdo,
            totalFuel,
            totalMaintCost: serviceCost + maintCostItem,
            avgMileage,
            recentMileage,
            efficiencyScore,
            estimatedRange,
            fuelCapacity,
            costPerKm
        };
    },

    getSmartSuggestions(stats) {
        let suggestions = [];
        const bikes = DB.get(DB.KEYS.BIKES);
        const services = DB.get(DB.KEYS.SERVICE);
        
        let nextDue = 0;
        if(bikes[0]) {
            if(services.length > 0) nextDue = parseFloat(services[0].nextOdo);
            else nextDue = parseFloat(bikes[0].initialOdo) + parseFloat(bikes[0].serviceInterval || 6000);
        }

        const remainingService = nextDue - stats.totalOdo;

        if(stats.recentMileage > 0 && stats.recentMileage < stats.avgMileage - 2) {
            suggestions.push({
                icon: 'fa-wind',
                title: 'Check Tire Pressure',
                text: `Recent mileage dropped by ${(stats.avgMileage - stats.recentMileage).toFixed(1)} km/L. Low tire pressure is a common cause.`
            });
        } else if(stats.efficiencyScore === 'A+' || stats.efficiencyScore === 'A') {
            suggestions.push({
                icon: 'fa-leaf',
                title: 'Optimal Efficiency',
                text: 'You are maintaining an excellent riding style. Keep up the smooth acceleration!'
            });
        }

        if(remainingService < 0) {
            suggestions.push({
                icon: 'fa-exclamation-triangle',
                title: 'Service Overdue',
                text: `Your service is overdue by ${Math.abs(remainingService)} km. This can severely impact engine health and mileage.`
            });
        } else if(remainingService < 500) {
            suggestions.push({
                icon: 'fa-oil-can',
                title: 'Service Approaching',
                text: `Service due in ${remainingService} km. Booking early ensures peak engine performance.`
            });
        }

        if(stats.avgMileage === 0) {
            suggestions.push({
                icon: 'fa-gas-pump',
                title: 'Log More Fuel',
                text: 'Add at least 2 fuel logs to start receiving smart mileage insights and range predictions.'
            });
        }

        if(suggestions.length === 0) {
            suggestions.push({
                icon: 'fa-road',
                title: 'Ready to Ride',
                text: 'All systems look good. Your Ronin is in great condition.'
            });
        }

        return suggestions;
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

            const ctxCosts = document.getElementById('costsBarChart');
            if(ctxCosts) {
                if(this.charts.costs) this.charts.costs.destroy();
                this.charts.costs = new window.Chart(ctxCosts, {
                    type: 'bar',
                    data: {
                        labels: ['Fuel', 'Service', 'Maintenance'],
                        datasets: [{
                            label: 'Total Cost (₹)',
                            data: [fuelCost, serviceCost, maintC],
                            backgroundColor: ['#00ffcc', '#ff4757', '#2ed573'],
                            borderRadius: 4
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                     scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#fff' } }, x: { grid: { display: false }, ticks: { color: '#fff' } } } }
                });
            }
        }
        
        // Fuel Price Trend
        const ctxPrice = document.getElementById('fuelPriceChart');
        if(ctxPrice) {
            if(this.charts.price) this.charts.price.destroy();
            let priceData = fuelLogs.map(l => parseFloat(l.price) / parseFloat(l.liters)).filter(n => !isNaN(n) && n > 0);
            this.charts.price = new window.Chart(ctxPrice, {
                type: 'line',
                data: {
                    labels: fuelLogs.map(l => l.date),
                    datasets: [{ label: 'Price/L', data: priceData, borderColor: '#ff4757', backgroundColor: 'rgba(255, 71, 87, 0.1)', fill: true, tension: 0.4 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { color: '#fff' } } } }
            });
        }

        // Trips Distance
        const ctxTrips = document.getElementById('tripsChart');
        if(ctxTrips) {
            const trips = DB.get(DB.KEYS.TRIPS) || [];
            if(this.charts.trips) this.charts.trips.destroy();
            this.charts.trips = new window.Chart(ctxTrips, {
                type: 'bar',
                data: {
                    labels: trips.slice(-5).map(t => t.name),
                    datasets: [{ label: 'Distance (km)', data: trips.slice(-5).map(t => t.distance), backgroundColor: '#a29bfe', borderRadius: 4 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#fff' } }, y: { ticks: { color: '#fff' } } } }
            });
        }
        
        // Maintenance Breakdown
        const ctxMaintBreakdown = document.getElementById('maintBreakdownChart');
        if(ctxMaintBreakdown) {
            if(this.charts.maintBreakdown) this.charts.maintBreakdown.destroy();
            let parts = {};
            maintenance.forEach(l => {
                parts[l.part] = (parts[l.part] || 0) + parseFloat(l.cost);
            });
            this.charts.maintBreakdown = new window.Chart(ctxMaintBreakdown, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(parts).length ? Object.keys(parts) : ['None'],
                    datasets: [{ data: Object.keys(parts).length ? Object.values(parts) : [1], backgroundColor: ['#00b8d4', '#6c5ce7', '#fdcb6e', '#e17055'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels:{color:'#fff'} } } }
            });
        }
    },

    exportToPDF() {
        if(!window.jspdf) return window.UI.alert('PDF Library not loaded yet.', 'Library Error', 'fa-exclamation-triangle', 'var(--danger)');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const marginX = 20;
        let y = 30;

        // Header
        doc.setFillColor(5, 5, 5);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(0, 255, 204);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("Ronnin Pro Report", marginX, 25);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        y = 60;

        const stats = this.calculateStats();
        
        // Report Date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, marginX, y);
        y += 15;

        // Stats Section
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Vehicle Statistics", marginX, y);
        y += 10;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        const lines = [
            `Total ODO: ${stats.totalOdo} km`,
            `Average Mileage: ${stats.avgMileage.toFixed(2)} km/L`,
            `Total Fuel Consumed: ${stats.totalFuel.toFixed(2)} L`,
            `Total Maintenance Cost: ₹${stats.totalMaintCost.toFixed(2)}`,
            `Efficiency Score: ${stats.efficiencyScore}`,
            `Estimated Range: ${stats.estimatedRange} km`
        ];
        
        lines.forEach(line => {
            doc.text(line, marginX, y);
            y += 8;
        });

        y += 15;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Recent Logs", marginX, y);
        y += 10;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        
        const fuelLogs = DB.get(DB.KEYS.FUEL) || [];
        const serviceLogs = DB.get(DB.KEYS.SERVICE) || [];
        const maintLogs = DB.get(DB.KEYS.MAINT) || [];
        
        const logs = [...fuelLogs, ...serviceLogs, ...maintLogs]
            .sort((a,b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
            .slice(0, 5);
        
        if(logs.length === 0) {
            doc.text("No logs available.", marginX, y);
        } else {
            logs.forEach(log => {
                let text = `${log.date || ''} - ${log.type}: `;
                if(log.type === 'Fuel') text += `${log.liters}L ($${log.price})`;
                if(log.type === 'Service') text += `${log.typeText} ($${log.cost})`;
                if(log.type === 'Maintenance') text += `${log.part} ($${log.cost})`;
                doc.text(text, marginX, y);
                y += 8;
            });
        }

        // Footer
        doc.setDrawColor(200, 200, 200);
        doc.line(marginX, 280, 190, 280);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Ronnin Pro - Ride Smart, Ride Safe", marginX, 287);

        doc.save("ronnin_report.pdf");
    }
};
