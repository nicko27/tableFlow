/**
 * ReorderPlugin pour TableFlow
 * Permet de réorganiser les colonnes et les lignes d'un tableau par glisser-déposer
 * Version: 2.0.0
 */
export default class ReorderPlugin {
    constructor(config = {}) {
        this.name = 'reorder';
        this.version = '2.0.0';
        this.type = 'interaction';
        this.table = null;
        
        // Configuration par défaut
        this.config = {
            enabled: true,
            mode: 'both',                         // 'columns', 'rows', ou 'both'
            
            // Options générales
            debug: false,                         // Mode debug
            animationDuration: 300,               // Durée de l'animation (ms)
            dragThreshold: 5,                     // Seuil de déplacement minimal
            persistOrder: true,                   // Enregistrer l'ordre dans localStorage
            storageKeyPrefix: 'tableFlow_',       // Préfixe pour les clés localStorage
            
            // Options visuelles
            draggingClass: 'reorder-dragging',    // Classe lors du glissement
            dropIndicatorClass: 'reorder-drop-indicator', // Classe pour l'indicateur
            dragImageOpacity: 0.7,                // Opacité de l'image de glissement
            dragImage: null,                      // Image personnalisée
            
            // Configuration des colonnes
            columns: {
                enabled: true,                    // Activer la réorganisation des colonnes
                handleSelector: '.column-drag-handle', // Sélecteur pour la poignée
                handleHTML: '<div class="column-drag-handle" title="Glisser pour réorganiser"><i class="fas fa-grip-vertical"></i></div>',
                handlePosition: 'prepend',        // 'prepend', 'append', ou 'replace'
                reorderableClass: 'reorderable-column', // Classe pour colonnes réorganisables
                headerContainerClass: 'column-header-container', // Classe conteneur
                excludeSelector: '[th-noreorder]', // Sélecteur pour exclure des colonnes
                onColumnReorder: null,            // Callback après réorganisation
                storageKey: null,                 // Clé pour localStorage
            },
            
            // Configuration des lignes
            rows: {
                enabled: true,                    // Activer la réorganisation des lignes
                handleSelector: '.row-drag-handle', // Sélecteur pour la poignée
                handleHTML: '<div class="row-drag-handle" title="Glisser pour réorganiser"><i class="fas fa-grip-lines"></i></div>',
                handlePosition: 'prepend',        // 'prepend', 'append', ou 'replace'
                reorderableClass: 'reorderable-row', // Classe pour lignes réorganisables
                cellContainerClass: 'row-cell-container', // Classe conteneur
                excludeSelector: '[tr-noreorder]', // Sélecteur pour exclure des lignes
                handleColumn: 0,                  // Index de colonne pour la poignée
                onRowReorder: null,               // Callback après réorganisation
                storageKey: null,                 // Clé pour localStorage
            },
            
            // Callbacks généraux
            onDragStart: null,                    // Fonction au début du glissement
            onDragEnd: null,                      // Fonction à la fin du glissement
            onReorder: null,                      // Fonction après réorganisation
            
            ...config                             // Fusionner avec la config passée
        };
        
        // État interne
        this.state = {
            isInitialized: false,                 // Si le plugin est initialisé
            dragType: null,                       // 'column' ou 'row'
            
            // État des colonnes
            columnState: {
                isDragging: false,                // Si une colonne est en cours de glissement
                draggedColumn: null,              // Colonne en cours de glissement
                draggedIndex: -1,                 // Index de la colonne glissée
                currentDropIndex: -1,             // Index de la position de dépôt
                columnOrder: [],                  // Ordre actuel des colonnes
                columnElements: [],               // Références aux éléments de colonne
                headerElements: [],               // Références aux éléments d'en-tête
                originalOrder: [],                // Ordre original des colonnes
            },
            
            // État des lignes
            rowState: {
                isDragging: false,                // Si une ligne est en cours de glissement
                draggedRow: null,                 // Ligne en cours de glissement
                draggedIndex: -1,                 // Index de la ligne glissée
                currentDropIndex: -1,             // Index de la position de dépôt
                rowOrder: [],                     // Ordre actuel des lignes
                rowElements: [],                  // Références aux éléments de ligne
                originalOrder: [],                // Ordre original des lignes
            },
            
            // État commun
            dragStartX: 0,                        // Position X initiale du glissement
            dragStartY: 0,                        // Position Y initiale du glissement
            ghostElement: null,                   // Élément fantôme pour le glissement
            dropIndicator: null,                  // Indicateur de position de dépôt
            eventHandlers: {},                    // Gestionnaires d'événements
            mutationObserver: null,               // Observateur de mutations DOM
        };
        
        // Lier les méthodes pour préserver le contexte
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTableChange = this.handleTableChange.bind(this);
        
        // Fonctions de journalisation
        this.debug = this.config.debug ? 
            (...args) => console.log('[ReorderPlugin]', ...args) : 
            () => {};
    }
    
    /**
     * Initialise le plugin
     * @param {Object} tableHandler - Instance de TableFlow
     */
    init(tableHandler) {
        if (!tableHandler) {
            console.error('[ReorderPlugin] TableHandler requis pour l\'initialisation');
            return;
        }
        
        this.table = tableHandler;
        
        if (!this.table.table) {
            console.error('[ReorderPlugin] Élément table non trouvé');
            return;
        }
        
        this.debug('Initialisation du plugin');
        
        // Configurer les clés de stockage
        this.setupStorageKeys();
        
        // Analyser la structure de la table
        this.analyzeTableStructure();
        
        // Charger l'ordre sauvegardé si activé
        if (this.config.persistOrder) {
            this.loadSavedOrder();
        }
        
        // Initialiser les poignées de glisser-déposer
        this.setupDragHandles();
        
        // Ajouter les gestionnaires d'événements
        this.setupEventListeners();
        
        // Ajouter les styles CSS
        this.injectStyles();
        
        // Créer l'indicateur de dépôt
        this.createDropIndicator();
        
        // Marquer comme initialisé
        this.state.isInitialized = true;
        
        // Configurer l'observateur pour détecter les changements dans la table
        this.setupMutationObserver();
        
        this.debug('Plugin initialisé avec succès');
    }
    
    /**
     * Configure les clés de stockage pour la persistance
     */
    setupStorageKeys() {
        const tableId = this.table.options.tableId || this.table.table.id || 'table';
        
        if (this.config.persistOrder) {
            if (!this.config.columns.storageKey) {
                this.config.columns.storageKey = `${this.config.storageKeyPrefix}${tableId}_columnOrder`;
            }
            
            if (!this.config.rows.storageKey) {
                this.config.rows.storageKey = `${this.config.storageKeyPrefix}${tableId}_rowOrder`;
            }
        }
    }
    
