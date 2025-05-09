export default class FilterAndPaginatePlugin {
    constructor(config = {}) {
        this.name = 'filterandpaginate';
        this.version = '1.2.0';
        this.type = 'filter';
        this.table = null;
        this.config = {...this.getDefaultConfig(), ...config};

        this.currentPage = 1;
        this.totalPages = 1;
        this.container = null;
        this.filterValue = '';
        this.filterTimeout = null;
        this.columnFilters = new Map(); // Pour stocker les filtres par colonne
        this.lastState = null; // Pour stocker l'état précédent

        this.debug('Plugin créé avec la config:', this.config);
    }

    getDefaultConfig() {
        return {
            enableFilter: true,
            globalFilter: null,
            debounceTime: 300,
            pageSize: 10,
            pageSizes: [10, 25, 50, 100],
            containerClass: 'pagination-container',
            paginationClass: 'pagination',
            activeClass: 'active',
            disabledClass: 'disabled',
            rememberState: false, // Nouvelle option pour se souvenir de l'état
            enableColumnFilters: false, // Nouvelle option pour activer les filtres par colonne
            filterColumnAttribute: 'th-filter', // Attribut pour identifier les colonnes qui peuvent être filtrées
            filterExcludeAttribute: 'th-filter-exclude', // Attribut pour exclure des colonnes du filtrage
            selectClass: 'form-select',
            btnClass: 'btn btn-glass btn-glass-blue',
            showPageSizes: true,
            showInfo: true,
            labels: {
                first: '«',
                prev: '‹',
                next: '›',
                last: '»',
                info: 'Affichage de {start} à {end} sur {total} entrées',
                pageSize: 'Entrées par page:',
                columnFilter: 'Filtrer:' // Nouveau label pour les filtres de colonne
            },
            icons: {
                first: '<i class="fas fa-angle-double-left"></i>',
                prev: '<i class="fas fa-chevron-left"></i>',
                next: '<i class="fas fa-chevron-right"></i>',
                last: '<i class="fas fa-angle-double-right"></i>',
                filter: '<i class="fas fa-filter"></i>' // Nouvelle icône pour les filtres
            },
            backwardIcon: '<i class="fas fa-chevron-left"></i>',
            forwardIcon: '<i class="fas fa-chevron-right"></i>',
            fastBackwardIcon: '<i class="fas fa-angle-double-left"></i>',
            fastForwardIcon: '<i class="fas fa-angle-double-right"></i>'
        };
    }

    init(tableHandler) {
        this.table = tableHandler;
        this.debug('Initialisation avec la table:', this.table);

        // Setup du filtre si activé
        if (this.config.enableFilter) {
            this.setupFilter();
        }

        // Setup des filtres par colonne si activés
        if (this.config.enableColumnFilters) {
            this.setupColumnFilters();
        }

        // Création et insertion du conteneur
        this.createContainer();

        // Écoute de l'événement de tri (correction de la typo)
        this.table.table.addEventListener('sortAppended', () => {
            // Sauvegarder l'état avant le rafraîchissement
            this.saveState();
            this.refresh(true); // Conserver la page actuelle
        });

        // Écouter les événements de modification du tableau
        this.table.table.addEventListener('row:added', () => {
            this.saveState();
            this.refresh(true);
        });

        this.table.table.addEventListener('row:removed', () => {
            this.saveState();
            this.refresh(true);
        });

        this.table.table.addEventListener('cell:change', () => {
            this.saveState();
            this.refresh(true);
        });

        // Restaurer l'état précédent ou faire un rafraîchissement initial
        if (!this.restoreState()) {
            this.refresh();
        }
    }

    setupFilter() {
        if (!this.config.globalFilter) {
            this.debug('Pas de filtre global configuré');
            return;
        }

        const input = document.querySelector(this.config.globalFilter);
        if (!input) {
            this.debug('Input filtre non trouvé:', this.config.globalFilter);
            return;
        }

        this.debug('Configuration du filtre sur l\'input:', input);

        input.addEventListener('input', (e) => {
            this.debug('Événement input déclenché:', e.target.value);

            if (this.filterTimeout) {
                clearTimeout(this.filterTimeout);
            }

            this.filterTimeout = setTimeout(() => {
                this.filterValue = e.target.value.toLowerCase().trim();
                this.debug('Filtrage avec la valeur:', this.filterValue);
                this.currentPage = 1;
                this.refresh();

                // Déclencher l'événement onFilter s'il existe
                if (this.table.options.onFilter) {
                    this.table.options.onFilter(this.filterValue);
                }
            }, this.config.debounceTime);
        });
    }

    // Méthode pour ajouter des filtres par colonne
    setupColumnFilters() {
        if (!this.config.enableColumnFilters) return;
        
        const headerCells = this.table.table.querySelectorAll('thead th');
        
        // Exclure les colonnes qui ne doivent pas avoir de filtre
        const excludeColumns = Array.from(this.table.table.querySelectorAll(`th[${this.config.filterExcludeAttribute}], th[th-sql-exclude], th[th-hide]`))
            .map(th => Array.from(headerCells).indexOf(th));
        
        // Identifier les colonnes qui doivent avoir un filtre
        const filterColumns = Array.from(headerCells)
            .map((th, index) => ({ th, index }))
            .filter(({ th, index }) => {
                // Si l'attribut filterColumnAttribute est défini, n'ajouter des filtres qu'aux colonnes avec cet attribut
                if (this.config.filterColumnAttribute) {
                    return th.hasAttribute(this.config.filterColumnAttribute) && !excludeColumns.includes(index);
                }
                // Sinon, ajouter des filtres à toutes les colonnes non exclues
                return !excludeColumns.includes(index);
            });
        
        this.debug(`${filterColumns.length} colonnes configurées pour le filtrage par colonne`);
        
        filterColumns.forEach(({ th: header, index }) => {
            // Créer le conteneur de filtre
            const filterContainer = document.createElement('div');
            filterContainer.className = 'column-filter';
            
            // Créer l'icône de filtre
            const filterIcon = document.createElement('span');
            filterIcon.className = 'filter-icon';
            filterIcon.innerHTML = this.config.icons.filter;
            filterContainer.appendChild(filterIcon);
            
            // Créer l'input de filtre (caché par défaut)
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.className = 'column-filter-input';
            filterInput.placeholder = this.config.labels.columnFilter;
            filterInput.style.display = 'none';
            filterContainer.appendChild(filterInput);
            
            // Ajouter le conteneur à l'en-tête
            const headerWrapper = header.querySelector('.head-wrapper') || header;
            headerWrapper.appendChild(filterContainer);
            
            // Gérer les événements
            filterIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                filterInput.style.display = filterInput.style.display === 'none' ? 'block' : 'none';
                if (filterInput.style.display === 'block') {
                    filterInput.focus();
                }
            });
            
            filterInput.addEventListener('input', (e) => {
                e.stopPropagation();
                
                if (this.filterTimeout) {
                    clearTimeout(this.filterTimeout);
                }
                
                this.filterTimeout = setTimeout(() => {
                    const value = e.target.value.toLowerCase().trim();
                    
                    // Stocker ou supprimer le filtre selon qu'il est vide ou non
                    if (value) {
                        this.columnFilters.set(index, value);
                        header.classList.add('filtered');
                    } else {
                        this.columnFilters.delete(index);
                        header.classList.remove('filtered');
                    }
                    
                    this.currentPage = 1;
                    this.refresh();
                }, this.config.debounceTime);
            });
            
            // Empêcher la propagation des événements clavier
            filterInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
        });
    }

    createContainer() {
        // Créer le conteneur principal
        this.container = document.createElement('div');
        this.container.className = this.config.containerClass;

        // Créer le conteneur de pagination
        const paginationContainer = document.createElement('div');
        paginationContainer.className = this.config.paginationClass;
        this.container.appendChild(paginationContainer);

        // Créer le sélecteur de taille de page si activé
        if (this.config.showPageSizes) {
            const pageSizeContainer = document.createElement('div');
            pageSizeContainer.className = 'page-size-container';

            if (this.config.labels.pageSize) {
                const label = document.createElement('span');
                label.textContent = this.config.labels.pageSize;
                pageSizeContainer.appendChild(label);
            }

            const select = document.createElement('select');
            select.className = this.config.selectClass;

            this.config.pageSizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                if (size === this.config.pageSize) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                this.config.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.refresh();
            });

            pageSizeContainer.appendChild(select);
            this.container.appendChild(pageSizeContainer);
        }

        // Créer le conteneur d'info si activé
        if (this.config.showInfo) {
            const infoContainer = document.createElement('div');
            infoContainer.className = 'pagination-info';
            this.container.appendChild(infoContainer);
        }

        // Insérer le conteneur après la table
        this.table.table.parentNode.insertBefore(this.container, this.table.table.nextSibling);
    }

    createPageButton(text, page, isDisabled = false) {
        const button = document.createElement('button');
        button.className = this.config.btnClass;
        button.innerHTML = text;
        button.disabled = isDisabled;

        if (isDisabled) {
            button.classList.add(this.config.disabledClass);
        }

        if (page === this.currentPage) {
            button.classList.add(this.config.activeClass);
        }

        if (!isDisabled) {
            button.addEventListener('click', () => this.goToPage(page));
        }

        return button;
    }

    updatePagination() {
        const paginationContainer = this.container.querySelector(`.${this.config.paginationClass}`);
        paginationContainer.innerHTML = '';

        // Boutons de navigation
        paginationContainer.appendChild(this.createPageButton(this.config.icons.first || this.config.labels.first, 1, this.currentPage === 1));
        paginationContainer.appendChild(this.createPageButton(this.config.icons.prev || this.config.labels.prev, this.currentPage - 1, this.currentPage === 1));

        // Pages
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(this.totalPages, startPage + 4);
        startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(this.createPageButton(i, i));
        }

        // Boutons suivant/dernier
        paginationContainer.appendChild(this.createPageButton(this.config.icons.next || this.config.labels.next, this.currentPage + 1, this.currentPage === this.totalPages));
        paginationContainer.appendChild(this.createPageButton(this.config.icons.last || this.config.labels.last, this.totalPages, this.currentPage === this.totalPages));
    }

    updateInfo() {
        if (!this.config.showInfo) return;

        const infoContainer = this.container.querySelector('.pagination-info');
        if (!infoContainer) return;

        const filteredRows = this.getFilteredRows();
        const start = (this.currentPage - 1) * this.config.pageSize + 1;
        const end = Math.min(start + this.config.pageSize - 1, filteredRows.length);

        let infoText = this.config.labels.info
            .replace('{start}', start)
            .replace('{end}', end)
            .replace('{total}', filteredRows.length);

        infoContainer.textContent = infoText;
    }

    getFilteredRows() {
        const rows = Array.from(this.table.getAllRows());
        const hasGlobalFilter = this.filterValue && this.filterValue.length > 0;
        const hasColumnFilters = this.columnFilters.size > 0;
        
        // Si aucun filtre n'est actif, retourner toutes les lignes
        if (!hasGlobalFilter && !hasColumnFilters) {
            return rows;
        }

        // Récupérer les colonnes à exclure du filtrage
        const excludeColumns = Array.from(this.table.table.querySelectorAll(`th[${this.config.filterExcludeAttribute}], th[th-sql-exclude], th[th-hide]`))
            .map(th => Array.from(this.table.table.querySelectorAll('th')).indexOf(th));
        
        this.debug('Colonnes exclues du filtrage:', excludeColumns);

        return rows.filter(row => {
            // Vérifier le filtre global
            if (hasGlobalFilter) {
                const matchesGlobal = Array.from(row.cells).some((cell, index) => {
                    // Ignorer les colonnes exclues
                    if (excludeColumns.includes(index)) {
                        return false;
                    }
                    const value = this.getCellValue(cell);
                    return value.toLowerCase().includes(this.filterValue);
                });
                
                if (!matchesGlobal) return false;
            }
            
            // Vérifier les filtres par colonne
            if (hasColumnFilters) {
                for (const [columnIndex, filterValue] of this.columnFilters.entries()) {
                    if (columnIndex >= row.cells.length) continue;
                    
                    const cell = row.cells[columnIndex];
                    const value = this.getCellValue(cell);
                    
                    if (!value.toLowerCase().includes(filterValue)) {
                        return false;
                    }
                }
            }
            
            return true;
        });
    }

    getCellValue(cell) {
        if (!cell) return '';
        
        // Vérifier d'abord data-filter-value
        const filterValue = cell.getAttribute('data-filter-value');
        if (filterValue !== null) {
            return filterValue;
        }
        
        // Vérifier si la cellule a un type de données spécifique
        const dataType = cell.getAttribute('data-type');
        
        // Récupérer le contenu brut de la cellule
        const rawContent = cell.textContent.trim();
        
        // Traitement spécifique selon le type de données
        if (dataType === 'date') {
            // Pour les dates, on pourrait normaliser le format pour une meilleure recherche
            try {
                const date = new Date(rawContent);
                if (!isNaN(date.getTime())) {
                    // Format ISO pour une recherche cohérente
                    return date.toISOString();
                }
            } catch (e) {
                this.debug('Erreur lors de la conversion de la date:', e);
            }
        } else if (dataType === 'number') {
            // Pour les nombres, on pourrait normaliser le format
            const num = parseFloat(rawContent.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(num)) {
                return num.toString();
            }
        }
        
        // Par défaut, retourner le contenu textuel
        return rawContent;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }

        this.currentPage = page;
        this.refresh();

        // Déclencher l'événement de changement de page
        const event = new CustomEvent('pageChanged', {
            detail: {
                page: this.currentPage,
                pageSize: this.config.pageSize
            }
        });
        this.table.table.dispatchEvent(event);
    }

    refresh(keepPage = false) {
        const filteredRows = this.getFilteredRows();
        this.totalPages = Math.ceil(filteredRows.length / this.config.pageSize);

        // Ajuster la page courante si nécessaire
        if (!keepPage || this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages || 1;
        }

        // Calculer les indices de début et de fin
        const start = (this.currentPage - 1) * this.config.pageSize;
        const end = start + this.config.pageSize;

        // Masquer toutes les lignes
        const allRows = this.table.getAllRows();
        allRows.forEach(row => row.style.display = 'none');

        // Afficher uniquement les lignes de la page courante
        filteredRows.slice(start, end).forEach(row => row.style.display = '');

        // Mettre à jour la pagination et les infos
        this.updatePagination();
        this.updateInfo();
        
        // Déclencher un événement pour informer que le filtrage/pagination a été mis à jour
        const event = new CustomEvent('filterAndPaginateUpdated', {
            detail: {
                filteredRowsCount: filteredRows.length,
                totalRows: allRows.length,
                currentPage: this.currentPage,
                totalPages: this.totalPages,
                pageSize: this.config.pageSize,
                filterValue: this.filterValue
            },
            bubbles: true
        });
        this.table.table.dispatchEvent(event);
    }

    // Méthode pour sauvegarder l'état actuel
    saveState() {
        if (!this.config.rememberState) return;
        
        this.lastState = {
            currentPage: this.currentPage,
            pageSize: this.config.pageSize,
            filterValue: this.filterValue,
            columnFilters: new Map(this.columnFilters)
        };
    }

    // Méthode pour restaurer l'état précédent
    restoreState() {
        if (!this.config.rememberState || !this.lastState) return false;
        
        this.currentPage = this.lastState.currentPage;
        this.config.pageSize = this.lastState.pageSize;
        this.filterValue = this.lastState.filterValue;
        this.columnFilters = new Map(this.lastState.columnFilters);
        
        // Mettre à jour l'interface utilisateur
        if (this.config.globalFilter) {
            const input = document.querySelector(this.config.globalFilter);
            if (input) {
                input.value = this.filterValue;
            }
        }
        
        return true;
    }

    destroy() {
        // Supprimer le conteneur de pagination
        if (this.container) {
            this.container.remove();
        }

        // Supprimer le gestionnaire d'événements du filtre
        if (this.config.enableFilter && this.config.globalFilter) {
            const input = document.querySelector(this.config.globalFilter);
            if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input'));
            }
        }

        // Réinitialiser les variables
        this.currentPage = 1;
        this.totalPages = 1;
        this.filterValue = '';
        this.container = null;
    }

    debug(message, data = null) {
        if (this.config.debug) {
            console.log(`[FilterAndPaginatePlugin] ${message}`, data || '');
        }
    }
}