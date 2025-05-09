export default class SortPlugin {
    constructor(config = {}) {
        this.name = 'sort';
        this.version = '2.0.0';
        this.type = 'sort';
        this.table = null;
        
        // Configuration par défaut
        this.config = {
            sortableAttribute: 'th-sort',
            showIcons: true,
            defaultSort: null, // { column: 'columnId', direction: 'asc' }
            debug: false,
            ignoreCase: true,
            sortTypes: {}, // Définir des types de tri spécifiques pour certaines colonnes
            icons: {
                asc: '<i class="fa fa-sort-asc"></i>',
                desc: '<i class="fa fa-sort-desc"></i>',
                none: '<i class="fa fa-sort"></i>'
            },
            ...config
        };
        
        this.currentSortColumn = null;
        this.currentDirection = null;
        this.sortableColumns = new Map();
        this.originalOrder = [];
        
        // Initialiser le système de debug
        this.debug = this.config.debug ? 
            (...args) => console.log('[SortPlugin]', ...args) : 
            () => {};
    }

    init(tableHandler) {
        this.table = tableHandler;
        this.debug('Initialisation du plugin de tri');

        if (!this.table?.table) {
            console.error('[SortPlugin] Table non disponible');
            return;
        }

        // Stocker l'ordre original des lignes
        this.storeOriginalOrder();
        
        // Configurer les en-têtes triables
        this.setupSortableHeaders();
        
        // Appliquer le tri par défaut si configuré
        if (this.config.defaultSort) {
            this.applyDefaultSort();
        }
    }
    
    storeOriginalOrder() {
        const rows = this.table.getAllRows();
        this.originalOrder = [];
        
        rows.forEach((row, index) => {
            row.setAttribute('data-original-index', index.toString());
            this.originalOrder.push(row);
        });
        
        this.debug(`Ordre original stocké pour ${rows.length} lignes`);
    }
    
    setupSortableHeaders() {
        const headers = Array.from(this.table.table.querySelectorAll('th'));
        const sortableHeaders = headers.filter(header => 
            header.hasAttribute(this.config.sortableAttribute)
        );
        
        this.debug(`${sortableHeaders.length} en-têtes triables trouvés`);
        
        // Créer un mapping des colonnes triables
        this.sortableColumns = new Map();
        sortableHeaders.forEach(header => {
            const columnIndex = Array.from(header.parentElement.children).indexOf(header);
            const columnId = header.id || `column-${columnIndex}`;
            
            this.sortableColumns.set(columnId, {
                header,
                index: columnIndex,
                type: header.getAttribute('data-sort-type') || this.config.sortTypes[columnId] || 'auto'
            });
            
            this.setupSortColumn(header, columnId, columnIndex);
        });
    }

    setupSortColumn(header, columnId, columnIndex) {
        if (!header || header.hasAttribute('data-sort-initialized')) {
            return;
        }

        // Ajouter la classe de style
        header.classList.add('sortable');
        
        // Ajouter l'indicateur de tri
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        indicator.innerHTML = this.config.icons.none;
        header.appendChild(indicator);

        // Gérer le clic
        const clickHandler = () => this.handleHeaderClick(columnId);
        header.addEventListener('click', clickHandler);
        header._sortClickHandler = clickHandler; // Stocker pour pouvoir le retirer plus tard
        
        // Marquer comme initialisé
        header.setAttribute('data-sort-initialized', 'true');
        header.setAttribute('data-sort-direction', 'none');
        header.setAttribute('data-sort-column-id', columnId);
        
        this.debug(`Colonne ${columnId} (index ${columnIndex}) configurée pour le tri`);
    }

    handleHeaderClick(columnId) {
        if (!this.sortableColumns.has(columnId)) {
            this.debug(`Colonne ${columnId} non trouvée dans les colonnes triables`);
            return;
        }

        const { header, index } = this.sortableColumns.get(columnId);
        
        // Déterminer la direction
        const currentDirection = header.getAttribute('data-sort-direction') || 'none';
        let newDirection;
        
        switch (currentDirection) {
            case 'none':
                newDirection = 'asc';
                break;
            case 'asc':
                newDirection = 'desc';
                break;
            default:
                newDirection = 'none';
        }
        
        this.debug(`Tri de la colonne ${columnId} en direction ${newDirection}`);
        
        // Réinitialiser tous les autres en-têtes
        this.resetHeadersExcept(columnId);
        
        // Mettre à jour l'indicateur
        header.setAttribute('data-sort-direction', newDirection);
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) {
            indicator.innerHTML = this.config.icons[newDirection] || this.config.icons.none;
        }

        // Trier la colonne
        if (newDirection === 'none') {
            this.resetSort();
        } else {
            this.sortColumn(columnId, index, newDirection);
        }

        // Mettre à jour les variables d'état
        this.currentSortColumn = newDirection === 'none' ? null : columnId;
        this.currentDirection = newDirection === 'none' ? null : newDirection;

        // Déclencher l'événement de tri
        const event = new CustomEvent('sortAppended', {
            detail: {
                column: columnId,
                columnIndex: index,
                direction: newDirection
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }
    
    resetHeadersExcept(exceptColumnId) {
        for (const [columnId, { header }] of this.sortableColumns.entries()) {
            if (columnId !== exceptColumnId) {
                header.setAttribute('data-sort-direction', 'none');
                const indicator = header.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.innerHTML = this.config.icons.none;
                }
            }
        }
    }

    sortColumn(columnId, columnIndex, direction) {
        const tbody = this.table.table.querySelector('tbody');
        if (!tbody) {
            this.debug('tbody non trouvé');
            return;
        }

        const rows = Array.from(tbody.rows);
        const multiplier = direction === 'asc' ? 1 : -1;
        const columnInfo = this.sortableColumns.get(columnId);
        const sortType = columnInfo.type;
        
        this.debug(`Tri de ${rows.length} lignes par colonne ${columnId} (${sortType}) en ${direction}`);
        
        // Trier les lignes
        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex];
            const cellB = rowB.cells[columnIndex];
            
            if (!cellA || !cellB) return 0;

            // Obtenir les valeurs à comparer
            const valueA = this.getCellSortValue(cellA, sortType);
            const valueB = this.getCellSortValue(cellB, sortType);
            
            return this.compareValues(valueA, valueB, sortType) * multiplier;
        });

        // Réorganiser les lignes de manière optimisée
        this.reorderRows(tbody, rows);
    }
    
    getCellSortValue(cell, sortType) {
        // Vérifier d'abord s'il y a une valeur de tri explicite
        const sortValue = cell.getAttribute('data-sort-value');
        if (sortValue !== null) {
            return sortValue;
        }
        
        // Sinon, utiliser le contenu de la cellule
        const content = cell.textContent.trim();
        
        // Traiter selon le type de tri
        if (sortType === 'number' || (sortType === 'auto' && !isNaN(parseFloat(content)))) {
            return parseFloat(content.replace(/[^0-9.-]+/g, ''));
        } else if (sortType === 'date') {
            try {
                return new Date(content).getTime();
            } catch (e) {
                this.debug(`Erreur lors de la conversion de la date: ${content}`, e);
                return content;
            }
        } else {
            return this.config.ignoreCase ? content.toLowerCase() : content;
        }
    }
    
    compareValues(valueA, valueB, sortType) {
        // Comparer selon le type
        if (sortType === 'number' || (sortType === 'auto' && typeof valueA === 'number' && typeof valueB === 'number')) {
            return valueA - valueB;
        } else if (sortType === 'date' || (sortType === 'auto' && valueA instanceof Date && valueB instanceof Date)) {
            return valueA - valueB;
        } else {
            // Conversion en chaîne pour être sûr
            const strA = String(valueA);
            const strB = String(valueB);
            return strA.localeCompare(strB);
        }
    }
    
    reorderRows(tbody, sortedRows) {
        // Utiliser un fragment de document pour minimiser les manipulations du DOM
        const fragment = document.createDocumentFragment();
        sortedRows.forEach(row => fragment.appendChild(row));
        tbody.appendChild(fragment);
    }

    resetSort() {
        const tbody = this.table.table.querySelector('tbody');
        if (!tbody) return;
        
        this.debug('Réinitialisation du tri');
        
        // Trier par l'index original
        const rows = Array.from(tbody.rows);
        rows.sort((a, b) => {
            const indexA = parseInt(a.getAttribute('data-original-index') || '0');
            const indexB = parseInt(b.getAttribute('data-original-index') || '0');
            return indexA - indexB;
        });

        // Réorganiser les lignes
        this.reorderRows(tbody, rows);
        
        // Réinitialiser les variables d'état
        this.currentSortColumn = null;
        this.currentDirection = null;
    }
    
    applyDefaultSort() {
        const { column, direction } = this.config.defaultSort;
        if (!column || !direction || !this.sortableColumns.has(column)) {
            this.debug(`Configuration de tri par défaut invalide: ${JSON.stringify(this.config.defaultSort)}`);
            return;
        }
        
        this.debug(`Application du tri par défaut: ${column} ${direction}`);
        this.handleHeaderClick(column);
        
        // Si la direction par défaut est 'desc' et que le premier clic a donné 'asc', cliquer à nouveau
        if (direction === 'desc' && this.currentDirection === 'asc') {
            this.handleHeaderClick(column);
        }
    }
    
    refresh() {
        this.debug('Rafraîchissement du plugin de tri');
        
        // Si un tri est actuellement appliqué, le réappliquer
        if (this.currentSortColumn && this.currentDirection) {
            const columnInfo = this.sortableColumns.get(this.currentSortColumn);
            if (columnInfo) {
                this.sortColumn(this.currentSortColumn, columnInfo.index, this.currentDirection);
            }
        }
    }

    destroy() {
        this.debug('Destruction du plugin de tri');
        
        // Supprimer les gestionnaires d'événements et les éléments visuels
        for (const [columnId, { header }] of this.sortableColumns.entries()) {
            if (header._sortClickHandler) {
                header.removeEventListener('click', header._sortClickHandler);
                delete header._sortClickHandler;
            }

            // Supprimer l'indicateur
            const indicator = header.querySelector('.sort-indicator');
            if (indicator) {
                indicator.remove();
            }

            // Supprimer les attributs et classes
            header.removeAttribute('data-sort-initialized');
            header.removeAttribute('data-sort-direction');
            header.removeAttribute('data-sort-column-id');
            header.classList.remove('sortable');
        }

        // Réinitialiser les variables
        this.sortableColumns.clear();
        this.currentSortColumn = null;
        this.currentDirection = null;
        this.originalOrder = [];
    }
}