    /**
     * Analyse la structure de la table pour préparer le réordonnancement
     */
    analyzeTableStructure() {
        // Analyser les colonnes si activé
        if (this.isColumnsEnabled()) {
            this.analyzeColumnStructure();
        }
        
        // Analyser les lignes si activé
        if (this.isRowsEnabled()) {
            this.analyzeRowStructure();
        }
    }
    
    /**
     * Analyse la structure des colonnes
     */
    analyzeColumnStructure() {
        const thead = this.table.table.querySelector('thead');
        if (!thead || !thead.rows || !thead.rows[0]) {
            this.debug('Aucun en-tête trouvé dans le tableau');
            return;
        }
        
        // Récupérer toutes les colonnes d'en-tête
        const headerRow = thead.rows[0];
        this.state.columnState.headerElements = Array.from(headerRow.cells).map((th, index) => ({
            element: th,
            index: index,
            id: th.id || `th_${index}`,
            width: th.offsetWidth,
            reorderable: !th.matches(this.config.columns.excludeSelector),
            columnIndex: index
        }));
        
        // Initialiser l'ordre des colonnes
        this.state.columnState.columnOrder = this.state.columnState.headerElements.map((_, index) => index);
        this.state.columnState.originalOrder = [...this.state.columnState.columnOrder];
        
        // Indexer toutes les cellules de chaque colonne
        this.state.columnState.columnElements = [];
        
        for (let colIndex = 0; colIndex < this.state.columnState.headerElements.length; colIndex++) {
            const columnCells = [this.state.columnState.headerElements[colIndex].element];
            
            // Ajouter les cellules du corps du tableau
            const tbody = this.table.table.querySelector('tbody');
            if (tbody) {
                Array.from(tbody.rows).forEach(row => {
                    if (colIndex < row.cells.length) {
                        columnCells.push(row.cells[colIndex]);
                    }
                });
            }
            
            // Ajouter les cellules du pied du tableau
            const tfoot = this.table.table.querySelector('tfoot');
            if (tfoot) {
                Array.from(tfoot.rows).forEach(row => {
                    if (colIndex < row.cells.length) {
                        columnCells.push(row.cells[colIndex]);
                    }
                });
            }
            
            this.state.columnState.columnElements.push({
                index: colIndex,
                cells: columnCells,
                width: this.state.columnState.headerElements[colIndex].width
            });
        }
        
        this.debug('Structure de colonnes analysée:', {
            colonnes: this.state.columnState.columnElements.length,
            ordre: this.state.columnState.columnOrder
        });
    }
    
    /**
     * Analyse la structure des lignes
     */
    analyzeRowStructure() {
        const tbody = this.table.table.querySelector('tbody');
        if (!tbody || !tbody.rows || !tbody.rows.length) {
            this.debug('Aucune ligne trouvée dans le tableau');
            return;
        }
        
        // Récupérer toutes les lignes
        this.state.rowState.rowElements = Array.from(tbody.rows).map((tr, index) => ({
            element: tr,
            index: index,
            id: tr.id || `tr_${index}`,
            height: tr.offsetHeight,
            reorderable: !tr.matches(this.config.rows.excludeSelector),
            rowIndex: index
        }));
        
        // Initialiser l'ordre des lignes
        this.state.rowState.rowOrder = this.state.rowState.rowElements.map((_, index) => index);
        this.state.rowState.originalOrder = [...this.state.rowState.rowOrder];
        
        this.debug('Structure de lignes analysée:', {
            lignes: this.state.rowState.rowElements.length,
            ordre: this.state.rowState.rowOrder
        });
    }
    
    /**
     * Vérifie si la réorganisation des colonnes est activée
     * @returns {boolean} - True si la réorganisation des colonnes est activée
     */
    isColumnsEnabled() {
        return this.config.enabled && 
               (this.config.mode === 'columns' || this.config.mode === 'both') && 
               this.config.columns.enabled;
    }
    
    /**
     * Vérifie si la réorganisation des lignes est activée
     * @returns {boolean} - True si la réorganisation des lignes est activée
     */
    isRowsEnabled() {
        return this.config.enabled && 
               (this.config.mode === 'rows' || this.config.mode === 'both') && 
               this.config.rows.enabled;
    }
    
    /**
     * Charge l'ordre sauvegardé depuis le localStorage
     */
    loadSavedOrder() {
        if (!this.config.persistOrder) return;
        
        // Charger l'ordre des colonnes
        if (this.isColumnsEnabled() && this.config.columns.storageKey) {
            this.loadColumnOrder();
        }
        
        // Charger l'ordre des lignes
        if (this.isRowsEnabled() && this.config.rows.storageKey) {
            this.loadRowOrder();
        }
    }
    
    /**
     * Charge l'ordre des colonnes depuis le localStorage
     */
    loadColumnOrder() {
        try {
            const savedData = localStorage.getItem(this.config.columns.storageKey);
            if (!savedData) return;
            
            const orderData = JSON.parse(savedData);
            
            // Vérifier que l'ordre sauvegardé correspond toujours à la structure actuelle
            const currentColumns = this.state.columnState.headerElements.map(h => h.id);
            
            // Vérifier si le nombre de colonnes correspond
            if (orderData.order.length !== this.state.columnState.columnOrder.length) {
                this.debug('La structure des colonnes a changé, impossible de restaurer l\'ordre');
                localStorage.removeItem(this.config.columns.storageKey);
                return;
            }
            
            // Vérifier si les ID des colonnes correspondent
            const columnsMatch = orderData.columns.every((id, i) => id === currentColumns[i]);
            if (!columnsMatch) {
                this.debug('Les identifiants des colonnes ont changé, impossible de restaurer l\'ordre');
                localStorage.removeItem(this.config.columns.storageKey);
                return;
            }
            
            // Appliquer l'ordre sauvegardé
            this.state.columnState.columnOrder = orderData.order;
            this.applyColumnOrder();
            
            this.debug('Ordre des colonnes restauré:', this.state.columnState.columnOrder);
        } catch (error) {
            console.error('[ReorderPlugin] Erreur lors du chargement de l\'ordre des colonnes', error);
        }
    }
    
