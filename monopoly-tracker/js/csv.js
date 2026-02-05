/**
 * MONOPOLY TRACKER - CSV Import/Export
 */

const CSV = {
    // Exportar transacciones a CSV
    exportTransactions() {
        const txs = monopolyData.getTransacciones();
        if (!txs.length) {
            UI.showToast('No hay transacciones para exportar', 'error');
            return;
        }

        const headers = ['Fecha', 'JugadorOrigen', 'JugadorDestino', 'Concepto', 'Monto', 'Propiedad', 'ColorGrupo', 'Casas', 'Hotel', 'Notas'];
        const rows = txs.map(t => {
            const origen = monopolyData.getJugadorById(t.jugadorOrigen);
            const destino = monopolyData.getJugadorById(t.jugadorDestino);
            return [
                new Date(t.fecha).toISOString(),
                origen?.nombre || 'Banca',
                destino?.nombre || 'Banca',
                t.concepto,
                t.monto,
                t.propiedad || '',
                t.colorGrupo || '',
                t.casas,
                t.hotel ? 'Sí' : 'No',
                t.notas || ''
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        this.downloadFile(csv, 'transacciones.csv', 'text/csv');
        UI.showToast('Transacciones exportadas correctamente', 'success');
    },

    // Exportar todo como JSON
    exportJSON() {
        const json = monopolyData.exportarJSON();
        this.downloadFile(json, 'monopoly-backup.json', 'application/json');
        UI.showToast('Backup exportado correctamente', 'success');
    },

    // Descargar archivo
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Parsear CSV
    parseCSV(text) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return { headers: [], rows: [] };

        const parseRow = line => {
            const result = [];
            let current = '', inQuotes = false;
            for (let char of line) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
                else current += char;
            }
            result.push(current.trim());
            return result;
        };

        return {
            headers: parseRow(lines[0]),
            rows: lines.slice(1).map(parseRow)
        };
    },

    // Importar CSV
    importCSV(text) {
        const { headers, rows } = this.parseCSV(text);
        if (!rows.length) {
            UI.showToast('El archivo CSV está vacío', 'error');
            return false;
        }

        // Mapear columnas
        const colMap = {};
        const possibleCols = {
            fecha: ['fecha', 'date', 'datetime'],
            jugadorOrigen: ['jugadororigen', 'origen', 'de', 'from', 'paga'],
            jugadorDestino: ['jugadordestino', 'destino', 'para', 'to', 'cobra'],
            concepto: ['concepto', 'tipo', 'concept', 'type'],
            monto: ['monto', 'cantidad', 'amount', 'value'],
            propiedad: ['propiedad', 'property'],
            colorGrupo: ['colorgrupo', 'color', 'grupo'],
            casas: ['casas', 'houses'],
            hotel: ['hotel'],
            notas: ['notas', 'notes', 'comentarios']
        };

        headers.forEach((h, i) => {
            const hLower = h.toLowerCase().replace(/[^a-z]/g, '');
            for (let [key, aliases] of Object.entries(possibleCols)) {
                if (aliases.includes(hLower)) colMap[key] = i;
            }
        });

        // Crear jugadores si no existen
        const jugadores = monopolyData.getJugadores();
        const jugadorMap = {};
        jugadores.forEach(j => jugadorMap[j.nombre.toLowerCase()] = j.id);
        jugadorMap['banca'] = 'banca';

        let imported = 0;
        rows.forEach(row => {
            const origenNombre = (row[colMap.jugadorOrigen] || 'Banca').toLowerCase();
            const destinoNombre = (row[colMap.jugadorDestino] || 'Banca').toLowerCase();
            
            // Crear jugador si no existe
            if (!jugadorMap[origenNombre] && origenNombre !== 'banca') {
                const j = monopolyData.agregarJugador({ nombre: row[colMap.jugadorOrigen] });
                if (j) jugadorMap[origenNombre] = j.id;
            }
            if (!jugadorMap[destinoNombre] && destinoNombre !== 'banca') {
                const j = monopolyData.agregarJugador({ nombre: row[colMap.jugadorDestino] });
                if (j) jugadorMap[destinoNombre] = j.id;
            }

            const tx = {
                fecha: colMap.fecha !== undefined ? new Date(row[colMap.fecha]) : new Date(),
                jugadorOrigen: jugadorMap[origenNombre] || 'banca',
                jugadorDestino: jugadorMap[destinoNombre] || 'banca',
                concepto: row[colMap.concepto] || 'Otro',
                monto: parseFloat(row[colMap.monto]) || 0,
                propiedad: row[colMap.propiedad] || null,
                colorGrupo: row[colMap.colorGrupo] || null,
                casas: parseInt(row[colMap.casas]) || 0,
                hotel: ['sí', 'si', 'yes', '1', 'true'].includes((row[colMap.hotel] || '').toLowerCase()),
                notas: row[colMap.notas] || ''
            };

            if (tx.monto > 0) {
                monopolyData.agregarTransaccion(tx);
                imported++;
            }
        });

        UI.showToast(`Importadas ${imported} transacciones`, 'success');
        UI.refreshCurrentView();
        return true;
    },

    // Mostrar preview
    showPreview(text) {
        const { headers, rows } = this.parseCSV(text);
        const preview = document.getElementById('importPreview');
        const table = document.getElementById('previewTable');
        
        if (!rows.length) {
            preview.hidden = true;
            return;
        }

        preview.hidden = false;
        table.querySelector('thead').innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        table.querySelector('tbody').innerHTML = rows.slice(0, 5).map(row => 
            `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`
        ).join('');
        
        document.getElementById('confirmImport').disabled = false;
    }
};
