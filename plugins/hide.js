/**
 * HidePlugin pour TableFlow
 * Permet de masquer/afficher des colonnes et des lignes d'un tableau
 * Version: 2.0.0
 */
export default class HidePlugin {
    constructor(config = {}) {
        this.name = 'hide';
        this.version = '2.0.0';
        this.type = 'display';
        this.table = null;
        
        // Configuration par défaut
        this.config = {
            // Options générales
            debug: false,                     // Mode debug
            mode: 'both',                     // 'columns', 'rows', ou 'both'
            
            // Configuration des colonnes
            columns: {
                hideAttribute: 'th-hide',     // Attribut pour masquer les colonnes
                toggleAttribute: 'th-toggle',  // Attribut pour ajouter un bouton toggle
                toggleSelector: '.column-toggle', // Sélecteur pour le bouton toggle
                toggleHTML: '<div class="column-toggle" title="Masquer/Afficher"><i class="fas fa-eye-slash"></i></div>',
                togglePosition: 'append',      // 'prepend', 'append'
                hiddenClass: 'hidden-column',  // Classe pour les colonnes masquées
                storageKey: null,              // Clé pour localStorage
                onColumnToggle: null,          // Callback après masquage/affichage
            },
            
            // Configuration des lignes
            rows: {
                hideAttribute: 'tr-hide',      // Attribut pour masquer les lignes
                toggleAttribute: 'tr-toggle',  // Attribut pour ajouter un bouton toggle
                toggleSelector: '.row-toggle', // Sélecteur pour le bouton toggle
                toggleHTML: '<div class="row-toggle" title="Masquer/Afficher"><i class="fas fa-eye-slash"></i></div>',
                togglePosition: 'prepend',     // 'prepend', 'append'
                hiddenClass: 'hidden-row',     // Classe pour les lignes masquées
                toggleColumn: 0,               // Index de la colonne pour le bouton toggle
                storageKey: null,              // Clé pour localStorage
                onRowToggle: null,             // Callback après masquage/affichage
            },
            
            // Persistance
            persistState: true,                // Enregistrer l'état dans localStorage
            storageKeyPrefix: 'tableFlow_',    // Préfixe pour les clés localStorage
            
            // Callbacks généraux
            onToggle: null,                    // Fonction après masquage/affichage
            
            ...config                          // Fusionner avec la config passée
        };
        
        // État interne
        this.state = {
            isInitialized: false,              // Si le plugin est initialisé
            hiddenColumns: new Set(),          // Colonnes masquées
            hiddenRows: new Set(),             // Lignes masquées
            columnElements: [],                // Références aux éléments de colonne
            rowElements: [],                   // Références aux éléments de ligne
        };
        
        // Fonctions de journalisation
        this.debug = this.config.debug ? 
            (...args) => console.log('[HidePlugin]', ...args) : 
            () => {};
    }
    
    /**
     * Initialise le plugin
     * @param {Object} tableHandler - Instance de TableFlow
     */
    init(tableHandler) {
        if (!tableHandler) {
            console.error('[HidePlugin] TableHandler requis pour l\'initialisation');
            return;
        }
        
        this.table = tableHandler;
        
        if (!this.table.table) {
            console.error('[HidePlugin] Élément table non trouvé');
            return;
        }
        
        this.debug('Initialisation du plugin');
        
        // Configurer les clés de stockage
        this.setupStorageKeys();
        
        // Analyser la structure de la table
        this.analyzeTableStructure();
        
        // Charger l'état sauvegardé si activé
        if (this.config.persistState) {
            this.loadSavedState();
        }
        
        // Initialiser les boutons de toggle
        this.setupToggleButtons();
        
        // Appliquer l'état initial
        this.applyInitialState();
        
        // Ajouter les styles CSS
        this.injectStyles();
        
        // Marquer comme initialisé
        this.state.isInitialized = true;
        
        this.debug('Plugin initialisé avec succès');
    }
    