    /**
     * Charge l'ordre des lignes depuis le localStorage
     */
    loadRowOrder() {
        try {
            const savedData = localStorage.getItem(this.config.rows.storageKey);
            if (!savedData) return;
            
            const orderData = JSON.parse(savedData);
            
            // Vérifier que l'ordre sauvegardé correspond toujours à la structure actuelle
            const currentRows = this.state.rowState.rowElements.map(r => r.id);
            
            // Vérifier si le nombre de lignes correspond
            if (orderData.order.length !== this.state.rowState.rowOrder.length) {
                this.debug('La structure des lignes a changé, impossible de restaurer l\'ordre');
                localStorage.removeItem(this.config.rows.storageKey);
                return;
            }
            
            // Vérifier si les ID des lignes correspondent
            const rowsMatch = orderData.rows.every((id, i) => id === currentRows[i]);
            if (!rowsMatch) {
                this.debug('Les identifiants des lignes ont changé, impossible de restaurer l\'ordre');
                localStorage.removeItem(this.config.rows.storageKey);
                return;
            }
            
            // Appliquer l'ordre sauvegardé
            this.state.rowState.rowOrder = orderData.order;
            this.applyRowOrder();
            
            this.debug('Ordre des lignes restauré:', this.state.rowState.rowOrder);
        } catch (error) {
            console.error('[ReorderPlugin] Erreur lors du chargement de l\'ordre des lignes', error);
        }
    }
    /**
     * Gère l'événement mousedown
     * @param {MouseEvent} event - L'événement mousedown
     */
    handleMouseDown(event) {
        if (!this.config.enabled) return;
        
        // Vérifier si l'événement provient d'une poignée de colonne
        if (this.isColumnsEnabled()) {
            const columnHandle = event.target.closest(this.config.columns.handleSelector);
            if (columnHandle) {
                // Trouver l'en-tête parent
                const headerCell = columnHandle.closest('th');
                if (!headerCell) return;
                
                // Vérifier si cette colonne est réorganisable
                const headerIndex = this.state.columnState.headerElements.findIndex(h => h.element === headerCell);
                if (headerIndex === -1 || !this.state.columnState.headerElements[headerIndex].reorderable) return;
                
                // Prévenir la sélection de texte et autres comportements par défaut
                event.preventDefault();
                
                // Initialiser le glissement de colonne
                this.startColumnDrag(headerCell, headerIndex, event.clientX, event.clientY);
                return;
            }
        }
        
        // Vérifier si l'événement provient d'une poignée de ligne
        if (this.isRowsEnabled()) {
            const rowHandle = event.target.closest(this.config.rows.handleSelector);
            if (rowHandle) {
                // Trouver la ligne parente
                const row = rowHandle.closest('tr');
                if (!row) return;
                
                // Vérifier si cette ligne est réorganisable
                const rowIndex = this.state.rowState.rowElements.findIndex(r => r.element === row);
                if (rowIndex === -1 || !this.state.rowState.rowElements[rowIndex].reorderable) return;
                
                // Prévenir la sélection de texte et autres comportements par défaut
                event.preventDefault();
                
                // Initialiser le glissement de ligne
                this.startRowDrag(row, rowIndex, event.clientX, event.clientY);
                return;
            }
        }
    }
    
    /**
     * Gère l'événement touchstart
     * @param {TouchEvent} event - L'événement touchstart
     */
    handleTouchStart(event) {
        if (!this.config.enabled) return;
        
        // Vérifier si l'événement provient d'une poignée
        const touch = event.touches[0];
        if (!touch) return;
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Vérifier pour les poignées de colonne
        if (this.isColumnsEnabled()) {
            const columnHandle = element?.closest(this.config.columns.handleSelector);
            if (columnHandle) {
                // Trouver l'en-tête parent
                const headerCell = columnHandle.closest('th');
                if (!headerCell) return;
                
                // Vérifier si cette colonne est réorganisable
                const headerIndex = this.state.columnState.headerElements.findIndex(h => h.element === headerCell);
                if (headerIndex === -1 || !this.state.columnState.headerElements[headerIndex].reorderable) return;
                
                // Prévenir le défilement
                event.preventDefault();
                
                // Initialiser le glissement
                this.startColumnDrag(headerCell, headerIndex, touch.clientX, touch.clientY);
                return;
            }
        }
        
        // Vérifier pour les poignées de ligne
        if (this.isRowsEnabled()) {
            const rowHandle = element?.closest(this.config.rows.handleSelector);
            if (rowHandle) {
                // Trouver la ligne parente
                const row = rowHandle.closest('tr');
                if (!row) return;
                
                // Vérifier si cette ligne est réorganisable
                const rowIndex = this.state.rowState.rowElements.findIndex(r => r.element === row);
                if (rowIndex === -1 || !this.state.rowState.rowElements[rowIndex].reorderable) return;
                
                // Prévenir le défilement
                event.preventDefault();
                
                // Initialiser le glissement
                this.startRowDrag(row, rowIndex, touch.clientX, touch.clientY);
                return;
            }
        }
    }
    
    /**
     * Initialise le glissement d'une colonne
     * @param {HTMLTableCellElement} headerCell - Cellule d'en-tête
     * @param {number} headerIndex - Index de l'en-tête
     * @param {number} clientX - Position X initiale
     * @param {number} clientY - Position Y initiale
     */
    startColumnDrag(headerCell, headerIndex, clientX, clientY) {
        this.debug('Début du glissement de colonne', {
            colonne: this.state.columnState.headerElements[headerIndex].id,
            index: headerIndex
        });
        
        // Marquer comme en cours de glissement
        this.state.dragType = 'column';
        this.state.columnState.isDragging = true;
        this.state.columnState.draggedColumn = headerCell;
        this.state.columnState.draggedIndex = headerIndex;
        this.state.dragStartX = clientX;
        this.state.dragStartY = clientY;
        
        // Ajouter la classe de glissement
        headerCell.classList.add(this.config.draggingClass);
        
        // Créer l'élément fantôme
        this.createGhostElement(headerCell, clientX, clientY);
        
        // Déclencher l'événement de début de glissement
        this.triggerDragStartEvent('column', headerIndex);
        
        // Callback
        if (typeof this.config.onDragStart === 'function') {
            this.config.onDragStart({
                type: 'column',
                columnId: this.state.columnState.headerElements[headerIndex].id,
                index: headerIndex,
                element: headerCell
            });
        }
    }
    
