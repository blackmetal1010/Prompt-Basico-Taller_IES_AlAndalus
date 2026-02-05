/**
 * MONOPOLY TRACKER - Gráficos con Canvas
 */

const Charts = {
    colors: ['#e94560', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#ff6b9d'],

    renderAll() {
        this.renderBalanceChart();
        this.renderConceptChart();
        this.renderEvolutionChart();
    },

    // Gráfico de barras - Balance por jugador
    renderBalanceChart() {
        const canvas = document.getElementById('balanceChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const stats = monopolyData.getEstadisticas();
        if (!stats || !stats.jugadores.length) {
            this.drawEmpty(ctx, canvas, 'Sin datos de jugadores');
            return;
        }

        const { width, height } = this.setupCanvas(canvas);
        const padding = 60;
        const barWidth = Math.min(60, (width - padding * 2) / stats.jugadores.length - 10);
        const maxVal = Math.max(...stats.jugadores.map(j => Math.abs(j.saldoActual)), 1);

        ctx.clearRect(0, 0, width, height);
        
        // Eje Y
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Barras
        stats.jugadores.forEach((j, i) => {
            const x = padding + 20 + i * (barWidth + 15);
            const barHeight = (Math.abs(j.saldoActual) / maxVal) * (height - padding * 2 - 40);
            const y = height - padding - barHeight;
            
            ctx.fillStyle = j.color || this.colors[i % this.colors.length];
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Nombre
            ctx.fillStyle = '#f0f6fc';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(j.nombre.slice(0, 8), x + barWidth/2, height - padding + 20);
            
            // Valor
            ctx.fillText(`$${j.saldoActual.toLocaleString()}`, x + barWidth/2, y - 10);
        });
    },

    // Gráfico circular - Distribución por concepto
    renderConceptChart() {
        const canvas = document.getElementById('conceptChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const stats = monopolyData.getEstadisticas();
        if (!stats || !Object.keys(stats.porConcepto).length) {
            this.drawEmpty(ctx, canvas, 'Sin transacciones');
            return;
        }

        const { width, height } = this.setupCanvas(canvas);
        ctx.clearRect(0, 0, width, height);

        const data = Object.entries(stats.porConcepto).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const total = data.reduce((s, [, v]) => s + v, 0);
        const centerX = width / 2 - 60;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 60;

        let startAngle = -Math.PI / 2;
        data.forEach(([concepto, valor], i) => {
            const sliceAngle = (valor / total) * Math.PI * 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = this.colors[i % this.colors.length];
            ctx.fill();
            
            startAngle += sliceAngle;
        });

        // Leyenda
        ctx.font = '11px Inter';
        ctx.textAlign = 'left';
        data.forEach(([concepto, valor], i) => {
            const y = 30 + i * 22;
            ctx.fillStyle = this.colors[i % this.colors.length];
            ctx.fillRect(width - 140, y - 10, 12, 12);
            ctx.fillStyle = '#f0f6fc';
            ctx.fillText(`${concepto.slice(0, 12)}`, width - 122, y);
        });
    },

    // Gráfico de líneas - Evolución
    renderEvolutionChart() {
        const canvas = document.getElementById('evolutionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const jugadores = monopolyData.getJugadores();
        const txs = monopolyData.getTransacciones();
        
        if (!jugadores.length || !txs.length) {
            this.drawEmpty(ctx, canvas, 'Sin datos de evolución');
            return;
        }

        const { width, height } = this.setupCanvas(canvas);
        const padding = 60;
        ctx.clearRect(0, 0, width, height);

        // Calcular evolución
        const sortedTxs = [...txs].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        const evolution = {};
        jugadores.forEach(j => {
            evolution[j.id] = [{ x: 0, y: j.saldoInicial || 1500 }];
        });

        sortedTxs.forEach((t, i) => {
            jugadores.forEach(j => {
                const lastVal = evolution[j.id][evolution[j.id].length - 1].y;
                let newVal = lastVal;
                if (t.jugadorDestino === j.id) newVal += t.monto;
                if (t.jugadorOrigen === j.id) newVal -= t.monto;
                evolution[j.id].push({ x: i + 1, y: newVal });
            });
        });

        const allVals = Object.values(evolution).flat().map(p => p.y);
        const maxVal = Math.max(...allVals);
        const minVal = Math.min(...allVals);
        const range = maxVal - minVal || 1;
        const xStep = (width - padding * 2) / (sortedTxs.length || 1);

        // Ejes
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Líneas por jugador
        jugadores.forEach((j, idx) => {
            const points = evolution[j.id];
            ctx.beginPath();
            ctx.strokeStyle = j.color || this.colors[idx % this.colors.length];
            ctx.lineWidth = 2;
            
            points.forEach((p, i) => {
                const x = padding + p.x * xStep;
                const y = height - padding - ((p.y - minVal) / range) * (height - padding * 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });

        // Leyenda
        ctx.font = '11px Inter';
        jugadores.forEach((j, i) => {
            ctx.fillStyle = j.color || this.colors[i % this.colors.length];
            ctx.fillRect(padding + i * 100, 15, 12, 12);
            ctx.fillStyle = '#f0f6fc';
            ctx.fillText(j.nombre, padding + i * 100 + 18, 25);
        });
    },

    setupCanvas(canvas) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = 280;
        return { width: canvas.width, height: canvas.height };
    },

    drawEmpty(ctx, canvas, text) {
        this.setupCanvas(canvas);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#8b949e';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
};
