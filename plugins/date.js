/**
 * Plugin Date pour TableFlow
 * Permet de gérer des cellules avec sélection de date et/ou d'heure
 * Version: 1.0.0
 */
export default class DatePlugin {
    constructor(config = {}) {
        this.name = 'date';
        this.version = '1.0.0';
        this.type = 'edit';
        this.table = null;
        this.dateHandler = null;
        this.dependencies = [];
        
        // Configuration par défaut
        this.config = {
            dateAttribute: 'th-date',        // Attribut pour marquer les colonnes de date
            cellClass: 'td-date',            // Classe CSS pour les cellules de date
            readOnlyClass: 'readonly',       // Classe CSS pour les cellules en lecture seule
            modifiedClass: 'modified',       // Classe CSS pour les lignes modifiées
            customClass: '',                 // Classe CSS personnalisée pour le sélecteur
            debug: false,                    // Mode debug
            
            // Options avancées pour DateFlow
            timeInterval: 15,                // Intervalle en minutes pour le sélecteur d'heure
            firstDayOfWeek: 'monday',        // Premier jour de la semaine ('monday' ou 'sunday')
            lang: 'fr',                      // Langue pour les labels
            format: 'DD.MM.YYYY',            // Format de date par défaut
            timeFormat: 'HH:mm',             // Format d'heure par défaut
            
            // Options pour les colonnes
            columns: {},                     // Configuration spécifique par colonne
            
            // Callbacks
            onDateChange: null,              // Fonction appelée après changement de date
            
            ...config                        // Fusionner avec la config passée
        };
        
        // Configurer le debug
        this.debug = this.config.debug ? 
            (...args) => console.log('[DatePlugin]', ...args) : 
            () => {};
            
        this.debug('Plugin créé avec la configuration:', this.config);
    }

    /**
     * Initialise le plugin
     * @param {Object} tableHandler - Instance de TableFlow
     */
    init(tableHandler) {
        if (!tableHandler) {
            throw new Error('TableHandler instance is required');
        }
        this.table = tableHandler;
        this.debug('Initialisation du plugin date');

        // Vérifier si DateFlow est disponible
        if (typeof DateFlow !== 'function') {
            console.error('[DatePlugin] La bibliothèque DateFlow est requise. Assurez-vous de l\'inclure avant ce plugin.');
            return;
        }

        // Initialiser DateFlow avec nos options
        this.dateHandler = new DateFlow({
            timeInterval: this.config.timeInterval,
            firstDayOfWeek: this.config.firstDayOfWeek,
            lang: this.config.lang,
            format: this.config.format,
            timeFormat: this.config.timeFormat,
            customClass: this.config.customClass
        });

        // Configurer les cellules de date
        this.setupDateCells();
        
        // Configurer les écouteurs d'événements
        this.setupEventListeners();
        
        this.debug('Plugin date initialisé avec succès');
    }

