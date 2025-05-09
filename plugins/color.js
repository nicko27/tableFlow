/**
 * Plugin Color pour TableFlow
 * Permet de gérer des cellules avec sélection de couleur
 * Version: 2.0.0
 */
export default class ColorPlugin {
    constructor(config = {}) {
        this.name = 'color';
        this.version = '2.0.0';
        this.type = 'edit';
        this.table = null;
        this.colorHandler = null;
        this.dependencies = [];
        
        // Configuration par défaut
        this.config = {
            colorAttribute: 'th-color',       // Attribut pour marquer les colonnes de couleur
            cellClass: 'td-color',            // Classe CSS pour les cellules de couleur
            readOnlyClass: 'readonly',        // Classe CSS pour les cellules en lecture seule
            modifiedClass: 'modified',        // Classe CSS pour les lignes modifiées
            customClass: '',                  // Classe CSS personnalisée pour le sélecteur
            debug: false,                     // Mode debug
            
            // Options avancées pour ColorFlow
            presetColors: [                   // Couleurs prédéfinies
                { color: '#FF0000', label: 'R' },
                { color: '#00FF00', label: 'G' },
                { color: '#0000FF', label: 'B' },
                { color: '#FFFF00', label: 'Y' },
                { color: '#FF00FF', label: 'M' },
                { color: '#00FFFF', label: 'C' },
                { color: '#000000', label: 'K' },
                { color: '#FFFFFF', label: 'W' },
                { color: '#808080', label: 'G' },
                { color: '#FFA500', label: 'O' },
                { color: '#800080', label: 'P' },
                { color: '#008000', label: 'G' }
            ],
            
            // Support pour la transparence (préparation future)
            alphaSupport: false,              // Support de la transparence (non implémenté)
            
            // Callbacks
            onColorChange: null,              // Fonction appelée après changement de couleur
            
            ...config                         // Fusionner avec la config passée
        };
        
        // Configurer le debug
        this.debug = this.config.debug ? 
            (...args) => console.log('[ColorPlugin]', ...args) : 
            () => {};
            
        this.debug('Plugin créé avec la config:', this.config);
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
        this.debug('Initialisation du plugin color');

        // Initialiser ColorFlow avec nos options
        this.colorHandler = new ColorFlow({
            customClass: this.config.customClass,
            presetColors: this.config.presetColors,
            debug: this.config.debug
        });

        // Configurer les cellules de couleur
        this.setupColorCells();
        
        // Configurer les écouteurs d'événements
        this.setupEventListeners();
        
        this.debug('Plugin color initialisé avec succès');
    }

