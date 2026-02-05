/**
 * MONOPOLY TRACKER - UI Rendering
 * Renderizado de componentes y manipulación del DOM
 */

const UI = {
    // Estado de UI
    currentView: 'dashboard',
    currentPage: 1,
    itemsPerPage: 10,
    sortColumn: 'fecha',
    sortDirection: 'desc',
    filters: { jugador: '', concepto: '', colorGrupo: '', busqueda: '' },

    // Mostrar toast
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    // Cambiar vista
    switchView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`${view}View`)?.classList.add('view--active');
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        this.currentView = view;
        this.refreshCurrentView();
    },

    refreshCurrentView() {
        switch (this.currentView) {
            case 'dashboard': this.renderDashboard(); break;
            case 'transactions': this.renderTransactions(); break;
            case 'players': this.renderPlayers(); break;
            case 'stats': this.renderStats(); break;
        }
    },

    // ===== DASHBOARD =====
    renderDashboard() {
        this.renderPlayerCards();
        this.renderRecentTransactions();
        this.renderSummary();
    },

    renderPlayerCards() {
        const container = document.getElementById('playerCards');
        const jugadores = monopolyData.getJugadores();
        
        if (!jugadores.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">👥</div><p class="empty-state__title">Sin jugadores</p><p>Añade jugadores para comenzar</p></div>`;
            return;
        }
        
        container.innerHTML = jugadores.map(j => {
            const saldo = monopolyData.calcularSaldo(j.id);
            const saldoClass = saldo >= 0 ? 'positive' : 'negative';
            return `
                <div class="player-card stagger-item">
                    <div class="player-card__avatar" style="background:${j.color}20; border: 2px solid ${j.color}">${j.avatar}</div>
                    <div class="player-card__info">
                        <div class="player-card__name">${j.nombre}</div>
                        <div class="player-card__balance ${saldoClass}">$${saldo.toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        const txs = monopolyData.getTransacciones().slice(-5).reverse();
        
        if (!txs.length) {
            container.innerHTML = '<p class="empty-state__text">No hay transacciones aún</p>';
            return;
        }
        
        container.innerHTML = txs.map(t => {
            const origen = monopolyData.getJugadorById(t.jugadorOrigen);
            const destino = monopolyData.getJugadorById(t.jugadorDestino);
            return `
                <div class="recent-item">
                    <div class="recent-item__info">
                        <span class="recent-item__players">${origen?.avatar || '?'} → ${destino?.avatar || '?'}</span>
                        <span class="recent-item__concept">${t.concepto}</span>
                    </div>
                    <span class="recent-item__amount income">$${t.monto.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    },

    renderSummary() {
        const partida = monopolyData.getPartidaActiva();
        const stats = monopolyData.getEstadisticas();
        
        document.getElementById('activeGameName').textContent = partida?.nombre || 'Sin partida';
        document.getElementById('totalTransactions').textContent = stats?.totalTransacciones || 0;
        document.getElementById('currentLeader').textContent = stats?.lider?.nombre || '-';
    },

    // ===== TRANSACCIONES =====
    renderTransactions() {
        this.updatePlayerSelects();
        const txs = this.getFilteredSortedTransactions();
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paged = txs.slice(start, start + this.itemsPerPage);
        const totalPages = Math.ceil(txs.length / this.itemsPerPage) || 1;
        
        const tbody = document.getElementById('transactionsBody');
        if (!paged.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay transacciones</td></tr>';
        } else {
            tbody.innerHTML = paged.map(t => {
                const origen = monopolyData.getJugadorById(t.jugadorOrigen);
                const destino = monopolyData.getJugadorById(t.jugadorDestino);
                const colorInfo = COLORES_PROPIEDAD.find(c => c.value === t.colorGrupo);
                return `
                    <tr>
                        <td>${new Date(t.fecha).toLocaleDateString()}</td>
                        <td>${origen?.avatar || ''} ${origen?.nombre || 'Banca'}</td>
                        <td>${destino?.avatar || ''} ${destino?.nombre || 'Banca'}</td>
                        <td>${t.concepto}</td>
                        <td class="recent-item__amount income">$${t.monto.toLocaleString()}</td>
                        <td>${t.propiedad || '-'} ${colorInfo ? `<span class="color-badge" style="background:${colorInfo.color}20;color:${colorInfo.color}">${colorInfo.emoji}</span>` : ''}</td>
                        <td class="action-btns">
                            <button class="action-btn" onclick="App.editTransaction('${t.id}')" title="Editar">✏️</button>
                            <button class="action-btn action-btn--delete" onclick="App.deleteTransaction('${t.id}')" title="Eliminar">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        document.getElementById('pageInfo').textContent = `Página ${this.currentPage} de ${totalPages}`;
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= totalPages;
    },

    getFilteredSortedTransactions() {
        let txs = monopolyData.filtrarTransacciones(this.filters);
        txs.sort((a, b) => {
            let valA = a[this.sortColumn], valB = b[this.sortColumn];
            if (this.sortColumn === 'fecha') { valA = new Date(valA); valB = new Date(valB); }
            if (this.sortColumn === 'monto') { valA = parseFloat(valA); valB = parseFloat(valB); }
            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return txs;
    },

    updatePlayerSelects() {
        const jugadores = monopolyData.getJugadores();
        const opts = jugadores.map(j => `<option value="${j.id}">${j.avatar} ${j.nombre}</option>`).join('');
        
        ['txJugadorOrigen', 'txJugadorDestino'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<option value="">Seleccionar...</option><option value="banca">🏦 Banca</option>${opts}`;
        });
        
        const filterPlayer = document.getElementById('filterPlayer');
        if (filterPlayer) filterPlayer.innerHTML = `<option value="">Todos los jugadores</option>${opts}`;
    },

    // ===== JUGADORES =====
    renderPlayers() {
        const container = document.getElementById('playersGrid');
        const jugadores = monopolyData.getJugadores();
        
        if (!jugadores.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">👥</div><p class="empty-state__title">Sin jugadores</p><p>Añade jugadores para comenzar la partida</p></div>`;
            return;
        }
        
        container.innerHTML = jugadores.map(j => {
            const saldo = monopolyData.calcularSaldo(j.id);
            const txCount = monopolyData.getTransacciones().filter(t => t.jugadorOrigen === j.id || t.jugadorDestino === j.id).length;
            return `
                <div class="player-full-card">
                    <div class="player-full-card__header">
                        <div class="player-full-card__avatar" style="background:${j.color}30;border:3px solid ${j.color}">${j.avatar}</div>
                        <div>
                            <div class="player-full-card__name">${j.nombre}</div>
                            <div class="player-full-card__balance" style="color:${saldo >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">$${saldo.toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="player-full-card__body">
                        <div class="player-stat"><span class="player-stat__label">Saldo Inicial</span><span class="player-stat__value">$${(j.saldoInicial || 1500).toLocaleString()}</span></div>
                        <div class="player-stat"><span class="player-stat__label">Transacciones</span><span class="player-stat__value">${txCount}</span></div>
                    </div>
                    <div class="player-full-card__actions">
                        <button class="btn btn--secondary btn--small" onclick="App.editPlayer('${j.id}')">✏️ Editar</button>
                        <button class="btn btn--danger btn--small" onclick="App.deletePlayer('${j.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ===== ESTADÍSTICAS =====
    renderStats() {
        Charts.renderAll();
    },

    // ===== MODALES =====
    openModal(id) {
        document.getElementById(id)?.classList.add('active');
    },
    
    closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    },
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    },

    // ===== PARTIDAS =====
    updateGameSelect() {
        const select = document.getElementById('gameSelect');
        const partidas = monopolyData.getPartidas();
        const activa = monopolyData.getPartidaActiva();
        
        select.innerHTML = `<option value="">-- Seleccionar Partida --</option>` + 
            partidas.map(p => `<option value="${p.id}" ${p.id === activa?.id ? 'selected' : ''}>${p.nombre}</option>`).join('');
    }
};