    /**
     * Configure les clés de stockage pour la persistance
     */
    setupStorageKeys() {
        const tableId = this.table.options.tableId || this.table.table.id || 'table';
        
        if (this.config.persistState) {
            if (!this.config.columns.storageKey) {
                this.config.columns.storageKey = `${this.config.storageKeyPrefix}${tableId}_hiddenColumns`;
            }
            
            if (!this.config.rows.storageKey) {
                this.config.rows.storageKey = `${this.config.storageKeyPrefix}${tableId}_hiddenRows`;
            }
        }
    }
    
    /**
     * Analyse la structure de la table
     */
    analyzeTableStructure() {
        // Analyser les colonnes
        if (this.isColumnsEnabled()) {
            this.analyzeColumnStructure();
        }
        
        // Analyser les lignes
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
        this.state.columnElements = Array.from(headerRow.cells).map((th, index) => ({
            element: th,
            index: index,
            id: th.id || `th_${index}`,
            initiallyHidden: th.hasAttribute(this.config.columns.hideAttribute),
            toggleable: th.hasAttribute(this.config.columns.toggleAttribute)
        }));
        
        this.debug('Structure de colonnes analysée:', {
            colonnes: this.state.columnElements.length,
            masquées: this.state.columnElements.filter(c => c.initiallyHidden).length,
            toggleables: this.state.columnElements.filter(c => c.toggleable).length
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
        this.state.rowElements = Array.from(tbody.rows).map((tr, index) => ({
            element: tr,
            index: index,
            id: tr.id || `tr_${index}`,
            initiallyHidden: tr.hasAttribute(this.config.rows.hideAttribute),
            toggleable: tr.hasAttribute(this.config.rows.toggleAttribute)
        }));
        
        this.debug('Structure de lignes analysée:', {
            lignes: this.state.rowElements.length,
            masquées: this.state.rowElements.filter(r => r.initiallyHidden).length,
            toggleables: this.state.rowElements.filter(r => r.toggleable).length
        });
    }
    
    /**
     * Vérifie si la gestion des colonnes est activée
     * @returns {boolean} - True si la gestion des colonnes est activée
     */
    isColumnsEnabled() {
        return this.config.mode === 'columns' || this.config.mode === 'both';
    }
    
    /**
     * Vérifie si la gestion des lignes est activée
     * @returns {boolean} - True si la gestion des lignes est activée
     */
    isRowsEnabled() {
        return this.config.mode === 'rows' || this.config.mode === 'both';
    }
    
    /**
     * Charge l'état sauvegardé depuis le localStorage
     */
    loadSavedState() {
        if (!this.config.persistState) return;
        
        // Charger l'état des colonnes
        if (this.isColumnsEnabled() && this.config.columns.storageKey) {
            this.loadColumnState();
        }
        
        // Charger l'état des lignes
        if (this.isRowsEnabled() && this.config.rows.storageKey) {
            this.loadRowState();
        }
    }
    
    /**
     * Charge l'état des colonnes depuis le localStorage
     */
    loadColumnState() {
        try {
            const savedData = localStorage.getItem(this.config.columns.storageKey);
            if (!savedData) return;
            
            const hiddenColumns = JSON.parse(savedData);
            if (Array.isArray(hiddenColumns)) {
                this.state.hiddenColumns = new Set(hiddenColumns);
                this.debug('État des colonnes chargé:', hiddenColumns);
            }
        } catch (error) {
            console.error('[HidePlugin] Erreur lors du chargement de l\'état des colonnes', error);
        }
    }
    
    /**
     * Charge l'état des lignes depuis le localStorage
     */
    loadRowState() {
        try {
            const savedData = localStorage.getItem(this.config.rows.storageKey);
            if (!savedData) return;
            
            const hiddenRows = JSON.parse(savedData);
            if (Array.isArray(hiddenRows)) {
                this.state.hiddenRows = new Set(hiddenRows);
                this.debug('État des lignes chargé:', hiddenRows);
            }
        } catch (error) {
            console.error('[HidePlugin] Erreur lors du chargement de l\'état des lignes', error);
        }
    }
    
    /**
     * Initialise les boutons de toggle
     */
    setupToggleButtons() {
        // Configurer les boutons pour les colonnes
        if (this.isColumnsEnabled()) {
            this.setupColumnToggleButtons();
        }
        
        // Configurer les boutons pour les lignes
        if (this.isRowsEnabled()) {
            this.setupRowToggleButtons();
        }
    }
    
    /**
     * Initialise les boutons de toggle pour les colonnes
     */
    setupColumnToggleButtons() {
        this.state.columnElements.forEach(column => {
            if (!column.toggleable) return;
            
            const headerCell = column.element;
            
            // Éviter d'ajouter plusieurs boutons
            if (headerCell.querySelector(this.config.columns.toggleSelector)) {
                return;
            }
            
            // Créer le bouton
            const toggleContainer = document.createElement('div');
            toggleContainer.innerHTML = this.config.columns.toggleHTML;
            const toggleButton = toggleContainer.firstChild;
            
            // Positionner le bouton
            if (this.config.columns.togglePosition === 'prepend') {
                headerCell.insertBefore(toggleButton, headerCell.firstChild);
            } else { // 'append' par défaut
                headerCell.appendChild(toggleButton);
            }
            
            // Ajouter l'événement de clic
            toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleColumn(column.index);
            });
            
            this.debug(`Bouton toggle ajouté à la colonne ${column.id}`);
        });
    }
    