    /**
     * Initialise le glissement d'une ligne
     * @param {HTMLTableRowElement} row - Ligne
     * @param {number} rowIndex - Index de la ligne
     * @param {number} clientX - Position X initiale
     * @param {number} clientY - Position Y initiale
     */
    startRowDrag(row, rowIndex, clientX, clientY) {
        this.debug('Début du glissement de ligne', {
            ligne: this.state.rowState.rowElements[rowIndex].id,
            index: rowIndex
        });
        
        // Marquer comme en cours de glissement
        this.state.dragType = 'row';
        this.state.rowState.isDragging = true;
        this.state.rowState.draggedRow = row;
        this.state.rowState.draggedIndex = rowIndex;
        this.state.dragStartX = clientX;
        this.state.dragStartY = clientY;
        
        // Ajouter la classe de glissement
        row.classList.add(this.config.draggingClass);
        
        // Créer l'élément fantôme
        this.createGhostElement(row, clientX, clientY);
        
        // Déclencher l'événement de début de glissement
        this.triggerDragStartEvent('row', rowIndex);
        
        // Callback
        if (typeof this.config.onDragStart === 'function') {
            this.config.onDragStart({
                type: 'row',
                rowId: this.state.rowState.rowElements[rowIndex].id,
                index: rowIndex,
                element: row
            });
        }
    }
    
    /**
     * Crée l'élément fantôme pour le glissement
     * @param {HTMLElement} element - Élément à glisser
     * @param {number} clientX - Position X initiale
     * @param {number} clientY - Position Y initiale
     */
    createGhostElement(element, clientX, clientY) {
        // Créer un clone de l'élément
        const ghost = element.cloneNode(true);
        
        // Appliquer des styles pour le positionnement absolu
        Object.assign(ghost.style, {
            position: 'fixed',
            top: `${element.getBoundingClientRect().top}px`,
            left: `${element.getBoundingClientRect().left}px`,
            width: `${element.offsetWidth}px`,
            height: `${element.offsetHeight}px`,
            zIndex: '1000',
            opacity: this.config.dragImageOpacity,
            pointerEvents: 'none',
            transition: 'none',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            background: '#fff',
            cursor: 'grabbing'
        });
        
        // Utiliser une image personnalisée si définie
        if (this.config.dragImage) {
            const img = new Image();
            img.src = this.config.dragImage;
            img.style.pointerEvents = 'none';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            
            ghost.innerHTML = '';
            ghost.appendChild(img);
        }
        
        // Ajouter au corps du document
        document.body.appendChild(ghost);
        
        // Stocker la référence
        this.state.ghostElement = ghost;
        
        // Décalage initial pour le positionnement
        this.state.ghostOffsetX = clientX - element.getBoundingClientRect().left;
        this.state.ghostOffsetY = clientY - element.getBoundingClientRect().top;
    }
    
    /**
     * Gère l'événement mousemove
     * @param {MouseEvent} event - L'événement mousemove
     */
    handleMouseMove(event) {
        if (!this.state.dragType) return;
        
        // Déplacer l'élément fantôme
        this.moveGhostElement(event.clientX, event.clientY);
        
        // Mettre à jour la position de dépôt selon le type de glissement
        if (this.state.dragType === 'column') {
            this.updateColumnDropPosition(event.clientX);
        } else if (this.state.dragType === 'row') {
            this.updateRowDropPosition(event.clientY);
        }
    }
    
    /**
     * Gère l'événement touchmove
     * @param {TouchEvent} event - L'événement touchmove
     */
    handleTouchMove(event) {
        if (!this.state.dragType) return;
        
        const touch = event.touches[0];
        if (!touch) return;
        
        // Prévenir le défilement
        event.preventDefault();
        
        // Déplacer l'élément fantôme
        this.moveGhostElement(touch.clientX, touch.clientY);
        
        // Mettre à jour la position de dépôt selon le type de glissement
        if (this.state.dragType === 'column') {
            this.updateColumnDropPosition(touch.clientX);
        } else if (this.state.dragType === 'row') {
            this.updateRowDropPosition(touch.clientY);
        }
    }
    
    /**
     * Déplace l'élément fantôme
     * @param {number} clientX - Position X actuelle
     * @param {number} clientY - Position Y actuelle
     */
    moveGhostElement(clientX, clientY) {
        if (!this.state.ghostElement) return;
        
        // Calculer la nouvelle position
        const left = clientX - this.state.ghostOffsetX;
        const top = clientY - this.state.ghostOffsetY;
        
        // Appliquer la position
        this.state.ghostElement.style.left = `${left}px`;
        this.state.ghostElement.style.top = `${top}px`;
    }
    
    /**
     * Met à jour la position de l'indicateur de dépôt pour les colonnes
     * @param {number} clientX - Position X actuelle
     */
    updateColumnDropPosition(clientX) {
        // Trouver la position potentielle de dépôt
        let dropIndex = -1;
        let dropPosition = -1;
        
        // Parcourir tous les en-têtes pour trouver la position de dépôt
        for (let i = 0; i < this.state.columnState.headerElements.length; i++) {
            // Ignorer les colonnes non réorganisables
            if (!this.state.columnState.headerElements[i].reorderable) continue;
            
            const header = this.state.columnState.headerElements[i].element;
            const rect = header.getBoundingClientRect();
            
            // Vérifier si le curseur est sur cet en-tête
            if (clientX >= rect.left && clientX <= rect.right) {
                // Calculer la position dans l'en-tête (début ou fin)
                const midpoint = rect.left + rect.width / 2;
                
                if (clientX < midpoint) {
                    // Avant cette colonne
                    dropIndex = i;
                    dropPosition = rect.left;
                } else {
                    // Après cette colonne
                    dropIndex = i + 1;
                    dropPosition = rect.right;
                }
                
                break;
            } else if (i === 0 && clientX < rect.left) {
                // Avant la première colonne
                dropIndex = 0;
                dropPosition = rect.left;
                break;
            } else if (i === this.state.columnState.headerElements.length - 1 && clientX > rect.right) {
                // Après la dernière colonne
                dropIndex = this.state.columnState.headerElements.length;
                dropPosition = rect.right;
                break;
            }
        }
        
        // Ajuster l'index si nécessaire pour éviter de déposer sur la même position
        if (dropIndex === this.state.columnState.draggedIndex || dropIndex === this.state.columnState.draggedIndex + 1) {
            this.hideDropIndicator();
            return;
        }
        
        // Mettre à jour l'indicateur de dépôt
        this.showDropIndicator(dropPosition, 'column');
        
        // Stocker l'index de dépôt actuel
        this.state.columnState.currentDropIndex = dropIndex;
    }
    
