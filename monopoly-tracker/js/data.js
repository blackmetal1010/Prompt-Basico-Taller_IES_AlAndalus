/**
 * MONOPOLY TRACKER - Modelo de Datos y LocalStorage
 * Gestión de partidas, jugadores y transacciones
 */

// Generar UUID
const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

// Conceptos disponibles
const CONCEPTOS = [
    'Alquiler', 'Compra Propiedad', 'Venta Propiedad',
    'Construcción Casa', 'Construcción Hotel',
    'Hipoteca', 'Deshipoteca',
    'Impuesto Lujo', 'Impuesto Renta',
    'Carta Suerte', 'Carta Caja Comunidad',
    'Salida (Cobro 200)', 'Cárcel (Fianza)', 'Otro'
];

// Colores de propiedades
const COLORES_PROPIEDAD = [
    { value: 'Marrón', emoji: '🟤', color: '#8B4513' },
    { value: 'Celeste', emoji: '🩵', color: '#87CEEB' },
    { value: 'Rosa', emoji: '🩷', color: '#FF69B4' },
    { value: 'Naranja', emoji: '🟠', color: '#FFA500' },
    { value: 'Rojo', emoji: '🔴', color: '#e94560' },
    { value: 'Amarillo', emoji: '🟡', color: '#f1c40f' },
    { value: 'Verde', emoji: '🟢', color: '#2ecc71' },
    { value: 'Azul', emoji: '🔵', color: '#3498db' },
    { value: 'Estación', emoji: '🚂', color: '#6c757d' },
    { value: 'Servicio', emoji: '💡', color: '#9b59b6' }
];

// Clase principal de datos
class MonopolyData {
    constructor() {
        this.storageKey = 'monopolyTracker';
        this.data = this.load();
    }