    /**
     * Configure les cellules de date
     */
    setupDateCells() {
        if (!this.table?.table) return;

        const headerCells = this.table.table.querySelectorAll('th');
        const dateColumns = Array.from(headerCells)
            .filter(header => header.hasAttribute(this.config.dateAttribute))
            .map(header => {
                const columnId = header.id;
                const columnConfig = this.getColumnConfig(columnId);
                return {
                    id: columnId,
                    index: Array.from(headerCells).indexOf(header),
                    config: columnConfig
                };
            });

        if (!dateColumns.length) return;

        const rows = this.table.table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            dateColumns.forEach(({id: columnId, index, config}) => {
                const cell = row.cells[index];
                if (!cell) return;

                if (cell.getAttribute('data-plugin') && cell.getAttribute('data-plugin') !== 'date') {
                    return;
                }

                this.setupDateCell(cell, config);
            });
        });
        
        this.debug(`${dateColumns.length} colonne(s) de date configurée(s)`);
    }

    /**
     * Récupère la configuration spécifique d'une colonne
     * @param {string} columnId - ID de la colonne
     * @returns {Object} - Configuration de la colonne
     */
    getColumnConfig(columnId) {
        const defaultConfig = {
            time: false,           // Inclure la sélection de l'heure
            timeOnly: false,       // Sélection d'heure uniquement
            timeInterval: this.config.timeInterval,
            format: this.config.format,
            min: null,             // Date minimum (YYYY-MM-DD)
            max: null,             // Date maximum (YYYY-MM-DD)
            showButtons: true,     // Afficher les boutons "Aujourd'hui" et "Effacer"
        };

        // Récupérer la configuration spécifique de la colonne si elle existe
        const columnConfig = this.config.columns[columnId] || {};
        
        // Fusionner avec la configuration par défaut
        return { ...defaultConfig, ...columnConfig };
    }

    /**
     * Configure une cellule de date
     * @param {HTMLTableCellElement} cell - Cellule à configurer
     * @param {Object} columnConfig - Configuration de la colonne
     */
    setupDateCell(cell, columnConfig) {
        // Marquer la cellule comme gérée par ce plugin
        cell.classList.add(this.config.cellClass);
        cell.setAttribute('data-plugin', 'date');

        // Récupérer la valeur actuelle
        let currentValue = cell.getAttribute('data-value');
        if (!currentValue) {
            currentValue = cell.textContent.trim();
            cell.setAttribute('data-value', currentValue);
        }

        // Définir la valeur initiale si elle n'existe pas
        if (!cell.hasAttribute('data-initial-value')) {
            cell.setAttribute('data-initial-value', currentValue);
        }

        // Créer le wrapper pour le sélecteur de date
        const wrapper = document.createElement('div');
        wrapper.className = 'tf-date-wrapper date-flow';
        wrapper.setAttribute('data-wrapper', 'date');

        // Créer l'input de date
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'date-input';
        input.value = currentValue;
        
        // Ajouter les attributs DateFlow
        input.setAttribute('dp-input', '');
        
        // Configurer les options DateFlow
        if (columnConfig.time) {
            input.setAttribute('dp-time', '');
        }
        
        if (columnConfig.timeOnly) {
            input.setAttribute('dp-time-only', '');
        }
        
        if (columnConfig.timeInterval) {
            input.setAttribute('dp-time-interval', columnConfig.timeInterval.toString());
        }
        
        if (columnConfig.format) {
            input.setAttribute('dp-format', columnConfig.format);
        }
        
        if (columnConfig.min) {
            input.setAttribute('dp-min', columnConfig.min);
        }
        
        if (columnConfig.max) {
            input.setAttribute('dp-max', columnConfig.max);
        }
        
        if (columnConfig.showButtons) {
            input.setAttribute('dp-show-buttons', '');
        }

        // Ajouter l'input au wrapper
        wrapper.appendChild(input);
        
        // Vider la cellule et ajouter le wrapper
        cell.textContent = '';
        cell.appendChild(wrapper);
        
        // Configurer les gestionnaires d'événements pour l'input
        this.setupDateInputEvents(input, cell);
        
        this.debug(`Cellule de date configurée:`, {
            cellId: cell.id,
            value: currentValue,
            config: columnConfig
        });
    }
    
    /**
     * Configure les gestionnaires d'événements pour l'input de date
     * @param {HTMLInputElement} input - Input de date
     * @param {HTMLTableCellElement} cell - Cellule contenant l'input
     */
    setupDateInputEvents(input, cell) {
        // Fonction de mise à jour de la valeur
        const updateValue = () => {
            const oldValue = cell.getAttribute('data-value');
            const newValue = input.value;

            // Ne rien faire si la valeur n'a pas changé
            if (oldValue === newValue) return;

            // Mettre à jour la valeur
            cell.setAttribute('data-value', newValue);

            // Marquer la ligne comme modifiée si la valeur a changé
            const row = cell.closest('tr');
            if (row && newValue !== cell.getAttribute('data-initial-value')) {
                row.classList.add(this.config.modifiedClass);
            }

            // Déclencher l'événement de changement
            const changeEvent = new CustomEvent('cell:change', {
                detail: {
                    cellId: cell.id,
                    columnId: cell.id.split('_')[0],
                    rowId: row?.id,
                    oldValue: oldValue,
                    newValue: newValue,
                    cell: cell,
                    source: 'date',
                    tableId: this.table.table.id,
                    eventId: `date_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                },
                bubbles: true
            });
            this.table.table.dispatchEvent(changeEvent);
            
            // Appeler le callback si défini
            if (typeof this.config.onDateChange === 'function') {
                this.config.onDateChange({
                    cell,
                    oldValue,
                    newValue,
                    row
                });
            }
            
            this.debug('Date mise à jour:', {
                cellId: cell.id,
                oldValue,
                newValue
            });
        };

        // Écouter les changements
        input.addEventListener('change', updateValue);
    }

    /**
     * Configure les écouteurs d'événements globaux
     */
    setupEventListeners() {
        if (!this.table?.table) return;

        // Écouter l'événement cell:saved
        this.table.table.addEventListener('cell:saved', (event) => {
            const cell = event.detail.cell;
            if (!cell || !this.isManagedCell(cell)) return;

            const input = cell.querySelector('input.date-input');
            if (input) {
                const currentValue = input.value;
                cell.setAttribute('data-initial-value', currentValue);
                cell.setAttribute('data-value', currentValue);
                
                this.debug('Cellule sauvegardée:', {
                    cellId: cell.id,
                    value: currentValue
                });
            }
        });

        // Écouter l'événement row:saved
        this.table.table.addEventListener('row:saved', (event) => {
            const row = event.detail.row;
            if (!row) return;

            Array.from(row.cells).forEach(cell => {
                if (!this.isManagedCell(cell)) return;

                const input = cell.querySelector('input.date-input');
                if (input) {
                    const currentValue = input.value;
                    cell.setAttribute('data-initial-value', currentValue);
                    cell.setAttribute('data-value', currentValue);
                }
            });

            row.classList.remove(this.config.modifiedClass);
            
            this.debug('Ligne sauvegardée:', {
                rowId: row.id
            });
        });

        // Écouter l'ajout de nouvelles lignes
        this.table.table.addEventListener('row:added', () => {
            this.debug('Nouvelle ligne ajoutée, rafraîchissement des cellules de date');
            this.setupDateCells();
        });
    }

    /**
     * Vérifie si une cellule est gérée par ce plugin
     * @param {HTMLTableCellElement} cell - Cellule à vérifier
     * @returns {boolean} - True si la cellule est gérée par ce plugin
     */
    isManagedCell(cell) {
        return cell && (
            cell.getAttribute('data-plugin') === 'date' || 
            cell.classList.contains(this.config.cellClass)
        );
    }

    /**
     * Rafraîchit le plugin
     */
    refresh() {
        this.debug('Rafraîchissement du plugin date');
        this.setupDateCells();
    }

    /**
     * Détruit le plugin et nettoie les ressources
     */
    destroy() {
        this.debug('Destruction du plugin date');
        
        // Nettoyer l'instance DateFlow si elle existe
        if (this.dateHandler && typeof this.dateHandler.destroy === 'function') {
            this.dateHandler.destroy();
        }
    }
}