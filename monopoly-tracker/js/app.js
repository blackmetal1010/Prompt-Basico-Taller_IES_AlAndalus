/**
 * MONOPOLY TRACKER - Controlador Principal
 * Inicialización y gestión de eventos
 */

const App = {
    // Variables para confirmación de eliminación
    deleteTarget: null,
    deleteType: null,
    csvData: null,

    // Inicializar aplicación
    init() {
        this.bindEvents();
        this.checkInitialState();
        UI.updateGameSelect();
        UI.switchView('dashboard');
        console.log('🎩 Monopoly Tracker iniciado');
    },

    // Verificar estado inicial
    checkInitialState() {
        const partida = monopolyData.getPartidaActiva();
        if (!partida) {
            // Crear partida de demo
            monopolyData.crearPartida('Mi Primera Partida');
            UI.showToast('¡Bienvenido! Se ha creado tu primera partida', 'success');
        }
    },

    // Bindear eventos
    bindEvents() {
        // Navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => UI.switchView(btn.dataset.view));
        });

        // Menú hamburguesa
        document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
            document.querySelector('.header__nav')?.classList.toggle('active');
        });

        // Selección de partida
        document.getElementById('gameSelect')?.addEventListener('change', (e) => {
            if (e.target.value) {
                monopolyData.setPartidaActiva(e.target.value);
                UI.refreshCurrentView();
                UI.showToast('Partida cambiada', 'info');
            }
        });

        // Botones de header
        document.getElementById('btnNewGame')?.addEventListener('click', () => UI.openModal('gameModal'));
        document.getElementById('btnImportCSV')?.addEventListener('click', () => UI.openModal('importModal'));
        document.getElementById('btnExportCSV')?.addEventListener('click', () => CSV.exportTransactions());

        // Botones principales
        document.getElementById('btnAddTransaction')?.addEventListener('click', () => this.openTransactionModal());
        document.getElementById('btnAddPlayer')?.addEventListener('click', () => this.openPlayerModal());

        // Formularios
        document.getElementById('transactionForm')?.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.getElementById('playerForm')?.addEventListener('submit', (e) => this.handlePlayerSubmit(e));
        document.getElementById('gameForm')?.addEventListener('submit', (e) => this.handleGameSubmit(e));

        // Cerrar modales
        document.querySelectorAll('.modal__close, .modal__cancel').forEach(btn => {
            btn.addEventListener('click', () => UI.closeAllModals());
        });
        document.querySelectorAll('.modal__backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => UI.closeAllModals());
        });

        // Escape para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') UI.closeAllModals();
        });

        // Filtros y búsqueda
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            UI.filters.busqueda = e.target.value;
            UI.currentPage = 1;
            UI.renderTransactions();
        });
        ['filterPlayer', 'filterConcept', 'filterColor'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                const filterKey = id === 'filterPlayer' ? 'jugador' : id === 'filterConcept' ? 'concepto' : 'colorGrupo';
                UI.filters[filterKey] = e.target.value;
                UI.currentPage = 1;
                UI.renderTransactions();
            });
        });

        // Paginación
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (UI.currentPage > 1) { UI.currentPage--; UI.renderTransactions(); }
        });
        document.getElementById('nextPage')?.addEventListener('click', () => {
            UI.currentPage++;
            UI.renderTransactions();
        });

        // Ordenación de tabla
        document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (UI.sortColumn === col) {
                    UI.sortDirection = UI.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    UI.sortColumn = col;
                    UI.sortDirection = 'desc';
                }
                UI.renderTransactions();
            });
        });

        // Avatar picker
        document.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('playerAvatar').value = btn.dataset.avatar;
            });
        });

        // Color picker
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('playerColor').value = btn.dataset.color;
            });
        });

        // Confirmar eliminación
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());

        // Import CSV
        this.bindImportEvents();
    },

    bindImportEvents() {
        const zone = document.getElementById('importZone');
        const input = document.getElementById('csvFileInput');
        
        document.getElementById('selectFileBtn')?.addEventListener('click', () => input?.click());
        
        input?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileSelect(file);
        });

        zone?.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone?.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        });

        document.getElementById('confirmImport')?.addEventListener('click', () => {
            if (this.csvData) {
                CSV.importCSV(this.csvData);
                UI.closeAllModals();
                this.csvData = null;
            }
        });
    },

    handleFileSelect(file) {
        if (!file.name.endsWith('.csv')) {
            UI.showToast('Por favor selecciona un archivo CSV', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            this.csvData = e.target.result;
            CSV.showPreview(this.csvData);
        };
        reader.readAsText(file);
    },

    // ===== TRANSACCIONES =====
    openTransactionModal(id = null) {
        const form = document.getElementById('transactionForm');
        form.reset();
        document.getElementById('transactionId').value = '';
        document.getElementById('transactionModalTitle').textContent = 'Nueva Transacción';
        document.getElementById('txFecha').value = new Date().toISOString().slice(0, 16);
        
        UI.updatePlayerSelects();

        if (id) {
            const tx = monopolyData.getTransaccionById(id);
            if (tx) {
                document.getElementById('transactionModalTitle').textContent = 'Editar Transacción';
                document.getElementById('transactionId').value = tx.id;
                document.getElementById('txJugadorOrigen').value = tx.jugadorOrigen;
                document.getElementById('txJugadorDestino').value = tx.jugadorDestino;
                document.getElementById('txConcepto').value = tx.concepto;
                document.getElementById('txMonto').value = tx.monto;
                document.getElementById('txPropiedad').value = tx.propiedad || '';
                document.getElementById('txColorGrupo').value = tx.colorGrupo || '';
                document.getElementById('txCasas').value = tx.casas;
                document.getElementById('txHotel').checked = tx.hotel;
                document.getElementById('txNotas').value = tx.notas || '';
                document.getElementById('txFecha').value = new Date(tx.fecha).toISOString().slice(0, 16);
            }
        }
        UI.openModal('transactionModal');
    },

    handleTransactionSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('transactionId').value;
        const data = {
            jugadorOrigen: document.getElementById('txJugadorOrigen').value,
            jugadorDestino: document.getElementById('txJugadorDestino').value,
            concepto: document.getElementById('txConcepto').value,
            monto: document.getElementById('txMonto').value,
            propiedad: document.getElementById('txPropiedad').value,
            colorGrupo: document.getElementById('txColorGrupo').value,
            casas: document.getElementById('txCasas').value,
            hotel: document.getElementById('txHotel').checked,
            notas: document.getElementById('txNotas').value,
            fecha: new Date(document.getElementById('txFecha').value)
        };

        if (id) {
            monopolyData.actualizarTransaccion(id, data);
            UI.showToast('Transacción actualizada', 'success');
        } else {
            monopolyData.agregarTransaccion(data);
            UI.showToast('Transacción añadida', 'success');
        }
        
        UI.closeAllModals();
        UI.refreshCurrentView();
    },

    editTransaction(id) { this.openTransactionModal(id); },

    deleteTransaction(id) {
        this.deleteTarget = id;
        this.deleteType = 'transaction';
        document.getElementById('confirmMessage').textContent = '¿Eliminar esta transacción?';
        UI.openModal('confirmModal');
    },

    // ===== JUGADORES =====
    openPlayerModal(id = null) {
        const form = document.getElementById('playerForm');
        form.reset();
        document.getElementById('playerId').value = '';
        document.getElementById('playerModalTitle').textContent = 'Nuevo Jugador';
        document.getElementById('playerSaldoInicial').value = 1500;
        
        document.querySelectorAll('.avatar-option, .color-option').forEach(b => b.classList.remove('selected'));
        document.querySelector('.avatar-option')?.classList.add('selected');
        document.querySelector('.color-option')?.classList.add('selected');

        if (id) {
            const j = monopolyData.getJugadorById(id);
            if (j) {
                document.getElementById('playerModalTitle').textContent = 'Editar Jugador';
                document.getElementById('playerId').value = j.id;
                document.getElementById('playerNombre').value = j.nombre;
                document.getElementById('playerAvatar').value = j.avatar;
                document.getElementById('playerColor').value = j.color;
                document.getElementById('playerSaldoInicial').value = j.saldoInicial || 1500;
                
                document.querySelector(`.avatar-option[data-avatar="${j.avatar}"]`)?.classList.add('selected');
                document.querySelector(`.color-option[data-color="${j.color}"]`)?.classList.add('selected');
            }
        }
        UI.openModal('playerModal');
    },

    handlePlayerSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('playerId').value;
        const data = {
            nombre: document.getElementById('playerNombre').value,
            avatar: document.getElementById('playerAvatar').value,
            color: document.getElementById('playerColor').value,
            saldoInicial: parseInt(document.getElementById('playerSaldoInicial').value) || 1500
        };

        if (id) {
            monopolyData.actualizarJugador(id, data);
            UI.showToast('Jugador actualizado', 'success');
        } else {
            monopolyData.agregarJugador(data);
            UI.showToast('Jugador añadido', 'success');
        }
        
        UI.closeAllModals();
        UI.refreshCurrentView();
    },

    editPlayer(id) { this.openPlayerModal(id); },

    deletePlayer(id) {
        this.deleteTarget = id;
        this.deleteType = 'player';
        document.getElementById('confirmMessage').textContent = '¿Eliminar este jugador? Sus transacciones se mantendrán.';
        UI.openModal('confirmModal');
    },

    // ===== PARTIDAS =====
    handleGameSubmit(e) {
        e.preventDefault();
        const nombre = document.getElementById('gameName').value;
        monopolyData.crearPartida(nombre);
        UI.updateGameSelect();
        UI.closeAllModals();
        UI.refreshCurrentView();
        UI.showToast('Nueva partida creada', 'success');
    },

    // ===== CONFIRMACIÓN =====
    confirmDelete() {
        if (this.deleteType === 'transaction') {
            monopolyData.eliminarTransaccion(this.deleteTarget);
            UI.showToast('Transacción eliminada', 'success');
        } else if (this.deleteType === 'player') {
            monopolyData.eliminarJugador(this.deleteTarget);
            UI.showToast('Jugador eliminado', 'success');
        }
        
        this.deleteTarget = null;
        this.deleteType = null;
        UI.closeAllModals();
        UI.refreshCurrentView();
    }
};

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => App.init());