    /**
     * Met à jour la position de l'indicateur de dépôt pour les lignes
     * @param {number} clientY - Position Y actuelle
     */
    updateRowDropPosition(clientY) {
        // Trouver la position potentielle de dépôt
        let dropIndex = -1;
        let dropPosition = -1;
        
        // Parcourir toutes les lignes pour trouver la position de dépôt
        for (let i = 0; i < this.state.rowState.rowElements.length; i++) {
            // Ignorer les lignes non réorganisables
            if (!this.state.rowState.rowElements[i].reorderable) continue;
            
            const row = this.state.rowState.rowElements[i].element;
            const rect = row.getBoundingClientRect();
            
            // Vérifier si le curseur est sur cette ligne
            if (clientY >= rect.top && clientY <= rect.bottom) {
                // Calculer la position dans la ligne (début ou fin)
                const midpoint = rect.top + rect.height / 2;
                
                if (clientY < midpoint) {
                    // Avant cette ligne
                    dropIndex = i;
                    dropPosition = rect.top;
                } else {
                    // Après cette ligne
                    dropIndex = i + 1;
                    dropPosition = rect.bottom;
                }
                
                break;
            } else if (i === 0 && clientY < rect.top) {
                // Avant la première ligne
                dropIndex = 0;
                dropPosition = rect.top;
                break;
            } else if (i === this.state.rowState.rowElements.length - 1 && clientY > rect.bottom) {
                // Après la dernière ligne
                dropIndex = this.state.rowState.rowElements.length;
                dropPosition = rect.bottom;
                break;
            }
        }
        
        // Ajuster l'index si nécessaire pour éviter de déposer sur la même position
        if (dropIndex === this.state.rowState.draggedIndex || dropIndex === this.state.rowState.draggedIndex + 1) {
            this.hideDropIndicator();
            return;
        }
        
        // Mettre à jour l'indicateur de dépôt
        this.showDropIndicator(dropPosition, 'row');
        
        // Stocker l'index de dépôt actuel
        this.state.rowState.currentDropIndex = dropIndex;
    }
    
    /**
     * Affiche l'indicateur de dépôt
     * @param {number} position - Position où afficher l'indicateur
     * @param {string} type - Type d'indicateur ('column' ou 'row')
     */
    showDropIndicator(position, type) {
        if (!this.state.dropIndicator) return;
        
        // Récupérer les dimensions de la table
        const tableRect = this.table.table.getBoundingClientRect();
        
        // Positionner l'indicateur selon le type
        if (type === 'column') {
            this.state.dropIndicator.style.left = `${position}px`;
            this.state.dropIndicator.style.top = `${tableRect.top}px`;
            this.state.dropIndicator.style.width = '4px';
            this.state.dropIndicator.style.height = `${tableRect.height}px`;
            this.state.dropIndicator.classList.add('column-drop-indicator');
            this.state.dropIndicator.classList.remove('row-drop-indicator');
        } else {
            this.state.dropIndicator.style.left = `${tableRect.left}px`;
            this.state.dropIndicator.style.top = `${position}px`;
            this.state.dropIndicator.style.width = `${tableRect.width}px`;
            this.state.dropIndicator.style.height = '4px';
            this.state.dropIndicator.classList.add('row-drop-indicator');
            this.state.dropIndicator.classList.remove('column-drop-indicator');
        }
        
        this.state.dropIndicator.style.display = 'block';
    }
    
    /**
     * Masque l'indicateur de dépôt
     */
    hideDropIndicator() {
        if (this.state.dropIndicator) {
            this.state.dropIndicator.style.display = 'none';
        }
    }
    /**
     * Gère l'événement mouseup
     * @param {MouseEvent} event - L'événement mouseup
     */
    handleMouseUp() {
        if (!this.state.dragType) return;
        
        // Confirmer le dépôt
        this.finishDrag();
    }
    
    /**
     * Gère l'événement touchend
     */
    handleTouchEnd() {
        if (!this.state.dragType) return;
        
        // Confirmer le dépôt
        this.finishDrag();
    }
    
    /**
     * Termine le glissement et confirme le réordonnancement
     */
    finishDrag() {
        if (this.state.dragType === 'column') {
            this.debug('Fin du glissement de colonne', {
                sourceIndex: this.state.columnState.draggedIndex,
                targetIndex: this.state.columnState.currentDropIndex
            });
            
            // Vérifier si le dépôt est valide
            if (
                this.state.columnState.currentDropIndex !== -1 && 
                this.state.columnState.currentDropIndex !== this.state.columnState.draggedIndex && 
                this.state.columnState.currentDropIndex !== this.state.columnState.draggedIndex + 1
            ) {
                // Réorganiser les colonnes
                this.reorderColumns(this.state.columnState.draggedIndex, this.state.columnState.currentDropIndex);
            }
        } else if (this.state.dragType === 'row') {
            this.debug('Fin du glissement de ligne', {
                sourceIndex: this.state.rowState.draggedIndex,
                targetIndex: this.state.rowState.currentDropIndex
            });
            
            // Vérifier si le dépôt est valide
            if (
                this.state.rowState.currentDropIndex !== -1 && 
                this.state.rowState.currentDropIndex !== this.state.rowState.draggedIndex && 
                this.state.rowState.currentDropIndex !== this.state.rowState.draggedIndex + 1
            ) {
                // Réorganiser les lignes
                this.reorderRows(this.state.rowState.draggedIndex, this.state.rowState.currentDropIndex);
            }
        }
        
        // Nettoyer l'interface
        this.cleanupDragState();
        
        // Callback
        if (typeof this.config.onDragEnd === 'function') {
            this.config.onDragEnd({
                type: this.state.dragType,
                sourceIndex: this.state.dragType === 'column' ? 
                    this.state.columnState.draggedIndex : 
                    this.state.rowState.draggedIndex,
                targetIndex: this.state.dragType === 'column' ? 
                    this.state.columnState.currentDropIndex : 
                    this.state.rowState.currentDropIndex,
                newOrder: this.state.dragType === 'column' ? 
                    this.state.columnState.columnOrder : 
                    this.state.rowState.rowOrder
            });
        }
    }
    
    /**
     * Réorganise les colonnes
     * @param {number} fromIndex - Index source
     * @param {number} toIndex - Index cible
     */
    reorderColumns(fromIndex, toIndex) {
        // Ajuster l'index cible si on déplace vers la droite
        if (fromIndex < toIndex) {
            toIndex--;
        }
        
        this.debug('Réorganisation des colonnes', {
            de: fromIndex,
            à: toIndex,
            ordre_avant: [...this.state.columnState.columnOrder]
        });
        
        // Mettre à jour l'ordre des colonnes
        const newOrder = [...this.state.columnState.columnOrder];
        const [removed] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, removed);
        