    /**
     * Initialise les boutons de toggle pour les lignes
     */
    setupRowToggleButtons() {
        this.state.rowElements.forEach(row => {
            if (!row.toggleable) return;
            
            const rowElement = row.element;
            
            // Trouver la cellule où ajouter le bouton
            const toggleColumnIndex = Math.min(
                this.config.rows.toggleColumn, 
                rowElement.cells.length - 1
            );
            
            const cell = rowElement.cells[toggleColumnIndex];
            if (!cell) {
                this.debug(`Cellule non trouvée pour la ligne ${row.id}`);
                return;
            }
            
            // Éviter d'ajouter plusieurs boutons
            if (cell.querySelector(this.config.rows.toggleSelector)) {
                return;
            }
            
            // Créer le bouton
            const toggleContainer = document.createElement('div');
            toggleContainer.innerHTML = this.config.rows.toggleHTML;
            const toggleButton = toggleContainer.firstChild;
            
            // Positionner le bouton
            if (this.config.rows.togglePosition === 'prepend') {
                cell.insertBefore(toggleButton, cell.firstChild);
            } else { // 'append' par défaut
                cell.appendChild(toggleButton);
            }
            
            // Ajouter l'événement de clic
            toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleRow(row.index);
            });
            
            this.debug(`Bouton toggle ajouté à la ligne ${row.id}`);
        });
    }
    
    /**
     * Applique l'état initial (masque les colonnes/lignes marquées)
     */
    applyInitialState() {
        // Appliquer l'état initial des colonnes
        if (this.isColumnsEnabled()) {
            // Masquer les colonnes marquées avec l'attribut hideAttribute
            this.state.columnElements.forEach(column => {
                if (column.initiallyHidden || this.state.hiddenColumns.has(column.id)) {
                    this.hideColumn(column.index, false);
                }
            });
        }
        
        // Appliquer l'état initial des lignes
        if (this.isRowsEnabled()) {
            // Masquer les lignes marquées avec l'attribut hideAttribute
            this.state.rowElements.forEach(row => {
                if (row.initiallyHidden || this.state.hiddenRows.has(row.id)) {
                    this.hideRow(row.index, false);
                }
            });
        }
    }
    
    /**
     * Injecte les styles CSS requis pour le plugin
     */
    injectStyles() {
        if (!document.getElementById('hide-plugin-styles')) {
            const style = document.createElement('style');
            style.id = 'hide-plugin-styles';
            style.textContent = `
                /* Styles pour les colonnes masquées */
                .${this.config.columns.hiddenClass} {
                    display: none !important;
                }
                
                /* Styles pour les lignes masquées */
                .${this.config.rows.hiddenClass} {
                    display: none !important;
                }
                
                /* Styles pour les boutons toggle de colonnes */
                ${this.config.columns.toggleSelector} {
                    cursor: pointer;
                    margin-left: 8px;
                    color: #999;
                    transition: color 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                
                ${this.config.columns.toggleSelector}:hover {
                    color: #333;
                }
                
                /* Styles pour les boutons toggle de lignes */
                ${this.config.rows.toggleSelector} {
                    cursor: pointer;
                    margin-right: 8px;
                    color: #999;
                    transition: color 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                
                ${this.config.rows.toggleSelector}:hover {
                    color: #333;
                }
            `;
            document.head.appendChild(style);
            this.debug('Styles CSS injectés');
        }
    }
    
    /**
     * Masque une colonne
     * @param {number} columnIndex - Index de la colonne à masquer
     * @param {boolean} [save=true] - Si on doit sauvegarder l'état
     */
    hideColumn(columnIndex, save = true) {
        if (!this.isColumnsEnabled() || columnIndex < 0 || columnIndex >= this.state.columnElements.length) {
            return;
        }
        
        const column = this.state.columnElements[columnIndex];
        const table = this.table.table;
        
        // Masquer l'en-tête
        if (column.element) {
            column.element.classList.add(this.config.columns.hiddenClass);
        }
        
        // Masquer les cellules du corps
        const bodyCells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`);
        bodyCells.forEach(cell => {
            cell.classList.add(this.config.columns.hiddenClass);
        });
        
        // Masquer les cellules du pied
        const footCells = table.querySelectorAll(`tfoot tr td:nth-child(${columnIndex + 1})`);
        footCells.forEach(cell => {
            cell.classList.add(this.config.columns.hiddenClass);
        });
        
        // Mettre à jour l'état
        this.state.hiddenColumns.add(column.id);
        
        // Sauvegarder l'état si demandé
        if (save && this.config.persistState) {
            this.saveColumnState();
        }
        
        this.debug(`Colonne ${column.id} masquée`);
        
        // Déclencher l'événement
        this.triggerToggleEvent('column', columnIndex, true);
    }
    
    /**
     * Affiche une colonne
     * @param {number} columnIndex - Index de la colonne à afficher
     * @param {boolean} [save=true] - Si on doit sauvegarder l'état
     */
    showColumn(columnIndex, save = true) {
        if (!this.isColumnsEnabled() || columnIndex < 0 || columnIndex >= this.state.columnElements.length) {
            return;
        }
        
        const column = this.state.columnElements[columnIndex];
        const table = this.table.table;
        
        // Afficher l'en-tête
        if (column.element) {
            column.element.classList.remove(this.config.columns.hiddenClass);
        }
        
        // Afficher les cellules du corps
        const bodyCells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`);
        bodyCells.forEach(cell => {
            cell.classList.remove(this.config.columns.hiddenClass);
        });
        
        // Afficher les cellules du pied
        const footCells = table.querySelectorAll(`tfoot tr td:nth-child(${columnIndex + 1})`);
        footCells.forEach(cell => {
            cell.classList.remove(this.config.columns.hiddenClass);
        });
        
        // Mettre à jour l'état
        this.state.hiddenColumns.delete(column.id);
        
        // Sauvegarder l'état si demandé
        if (save && this.config.persistState) {
            this.saveColumnState();
        }
        
        this.debug(`Colonne ${column.id} affichée`);
        
        // Déclencher l'événement
        this.triggerToggleEvent('column', columnIndex, false);
    }
    
    /**
     * Bascule la visibilité d'une colonne
     * @param {number} columnIndex - Index de la colonne à basculer
     */
    toggleColumn(columnIndex) {
        if (!this.isColumnsEnabled() || columnIndex < 0 || columnIndex >= this.state.columnElements.length) {
            return;
        }
        
        const column = this.state.columnElements[columnIndex];
        const isHidden = this.isColumnHidden(columnIndex);
        
        if (isHidden) {
            this.showColumn(columnIndex);
        } else {
            this.hideColumn(columnIndex);
        }
        
        this.debug(`Visibilité de la colonne ${column.id} basculée:`, !isHidden);
    }
    
    /**
     * Masque une ligne
     * @param {number} rowIndex - Index de la ligne à masquer
     * @param {boolean} [save=true] - Si on doit sauvegarder l'état
     */
    hideRow(rowIndex, save = true) {
        if (!this.isRowsEnabled() || rowIndex < 0 || rowIndex >= this.state.rowElements.length) {
            return;
        }
        
        const row = this.state.rowElements[rowIndex];
        
        // Masquer la ligne
        if (row.element) {
            row.element.classList.add(this.config.rows.hiddenClass);
        }
        
        // Mettre à jour l'état
        this.state.hiddenRows.add(row.id);
        
        // Sauvegarder l'état si demandé
        if (save && this.config.persistState) {
            this.saveRowState();
        }
        
        this.debug(`Ligne ${row.id} masquée`);
        
        // Déclencher l'événement
        this.triggerToggleEvent('row', rowIndex, true);
    }
    
    /**
     * Affiche une ligne
     * @param {number} rowIndex - Index de la ligne à afficher
     * @param {boolean} [save=true] - Si on doit sauvegarder l'état
     */
    showRow(rowIndex, save = true) {
        if (!this.isRowsEnabled() || rowIndex < 0 || rowIndex >= this.state.rowElements.length) {
            return;
        }
        
        const row = this.state.rowElements[rowIndex];
        
        // Afficher la ligne
        if (row.element) {
            row.element.classList.remove(this.config.rows.hiddenClass);
        }
        
        // Mettre à jour l'état
        this.state.hiddenRows.delete(row.id);
        
        // Sauvegarder l'état si demandé
        if (save && this.config.persistState) {
            this.saveRowState();
        }
        
        this.debug(`Ligne ${row.id} affichée`);
        
        // Déclencher l'événement
        this.triggerToggleEvent('row', rowIndex, false);
    }
    
    /**
     * Bascule la visibilité d'une ligne
     * @param {number} rowIndex - Index de la ligne à basculer
     */
    toggleRow(rowIndex) {
        if (!this.isRowsEnabled() || rowIndex < 0 || rowIndex >= this.state.rowElements.length) {
            return;
        }
        
        const row = this.state.rowElements[rowIndex];
        const isHidden = this.isRowHidden(rowIndex);
        
        if (isHidden) {
            this.showRow(rowIndex);
        } else {
            this.hideRow(rowIndex);
        }
        
        this.debug(`Visibilité de la ligne ${row.id} basculée:`, !isHidden);
    }
    
    /**
     * Vérifie si une colonne est masquée
     * @param {number} columnIndex - Index de la colonne
     * @returns {boolean} - True si la colonne est masquée
     */
    isColumnHidden(columnIndex) {
        if (!this.isColumnsEnabled() || columnIndex < 0 || columnIndex >= this.state.columnElements.length) {
            return false;
        }
        
        const column = this.state.columnElements[columnIndex];
        return this.state.hiddenColumns.has(column.id);
    }
    
    /**
     * Vérifie si une ligne est masquée
     * @param {number} rowIndex - Index de la ligne
     * @returns {boolean} - True si la ligne est masquée
     */
    isRowHidden(rowIndex) {
        if (!this.isRowsEnabled() || rowIndex < 0 || rowIndex >= this.state.rowElements.length) {
            return false;
        }
        
        const row = this.state.rowElements[rowIndex];
        return this.state.hiddenRows.has(row.id);
    }
    
    /**
     * Enregistre l'état des colonnes dans le localStorage
     */
    saveColumnState() {
        if (!this.config.persistState || !this.config.columns.storageKey) return;
        
        try {
            const hiddenColumns = Array.from(this.state.hiddenColumns);
            localStorage.setItem(this.config.columns.storageKey, JSON.stringify(hiddenColumns));
            this.debug('État des colonnes enregistré:', hiddenColumns);
        } catch (error) {
            console.error('[HidePlugin] Erreur lors de l\'enregistrement de l\'état des colonnes', error);
        }
    }
    
    /**
     * Enregistre l'état des lignes dans le localStorage
     */
    saveRowState() {
        if (!this.config.persistState || !this.config.rows.storageKey) return;
        
        try {
            const hiddenRows = Array.from(this.state.hiddenRows);
            localStorage.setItem(this.config.rows.storageKey, JSON.stringify(hiddenRows));
            this.debug('État des lignes enregistré:', hiddenRows);
        } catch (error) {
            console.error('[HidePlugin] Erreur lors de l\'enregistrement de l\'état des lignes', error);
        }
    }
    
    /**
     * Déclenche un événement de toggle
     * @param {string} type - Type d'élément ('column' ou 'row')
     * @param {number} index - Index de l'élément
     * @param {boolean} isHidden - Si l'élément est masqué
     */
    triggerToggleEvent(type, index, isHidden) {
        const eventName = type === 'column' ? 'column:toggle' : 'row:toggle';
        const detail = type === 'column' ? 
            {
                columnId: this.state.columnElements[index].id,
                index: index,
                isHidden: isHidden
            } : 
            {
                rowId: this.state.rowElements[index].id,
                index: index,
                isHidden: isHidden
            };
        
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true
        });
        
        this.table.table.dispatchEvent(event);
        
        // Callback spécifique
        if (type === 'column' && typeof this.config.columns.onColumnToggle === 'function') {
            this.config.columns.onColumnToggle(detail);
        } else if (type === 'row' && typeof this.config.rows.onRowToggle === 'function') {
            this.config.rows.onRowToggle(detail);
        }
        
        // Callback général
        if (typeof this.config.onToggle === 'function') {
            this.config.onToggle({
                type: type,
                ...detail
            });
        }
    }
    
    /**
     * Réinitialise l'état (affiche toutes les colonnes et lignes)
     */
    resetState() {
        // Réinitialiser les colonnes
        if (this.isColumnsEnabled()) {
            this.state.columnElements.forEach((column, index) => {
                if (!column.initiallyHidden && this.isColumnHidden(index)) {
                    this.showColumn(index, false);
                }
            });
            
            this.state.hiddenColumns.clear();
            if (this.config.persistState && this.config.columns.storageKey) {
                localStorage.removeItem(this.config.columns.storageKey);
            }
        }
        
        // Réinitialiser les lignes
        if (this.isRowsEnabled()) {
            this.state.rowElements.forEach((row, index) => {
                if (!row.initiallyHidden && this.isRowHidden(index)) {
                    this.showRow(index, false);
                }
            });
            
            this.state.hiddenRows.clear();
            if (this.config.persistState && this.config.rows.storageKey) {
                localStorage.removeItem(this.config.rows.storageKey);
            }
        }
        
        this.debug('État réinitialisé');
        
        // Déclencher un événement
        const event = new CustomEvent('hide:reset', {
            detail: {
                columns: this.isColumnsEnabled(),
                rows: this.isRowsEnabled()
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }
    
    /**
     * Rafraîchit le plugin après des modifications de la table
     */
    refresh() {
        if (!this.state.isInitialized) return;
        
        this.debug('Rafraîchissement du plugin');
        
        // Ré-analyser la structure de la table
        this.analyzeTableStructure();
        
        // Réinitialiser les boutons de toggle
        this.setupToggleButtons();
        
        // Réappliquer l'état
        this.applyInitialState();
    }
    
    /**
     * Nettoyage avant la destruction du plugin
     */
    destroy() {
        this.debug('Destruction du plugin');
        
        // Supprimer les styles
        const style = document.getElementById('hide-plugin-styles');
        if (style) {
            style.parentNode.removeChild(style);
        }
        
        // Afficher toutes les colonnes et lignes masquées
        if (this.isColumnsEnabled()) {
            this.state.columnElements.forEach((column, index) => {
                if (this.isColumnHidden(index)) {
                    this.showColumn(index, false);
                }
            });
        }
        
        if (this.isRowsEnabled()) {
            this.state.rowElements.forEach((row, index) => {
                if (this.isRowHidden(index)) {
                    this.showRow(index, false);
                }
            });
        }
    }
}