    /**
     * Configure les cellules de couleur
     */
    setupColorCells() {
        if (!this.table?.table) return;

        const headerCells = this.table.table.querySelectorAll('th');
        const colorColumns = Array.from(headerCells)
            .filter(header => header.hasAttribute(this.config.colorAttribute))
            .map(header => ({
                id: header.id,
                index: Array.from(headerCells).indexOf(header)
            }));

        if (!colorColumns.length) return;

        const rows = this.table.table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            colorColumns.forEach(({id: columnId, index}) => {
                const cell = row.cells[index];
                if (!cell) return;

                if (cell.getAttribute('data-plugin') && cell.getAttribute('data-plugin') !== 'color') {
                    return;
                }

                this.setupColorCell(cell);
            });
        });
        
        this.debug(`${colorColumns.length} colonne(s) de couleur configurée(s)`);
    }

    /**
     * Configure une cellule de couleur
     * @param {HTMLTableCellElement} cell - Cellule à configurer
     */
    setupColorCell(cell) {
        // Marquer la cellule comme gérée par ce plugin
        cell.classList.add(this.config.cellClass);
        cell.setAttribute('data-plugin', 'color');

        // Récupérer la valeur actuelle
        let currentValue = cell.getAttribute('data-value');
        if (!currentValue) {
            currentValue = this.toHexColor(cell.textContent.trim()) || '#000000';
            cell.setAttribute('data-value', currentValue);
        }

        // Définir la valeur initiale si elle n'existe pas
        if (!cell.hasAttribute('data-initial-value')) {
            cell.setAttribute('data-initial-value', currentValue);
        }

        // Créer le wrapper pour le sélecteur de couleur
        const wrapper = document.createElement('div');
        wrapper.className = 'tf-color-wrapper';
        wrapper.setAttribute('data-wrapper', 'color');

        // Créer l'input de couleur
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'color-input';
        input.value = currentValue;
        input.setAttribute('cf-format', 'hex');
        
        // Ajouter l'attribut de couleur par défaut
        input.setAttribute('cf-default', currentValue);
        
        // Ajouter le support alpha si configuré
        if (this.config.alphaSupport) {
            input.setAttribute('cf-alpha', 'true');
        }

        // Ajouter l'input au wrapper
        wrapper.appendChild(input);
        
        // Vider la cellule et ajouter le wrapper
        cell.textContent = '';
        cell.appendChild(wrapper);

        // Initialiser le sélecteur de couleur avec un léger délai
        // pour s'assurer que le DOM est prêt
        setTimeout(() => {
            if (this.colorHandler) {
                this.colorHandler.setupInput(input);
                
                // Configurer les gestionnaires d'événements pour l'input
                this.setupColorInputEvents(input, cell);
            }
        }, 0);
        
        this.debug(`Cellule de couleur configurée:`, {
            cellId: cell.id,
            value: currentValue
        });
    }
    
    /**
     * Configure les gestionnaires d'événements pour l'input de couleur
     * @param {HTMLInputElement} input - Input de couleur
     * @param {HTMLTableCellElement} cell - Cellule contenant l'input
     */
    setupColorInputEvents(input, cell) {
        // Fonction de mise à jour de la valeur
        const updateValue = () => {
            const oldValue = cell.getAttribute('data-value');
            const newValue = input.value.toUpperCase();

            // Ne rien faire si la valeur n'a pas changé
            if (oldValue === newValue) return;

            // Mettre à jour la valeur
            cell.setAttribute('data-value', newValue);

            // Mettre à jour la preview
            const preview = input.previousElementSibling;
            if (preview && preview.classList.contains('color-preview')) {
                preview.style.backgroundColor = newValue;
            }

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
                    source: 'color',
                    tableId: this.table.table.id,
                    eventId: `color_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                },
                bubbles: true
            });
            this.table.table.dispatchEvent(changeEvent);
            
            // Appeler le callback si défini
            if (typeof this.config.onColorChange === 'function') {
                this.config.onColorChange({
                    cell,
                    oldValue,
                    newValue,
                    row
                });
            }
            
            this.debug('Couleur mise à jour:', {
                cellId: cell.id,
                oldValue,
                newValue
            });
        };

        // Écouter les deux types de changements
        input.addEventListener('input', updateValue);
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

            const input = cell.querySelector('input.color-input');
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

                const input = cell.querySelector('input.color-input');
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
            this.debug('Nouvelle ligne ajoutée, rafraîchissement des cellules de couleur');
            this.setupColorCells();
        });
    }

    /**
     * Vérifie si une cellule est gérée par ce plugin
     * @param {HTMLTableCellElement} cell - Cellule à vérifier
     * @returns {boolean} - True si la cellule est gérée par ce plugin
     */
    isManagedCell(cell) {
        return cell && (
            cell.getAttribute('data-plugin') === 'color' || 
            cell.classList.contains(this.config.cellClass)
        );
    }

    /**
     * Convertit une valeur de couleur en format hexadécimal
     * @param {string} color - Couleur à convertir
     * @returns {string} - Couleur au format hexadécimal (#RRGGBB)
     */
    toHexColor(color) {
        if (!color) return '#000000';
        
        // Utiliser la méthode de ColorFlow si disponible
        if (this.colorHandler && typeof this.colorHandler.toHexColor === 'function') {
            return this.colorHandler.toHexColor(color);
        }
        
        // Implémentation de secours
        if (color.startsWith('#')) {
            return color.toUpperCase();
        }

        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const computedColor = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);

        const rgb = computedColor.match(/\\d+/g);
        if (rgb) {
            const hex = '#' + rgb.map(x => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
            this.debug(`Conversion de couleur ${color} en hex ${hex}`);
            return hex.toUpperCase();
        }
        return '#000000';
    }

    /**
     * Rafraîchit le plugin
     */
    refresh() {
        this.debug('Rafraîchissement du plugin color');
        this.setupColorCells();
    }

    /**
     * Détruit le plugin et nettoie les ressources
     */
    destroy() {
        this.debug('Destruction du plugin color');
        
        // Nettoyer l'instance ColorFlow si elle existe
        if (this.colorHandler && typeof this.colorHandler.destroy === 'function') {
            this.colorHandler.destroy();
        }
    }
}