        this.state.columnState.columnOrder = newOrder;
        
        this.debug('Nouvel ordre des colonnes', this.state.columnState.columnOrder);
        
        // Appliquer le nouvel ordre
        this.applyColumnOrder();
        
        // Enregistrer l'ordre si activé
        if (this.config.persistOrder) {
            this.saveColumnOrder();
        }
        
        // Déclencher l'événement de réorganisation
        if (typeof this.config.columns.onColumnReorder === 'function') {
            this.config.columns.onColumnReorder({
                from: fromIndex,
                to: toIndex,
                columnId: this.state.columnState.headerElements[fromIndex].id,
                newOrder: this.state.columnState.columnOrder
            });
        }
        
        // Callback général
        if (typeof this.config.onReorder === 'function') {
            this.config.onReorder({
                type: 'column',
                from: fromIndex,
                to: toIndex,
                elementId: this.state.columnState.headerElements[fromIndex].id,
                newOrder: this.state.columnState.columnOrder
            });
        }
        
        // Déclencher un événement personnalisé
        const event = new CustomEvent('column:reordered', {
            detail: {
                from: fromIndex,
                to: toIndex,
                columnId: this.state.columnState.headerElements[fromIndex].id,
                newOrder: this.state.columnState.columnOrder
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }
    
    /**
     * Réorganise les lignes
     * @param {number} fromIndex - Index source
     * @param {number} toIndex - Index cible
     */
    reorderRows(fromIndex, toIndex) {
        // Ajuster l'index cible si on déplace vers le bas
        if (fromIndex < toIndex) {
            toIndex--;
        }
        
        this.debug('Réorganisation des lignes', {
            de: fromIndex,
            à: toIndex,
            ordre_avant: [...this.state.rowState.rowOrder]
        });
        
        // Mettre à jour l'ordre des lignes
        const newOrder = [...this.state.rowState.rowOrder];
        const [removed] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, removed);
        
        this.state.rowState.rowOrder = newOrder;
        
        this.debug('Nouvel ordre des lignes', this.state.rowState.rowOrder);
        
        // Appliquer le nouvel ordre
        this.applyRowOrder();
        
        // Enregistrer l'ordre si activé
        if (this.config.persistOrder) {
            this.saveRowOrder();
        }
        
        // Déclencher l'événement de réorganisation
        if (typeof this.config.rows.onRowReorder === 'function') {
            this.config.rows.onRowReorder({
                from: fromIndex,
                to: toIndex,
                rowId: this.state.rowState.rowElements[fromIndex].id,
                newOrder: this.state.rowState.rowOrder
            });
        }
        
        // Callback général
        if (typeof this.config.onReorder === 'function') {
            this.config.onReorder({
                type: 'row',
                from: fromIndex,
                to: toIndex,
                elementId: this.state.rowState.rowElements[fromIndex].id,
                newOrder: this.state.rowState.rowOrder
            });
        }
        
        // Déclencher un événement personnalisé
        const event = new CustomEvent('row:reordered', {
            detail: {
                from: fromIndex,
                to: toIndex,
                rowId: this.state.rowState.rowElements[fromIndex].id,
                newOrder: this.state.rowState.rowOrder
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }
    
    /**
     * Applique l'ordre des colonnes au tableau
     */
    applyColumnOrder() {
        // Manipuler le DOM pour réorganiser les colonnes
        const thead = this.table.table.querySelector('thead');
        const tbody = this.table.table.querySelector('tbody');
        const tfoot = this.table.table.querySelector('tfoot');
        
        // Appliquer le nouvel ordre aux en-têtes
        if (thead && thead.rows.length > 0) {
            const headerRow = thead.rows[0];
            
            // Créer un tableau temporaire pour stocker les cellules d'en-tête
            const tempHeaders = this.state.columnState.columnOrder.map(originalIndex => {
                return headerRow.cells[originalIndex];
            });
            
            // Vider la ligne d'en-tête
            while (headerRow.cells.length > 0) {
                headerRow.removeChild(headerRow.cells[0]);
            }
            
            // Ajouter les en-têtes dans le nouvel ordre
            tempHeaders.forEach(header => {
                headerRow.appendChild(header);
            });
        }
        
        // Appliquer le nouvel ordre au corps du tableau
        if (tbody) {
            Array.from(tbody.rows).forEach(row => {
                // Créer un tableau temporaire pour stocker les cellules
                const tempCells = this.state.columnState.columnOrder.map(originalIndex => {
                    return originalIndex < row.cells.length ? row.cells[originalIndex] : null;
                }).filter(Boolean);
                
                // Vider la ligne
                while (row.cells.length > 0) {
                    row.removeChild(row.cells[0]);
                }
                
                // Ajouter les cellules dans le nouvel ordre
                tempCells.forEach(cell => {
                    row.appendChild(cell);
                });
            });
        }
        
        // Appliquer le nouvel ordre au pied du tableau
        if (tfoot) {
            Array.from(tfoot.rows).forEach(row => {
                // Créer un tableau temporaire pour stocker les cellules
                const tempCells = this.state.columnState.columnOrder.map(originalIndex => {
                    return originalIndex < row.cells.length ? row.cells[originalIndex] : null;
                }).filter(Boolean);
                
                // Vider la ligne
                while (row.cells.length > 0) {
                    row.removeChild(row.cells[0]);
                }
                
                // Ajouter les cellules dans le nouvel ordre
                tempCells.forEach(cell => {
                    row.appendChild(cell);
                });
            });
        }
        
        // Mettre à jour les références internes
        this.analyzeColumnStructure();
    }
    
    /**
     * Applique l'ordre des lignes au tableau
     */
    applyRowOrder() {
        const tbody = this.table.table.querySelector('tbody');
        if (!tbody) return;
        
        // Créer un tableau temporaire pour stocker les lignes
        const tempRows = this.state.rowState.rowOrder.map(originalIndex => {
            return tbody.rows[originalIndex];
        });
        
        // Vider le corps du tableau
        while (tbody.rows.length > 0) {
            tbody.removeChild(tbody.rows[0]);
        }
        
        // Ajouter les lignes dans le nouvel ordre
        tempRows.forEach(row => {
            tbody.appendChild(row);
        });
        
        // Mettre à jour les références internes
        this.analyzeRowStructure();
    }
    
    /**
     * Nettoie l'état du glissement
     */
    cleanupDragState() {
        // Supprimer la classe de glissement
        if (this.state.dragType === 'column' && this.state.columnState.draggedColumn) {
            this.state.columnState.draggedColumn.classList.remove(this.config.draggingClass);
        } else if (this.state.dragType === 'row' && this.state.rowState.draggedRow) {
            this.state.rowState.draggedRow.classList.remove(this.config.draggingClass);
        }
        
        // Supprimer l'élément fantôme
        if (this.state.ghostElement) {
            document.body.removeChild(this.state.ghostElement);
            this.state.ghostElement = null;
        }
        
        // Masquer l'indicateur de dépôt
        this.hideDropIndicator();
        
        // Réinitialiser l'état
        if (this.state.dragType === 'column') {
            this.state.columnState.isDragging = false;
            this.state.columnState.draggedColumn = null;
            this.state.columnState.draggedIndex = -1;
            this.state.columnState.currentDropIndex = -1;
        } else if (this.state.dragType === 'row') {
            this.state.rowState.isDragging = false;
            this.state.rowState.draggedRow = null;
            this.state.rowState.draggedIndex = -1;
            this.state.rowState.currentDropIndex = -1;
        }
        
        this.state.dragType = null;
        this.state.dragStartX = 0;
        this.state.dragStartY = 0;
    }
    
    /**
     * Gère les événements de changement de table
     */
    handleTableChange() {
        // Différer le rafraîchissement pour éviter des problèmes pendant les mutations
        setTimeout(() => {
            this.refresh();
        }, 0);
    }
    
    /**
     * Enregistre l'ordre des colonnes dans le localStorage
     */
    saveColumnOrder() {
        if (!this.config.persistOrder || !this.config.columns.storageKey) return;
        
        try {
            // Créer un objet avec l'ordre et les identifiants des colonnes pour validation
            const orderData = {
                order: this.state.columnState.columnOrder,
                columns: this.state.columnState.headerElements.map(h => h.id),
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.config.columns.storageKey, JSON.stringify(orderData));
            this.debug('Ordre des colonnes enregistré', orderData);
        } catch (error) {
            console.error('[ReorderPlugin] Erreur lors de l\'enregistrement de l\'ordre des colonnes', error);
        }
    }
    
    /**
     * Enregistre l'ordre des lignes dans le localStorage
     */
    saveRowOrder() {
        if (!this.config.persistOrder || !this.config.rows.storageKey) return;
        
        try {
            // Créer un objet avec l'ordre et les identifiants des lignes pour validation
            const orderData = {
                order: this.state.rowState.rowOrder,
                rows: this.state.rowState.rowElements.map(r => r.id),
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.config.rows.storageKey, JSON.stringify(orderData));
            this.debug('Ordre des lignes enregistré', orderData);
        } catch (error) {
            console.error('[ReorderPlugin] Erreur lors de l\'enregistrement de l\'ordre des lignes', error);
        }
    }
    
    /**
     * Déclenche un événement de début de glissement
     * @param {string} type - Type d'élément ('column' ou 'row')
     * @param {number} index - Index de l'élément
     */
    triggerDragStartEvent(type, index) {
        const eventName = type === 'column' ? 'column:reorder:start' : 'row:reorder:start';
        const detail = type === 'column' ? 
            {
                columnId: this.state.columnState.headerElements[index].id,
                index: index
            } : 
            {
                rowId: this.state.rowState.rowElements[index].id,
                index: index
            };
        
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true
        });
        
        this.table.table.dispatchEvent(event);
    }
    /**
     * Réinitialise l'ordre des colonnes à l'ordre original
     */
    resetColumnOrder() {
        this.debug('Réinitialisation de l\'ordre des colonnes');
        
        // Restaurer l'ordre original
        this.state.columnState.columnOrder = [...this.state.columnState.originalOrder];
        
        // Appliquer l'ordre
        this.applyColumnOrder();
        
        // Supprimer l'ordre sauvegardé
        if (this.config.persistOrder && this.config.columns.storageKey) {
            localStorage.removeItem(this.config.columns.storageKey);
        }
        
        // Déclencher un événement personnalisé
        const event = new CustomEvent('column:orderreset', {
            detail: {
                order: this.state.columnState.columnOrder
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }
    
    /**
     * Réinitialise l'ordre des lignes à l'ordre original
     */
    resetRowOrder() {
        this.debug('Réinitialisation de l\'ordre des lignes');
        
        // Restaurer l'ordre original
        this.state.rowState.rowOrder = [...this.state.rowState.originalOrder];
        
        // Appliquer l'ordre
        this.applyRowOrder();
        
        // Supprimer l'ordre sauvegardé
        if (this.config.persistOrder && this.config.rows.storageKey) {
            localStorage.removeItem(this.config.rows.storageKey);
        }
        
        // Déclencher un événement personnalisé
        const event = new CustomEvent('row:orderreset', {
            detail: {
                order: this.state.rowState.rowOrder
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }
    
    /**
     * Vérifie si une colonne est réorganisable
     * @param {number} columnIndex - Index de la colonne
     * @returns {boolean} - True si la colonne est réorganisable
     */
    isColumnReorderable(columnIndex) {
        if (columnIndex < 0 || columnIndex >= this.state.columnState.headerElements.length) {
            return false;
        }
        
        return this.state.columnState.headerElements[columnIndex].reorderable;
    }
    
    /**
     * Vérifie si une ligne est réorganisable
     * @param {number} rowIndex - Index de la ligne
     * @returns {boolean} - True si la ligne est réorganisable
     */
    isRowReorderable(rowIndex) {
        if (rowIndex < 0 || rowIndex >= this.state.rowState.rowElements.length) {
            return false;
        }
        
        return this.state.rowState.rowElements[rowIndex].reorderable;
    }
    
    /**
     * Obtient l'ordre actuel des colonnes
     * @returns {Array<number>} - Tableau des indices de colonne dans l'ordre actuel
     */
    getColumnOrder() {
        return [...this.state.columnState.columnOrder];
    }
    
    /**
     * Obtient l'ordre actuel des lignes
     * @returns {Array<number>} - Tableau des indices de ligne dans l'ordre actuel
     */
    getRowOrder() {
        return [...this.state.rowState.rowOrder];
    }
    
    /**
     * Définit l'ordre des colonnes programmatiquement
     * @param {Array<number>} newOrder - Nouvel ordre des colonnes (indices)
     * @param {boolean} [persist=true] - Si on doit persister l'ordre
     */
    setColumnOrder(newOrder, persist = true) {
        // Valider le nouvel ordre
        if (!Array.isArray(newOrder) || newOrder.length !== this.state.columnState.columnOrder.length) {
            console.error('[ReorderPlugin] Ordre de colonnes invalide', newOrder);
            return;
        }
        
        // Vérifier que tous les indices sont présents
        const sortedOrder = [...newOrder].sort((a, b) => a - b);
        const expectedOrder = Array.from({ length: this.state.columnState.columnOrder.length }, (_, i) => i);
        const isValid = sortedOrder.every((val, idx) => val === expectedOrder[idx]);
        
        if (!isValid) {
            console.error('[ReorderPlugin] Ordre de colonnes invalide', newOrder);
            return;
        }
        
        this.debug('Définition programmatique de l\'ordre des colonnes', newOrder);
        
        // Appliquer le nouvel ordre
        this.state.columnState.columnOrder = newOrder;
        this.applyColumnOrder();
        
        // Persister si demandé
        if (persist && this.config.persistOrder) {
            this.saveColumnOrder();
        }
    }
    
    /**
     * Définit l'ordre des lignes programmatiquement
     * @param {Array<number>} newOrder - Nouvel ordre des lignes (indices)
     * @param {boolean} [persist=true] - Si on doit persister l'ordre
     */
    setRowOrder(newOrder, persist = true) {
        // Valider le nouvel ordre
        if (!Array.isArray(newOrder) || newOrder.length !== this.state.rowState.rowOrder.length) {
            console.error('[ReorderPlugin] Ordre de lignes invalide', newOrder);
            return;
        }
        
        // Vérifier que tous les indices sont présents
        const sortedOrder = [...newOrder].sort((a, b) => a - b);
        const expectedOrder = Array.from({ length: this.state.rowState.rowOrder.length }, (_, i) => i);
        const isValid = sortedOrder.every((val, idx) => val === expectedOrder[idx]);
        
        if (!isValid) {
            console.error('[ReorderPlugin] Ordre de lignes invalide', newOrder);
            return;
        }
        
        this.debug('Définition programmatique de l\'ordre des lignes', newOrder);
        
        // Appliquer le nouvel ordre
        this.state.rowState.rowOrder = newOrder;
        this.applyRowOrder();
        
        // Persister si demandé
        if (persist && this.config.persistOrder) {
            this.saveRowOrder();
        }
    }
    
    /**
     * Active ou désactive le plugin
     * @param {boolean} enabled - Si le plugin doit être activé
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (enabled && !this.state.isInitialized) {
            // Réinitialiser le plugin s'il était désactivé
            this.init(this.table);
        } else if (!enabled && this.state.isInitialized) {
            // Nettoyer si on désactive
            this.cleanupDragState();
            
            // Supprimer les poignées
            if (this.isColumnsEnabled()) {
                const columnHandles = this.table.table.querySelectorAll(this.config.columns.handleSelector);
                columnHandles.forEach(handle => handle.remove());
                
                // Supprimer les classes réorganisables
                const columnHeaders = this.table.table.querySelectorAll(`.${this.config.columns.reorderableClass}`);
                columnHeaders.forEach(header => header.classList.remove(this.config.columns.reorderableClass));
            }
            
            if (this.isRowsEnabled()) {
                const rowHandles = this.table.table.querySelectorAll(this.config.rows.handleSelector);
                rowHandles.forEach(handle => handle.remove());
                
                // Supprimer les classes réorganisables
                const rows = this.table.table.querySelectorAll(`.${this.config.rows.reorderableClass}`);
                rows.forEach(row => row.classList.remove(this.config.rows.reorderableClass));
            }
            
            this.state.isInitialized = false;
        }
    }
    
    /**
     * Rafraîchit le plugin après des modifications de la table
     */
    refresh() {
        if (!this.state.isInitialized) return;
        
        this.debug('Rafraîchissement du plugin');
        
        // Réinitialiser les états internes
        this.cleanupDragState();
        
        // Ré-analyser la structure de la table
        this.analyzeTableStructure();
        
        // Réinitialiser les poignées de glisser-déposer
        this.setupDragHandles();
    }
    
    /**
     * Nettoyage avant la destruction du plugin
     */
    destroy() {
        this.debug('Destruction du plugin');
        
        // Nettoyage des états de glissement
        this.cleanupDragState();
        
        // Supprimer l'indicateur de dépôt
        if (this.state.dropIndicator && this.state.dropIndicator.parentNode) {
            this.state.dropIndicator.parentNode.removeChild(this.state.dropIndicator);
        }
        
        // Supprimer les gestionnaires d'événements
        this.table.table.removeEventListener('mousedown', this.state.eventHandlers.mousedown);
        document.removeEventListener('mousemove', this.state.eventHandlers.mousemove);
        document.removeEventListener('mouseup', this.state.eventHandlers.mouseup);
        
        this.table.table.removeEventListener('touchstart', this.state.eventHandlers.touchstart);
        document.removeEventListener('touchmove', this.state.eventHandlers.touchmove);
        document.removeEventListener('touchend', this.state.eventHandlers.touchend);
        
        this.table.table.removeEventListener('row:added', this.state.eventHandlers.tablechange);
        this.table.table.removeEventListener('row:removed', this.state.eventHandlers.tablechange);
        
        // Arrêter les observateurs
        if (this.state.mutationObserver) {
            this.state.mutationObserver.disconnect();
        }
        
        // Supprimer les poignées et les classes
        if (this.isColumnsEnabled()) {
            const columnHandles = this.table.table.querySelectorAll(this.config.columns.handleSelector);
            columnHandles.forEach(handle => handle.remove());
            
            const columnHeaders = this.table.table.querySelectorAll(`.${this.config.columns.reorderableClass}`);
            columnHeaders.forEach(header => header.classList.remove(this.config.columns.reorderableClass));
        }
        
        if (this.isRowsEnabled()) {
            const rowHandles = this.table.table.querySelectorAll(this.config.rows.handleSelector);
            rowHandles.forEach(handle => handle.remove());
            
            const rows = this.table.table.querySelectorAll(`.${this.config.rows.reorderableClass}`);
            rows.forEach(row => row.classList.remove(this.config.rows.reorderableClass));
        }
        
        // Supprimer les styles
        const style = document.getElementById('reorder-plugin-styles');
        if (style) {
            style.parentNode.removeChild(style);
        }
    }
}