    // Cargar datos de LocalStorage
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                // Convertir fechas de string a Date
                data.partidas.forEach(p => {
                    p.fechaInicio = new Date(p.fechaInicio);
                    if (p.fechaFin) p.fechaFin = new Date(p.fechaFin);
                    p.transacciones.forEach(t => t.fecha = new Date(t.fecha));
                });
                return data;
            }
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
        return { partidas: [], partidaActiva: null };
    }

    // Guardar en LocalStorage
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('Error guardando datos:', e);
            return false;
        }
    }

    // ===== PARTIDAS =====
    getPartidas() { return this.data.partidas; }
    
    getPartidaActiva() {
        if (!this.data.partidaActiva) return null;
        return this.data.partidas.find(p => p.id === this.data.partidaActiva);
    }

    setPartidaActiva(id) {
        this.data.partidaActiva = id;
        this.save();
    }

    crearPartida(nombre) {
        const partida = {
            id: generateUUID(),
            nombre,
            fechaInicio: new Date(),
            fechaFin: null,
            jugadores: [],
            transacciones: [],
            activa: true
        };
        this.data.partidas.push(partida);
        this.data.partidaActiva = partida.id;
        this.save();
        return partida;
    }

    eliminarPartida(id) {
        this.data.partidas = this.data.partidas.filter(p => p.id !== id);
        if (this.data.partidaActiva === id) {
            this.data.partidaActiva = this.data.partidas[0]?.id || null;
        }
        this.save();
    }

    // ===== JUGADORES =====
    getJugadores() {
        const partida = this.getPartidaActiva();
        return partida ? partida.jugadores : [];
    }

    getJugadorById(id) {
        if (id === 'banca') return { id: 'banca', nombre: 'Banca', avatar: '🏦', color: '#6c757d' };
        return this.getJugadores().find(j => j.id === id);
    }

    agregarJugador(jugador) {
        const partida = this.getPartidaActiva();
        if (!partida) return null;
        
        const nuevoJugador = {
            id: generateUUID(),
            nombre: jugador.nombre,
            color: jugador.color || '#e94560',
            avatar: jugador.avatar || '🎩',
            saldoInicial: jugador.saldoInicial || 1500
        };
        partida.jugadores.push(nuevoJugador);
        this.save();
        return nuevoJugador;
    }

    actualizarJugador(id, datos) {
        const partida = this.getPartidaActiva();
        if (!partida) return null;
        
        const idx = partida.jugadores.findIndex(j => j.id === id);
        if (idx === -1) return null;
        
        partida.jugadores[idx] = { ...partida.jugadores[idx], ...datos };
        this.save();
        return partida.jugadores[idx];
    }

    eliminarJugador(id) {
        const partida = this.getPartidaActiva();
        if (!partida) return false;
        
        partida.jugadores = partida.jugadores.filter(j => j.id !== id);
        this.save();
        return true;
    }

    calcularSaldo(jugadorId) {
        const partida = this.getPartidaActiva();
        if (!partida) return 0;
        
        const jugador = partida.jugadores.find(j => j.id === jugadorId);
        if (!jugador) return 0;
        
        let saldo = jugador.saldoInicial || 1500;
        
        partida.transacciones.forEach(t => {
            if (t.jugadorDestino === jugadorId) saldo += t.monto;
            if (t.jugadorOrigen === jugadorId) saldo -= t.monto;
        });
        
        return saldo;
    }

    // ===== TRANSACCIONES =====
    getTransacciones() {
        const partida = this.getPartidaActiva();
        return partida ? partida.transacciones : [];
    }

    getTransaccionById(id) {
        return this.getTransacciones().find(t => t.id === id);
    }

    agregarTransaccion(transaccion) {
        const partida = this.getPartidaActiva();
        if (!partida) return null;
        
        const nuevaTx = {
            id: generateUUID(),
            fecha: transaccion.fecha || new Date(),
            jugadorOrigen: transaccion.jugadorOrigen,
            jugadorDestino: transaccion.jugadorDestino,
            concepto: transaccion.concepto,
            monto: parseFloat(transaccion.monto) || 0,
            propiedad: transaccion.propiedad || null,
            colorGrupo: transaccion.colorGrupo || null,
            casas: parseInt(transaccion.casas) || 0,
            hotel: !!transaccion.hotel,
            notas: transaccion.notas || ''
        };
        
        partida.transacciones.push(nuevaTx);
        this.save();
        return nuevaTx;
    }

    actualizarTransaccion(id, datos) {
        const partida = this.getPartidaActiva();
        if (!partida) return null;
        
        const idx = partida.transacciones.findIndex(t => t.id === id);
        if (idx === -1) return null;
        
        partida.transacciones[idx] = { ...partida.transacciones[idx], ...datos };
        this.save();
        return partida.transacciones[idx];
    }

    eliminarTransaccion(id) {
        const partida = this.getPartidaActiva();
        if (!partida) return false;
        
        partida.transacciones = partida.transacciones.filter(t => t.id !== id);
        this.save();
        return true;
    }

    // Filtrar transacciones
    filtrarTransacciones({ jugador, concepto, colorGrupo, busqueda }) {
        let txs = this.getTransacciones();
        
        if (jugador) {
            txs = txs.filter(t => t.jugadorOrigen === jugador || t.jugadorDestino === jugador);
        }
        if (concepto) {
            txs = txs.filter(t => t.concepto === concepto);
        }
        if (colorGrupo) {
            txs = txs.filter(t => t.colorGrupo === colorGrupo);
        }
        if (busqueda) {
            const search = busqueda.toLowerCase();
            txs = txs.filter(t => 
                t.concepto.toLowerCase().includes(search) ||
                (t.propiedad && t.propiedad.toLowerCase().includes(search)) ||
                (t.notas && t.notas.toLowerCase().includes(search))
            );
        }
        
        return txs;
    }

    // ===== ESTADÍSTICAS =====
    getEstadisticas() {
        const partida = this.getPartidaActiva();
        if (!partida) return null;

        const jugadores = partida.jugadores.map(j => ({
            ...j,
            saldoActual: this.calcularSaldo(j.id)
        }));

        const lider = jugadores.reduce((max, j) => j.saldoActual > max.saldoActual ? j : max, jugadores[0]);

        const porConcepto = {};
        partida.transacciones.forEach(t => {
            porConcepto[t.concepto] = (porConcepto[t.concepto] || 0) + t.monto;
        });

        return {
            jugadores,
            totalTransacciones: partida.transacciones.length,
            lider,
            porConcepto
        };
    }

    // ===== EXPORT/IMPORT =====
    exportarJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    importarJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.data = data;
            this.save();
            return true;
        } catch (e) {
            console.error('Error importando JSON:', e);
            return false;
        }
    }
}

// Instancia global
const monopolyData = new MonopolyData();
