export default class EditPlugin {
    constructor(config = {}) {
        this.name = 'edit';
        this.version = '2.1.0';
        this.type = 'edit';
        this.table = null;
        this.dependencies = [];
        
        // Système de hooks pour extensions
        this.hooks = {
            beforeEdit: [],    // Avant de commencer l'édition
            afterEdit: [],     // Après avoir créé le champ d'édition
            beforeSave: [],    // Avant d'enregistrer les modifications
            afterSave: [],     // Après l'enregistrement
            onKeydown: [],     // Lors d'un événement clavier
            onRender: []       // Lors du rendu du contenu
        };
        
        // Configuration de base
        this.config = {
            editAttribute: 'th-edit',
            textareaAttribute: 'th-textarea', // Nouvel attribut pour les champs textarea
            cellClass: 'td-edit',
            readOnlyClass: 'readonly',
            inputClass: 'edit-input',
            textareaClass: 'edit-textarea', // Nouvelle classe pour les textarea
            modifiedClass: 'modified',
            textareaRows: 4, // Nombre de lignes par défaut pour les textarea
            textareaColumns: 40, // Nombre de colonnes par défaut pour les textarea
            debug: false
        };
        
        // Fusion avec la config fournie
        Object.assign(this.config, config);
        
        this.debug = this.config.debug ? 
            (...args) => console.log('[EditPlugin]', ...args) : 
            () => {};
    }

    init(tableHandler) {
        if (!tableHandler) {
            throw new Error('TableHandler instance is required');
        }
        this.table = tableHandler;
        
        // Configuration des cellules éditables
        this.setupEditCells();
        
        // Configuration des événements
        this.setupEventListeners();
        
        this.debug('Plugin initialized');
    }

    setupEditCells() {
        if (!this.table || !this.table.table) return;

        const headerCells = this.table.table.querySelectorAll('th');
        const editColumns = Array.from(headerCells)
            .filter(header => header.hasAttribute(this.config.editAttribute))
            .map(header => ({
                id: header.id,
                index: Array.from(headerCells).indexOf(header),
                isTextarea: header.hasAttribute(this.config.textareaAttribute)
            }));

        if (!editColumns.length) return;

        const rows = this.table.table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            editColumns.forEach(({id: columnId, index, isTextarea}) => {
                const cell = row.cells[index];
                if (!cell) return;

                // Ne pas réinitialiser si la cellule est déjà gérée par un autre plugin
                if (cell.getAttribute('data-plugin') && cell.getAttribute('data-plugin') !== 'edit') {
                    return;
                }

                cell.classList.add(this.config.cellClass);
                cell.setAttribute('data-plugin', 'edit');
                
                // Marquer les cellules qui utiliseront un textarea
                if (isTextarea) {
                    cell.setAttribute('data-edit-type', 'textarea');
                } else {
                    cell.setAttribute('data-edit-type', 'input');
                }

                // Ajouter le gestionnaire de double-clic s'il n'existe pas déjà
                if (!cell.hasAttribute('data-edit-initialized')) {
                    cell.addEventListener('dblclick', (e) => this.startEditing(e));
                    cell.setAttribute('data-edit-initialized', 'true');
                }

                // Récupérer la valeur actuelle
                let currentValue = cell.getAttribute('data-value');
                if (currentValue === null) {
                    currentValue = cell.textContent.trim();
                    cell.setAttribute('data-value', currentValue);
                }

                // Si pas de valeur initiale, la définir
                if (cell.getAttribute('data-initial-value') === null) {
                    cell.setAttribute('data-initial-value', currentValue);
                }
                
                // Point d'extension pour le rendu
                this.executeHook('onRender', cell, currentValue);
            });
        });
    }

    setupEventListeners() {
        if (!this.table || !this.table.table) {
            this.debug('Table not initialized');
            return;
        }

        this.debug('Setting up event listeners');

        // Écouter l'événement cell:saved
        this.table.table.addEventListener('cell:saved', (event) => {
            this.debug('cell:saved event received', event.detail);
            const cell = event.detail.cell;
            if (!cell || !cell.classList.contains(this.config.cellClass)) {
                this.debug('Cell not managed by edit plugin');
                return;
            }

            const currentValue = event.detail.value;
            cell.setAttribute('data-initial-value', currentValue);
            cell.setAttribute('data-value', currentValue);
            
            const wrapper = cell.querySelector('.cell-wrapper');
            
            // Utiliser le hook onRender pour le rendu personnalisé
            const renderResult = this.executeHook('onRender', cell, currentValue);
            
            if (wrapper) {
                // Si un hook a géré le rendu, on ne fait rien
                if (renderResult !== false) {
                    wrapper.innerHTML = currentValue;
                }
            } else {
                if (renderResult !== false) {
                    cell.innerHTML = currentValue;
                }
                if (this.table.initializeWrappers) {
                    this.table.initializeWrappers();
                }
            }
        });

        // Écouter l'événement row:saved
        this.table.table.addEventListener('row:saved', (event) => {
            this.debug('row:saved event received');
            const row = event.detail.row;
            if (!row) return;

            // Vérifier et mettre à jour toutes les cellules edit de la ligne
            Array.from(row.cells).forEach((cell) => {
                if (!cell.classList.contains(this.config.cellClass)) return;

                const currentValue = cell.getAttribute('data-value');
                
                // Mettre à jour la valeur initiale
                cell.setAttribute('data-initial-value', currentValue);

                const wrapper = cell.querySelector('.cell-wrapper');
                
                // Utiliser le hook onRender pour le rendu personnalisé
                const renderResult = this.executeHook('onRender', cell, currentValue);
                
                if (wrapper) {
                    if (renderResult !== false) {
                        wrapper.innerHTML = currentValue;
                    }
                } else {
                    if (renderResult !== false) {
                        cell.innerHTML = currentValue;
                    }
                    if (this.table.initializeWrappers) {
                        this.table.initializeWrappers();
                    }
                }
            });
        });

        // Écouter l'ajout de nouvelles lignes
        this.table.table.addEventListener('row:added', () => {
            this.debug('row:added event received');
            this.setupEditCells();
        });
    }

    startEditing(event) {
        const cell = event.target.closest('td');
        if (!cell || cell.querySelector('input') || cell.querySelector('textarea')) return;

        // Vérifier si la cellule est bien gérée par ce plugin
        if (cell.getAttribute('data-plugin') !== 'edit') {
            return;
        }

        // Vérifier si la cellule est en lecture seule
        if (cell.classList.contains(this.config.readOnlyClass)) {
            return;
        }

        const wrapper = cell.querySelector('.cell-wrapper') || cell;
        const currentValue = cell.getAttribute('data-value') || wrapper.textContent.trim();
        
        // Point d'extension important - permettre aux plugins d'empêcher l'édition
        if (this.executeHook('beforeEdit', cell, currentValue) === false) {
            this.debug('Editing prevented by a hook');
            return;
        }
        
        // Créer le champ d'édition
        this.createEditField(cell, wrapper, currentValue);
    }

    createEditField(cell, wrapper, currentValue) {
        let inputElement;
        const isTextarea = cell.getAttribute('data-edit-type') === 'textarea';
        
        if (isTextarea) {
            // Créer un textarea
            inputElement = document.createElement('textarea');
            inputElement.className = this.config.textareaClass;
            inputElement.rows = this.config.textareaRows;
            inputElement.cols = this.config.textareaColumns;
            inputElement.value = currentValue;
            
            // Ajuster la hauteur du textarea en fonction du contenu
            const lineCount = (currentValue.match(/\\n/g) || []).length + 1;
            if (lineCount > this.config.textareaRows) {
                inputElement.rows = Math.min(lineCount, this.config.textareaRows * 2);
            }
            
            this.debug('Creating textarea editor');
        } else {
            // Créer un input standard
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.className = this.config.inputClass;
            inputElement.value = currentValue;
            
            this.debug('Creating input editor');
        }
        
        // Vider le wrapper et ajouter l'élément d'édition
        wrapper.innerHTML = '';
        wrapper.appendChild(inputElement);
        
        // Focus et sélection
        inputElement.focus();
        if (!isTextarea) {
            inputElement.select();
        }
        
        // Ajout des événements de base
        inputElement.addEventListener('blur', () => this.finishEditing(cell, inputElement));
        inputElement.addEventListener('keydown', (e) => this.handleKeydown(e, cell, inputElement));
        
        // Point d'extension après création du champ d'édition
        this.executeHook('afterEdit', cell, inputElement, currentValue);
        
        return inputElement;
    }

    handleKeydown(event, cell, input) {
        // Point d'extension pour le plugin clavier
        if (this.executeHook('onKeydown', event, cell, input) === false) {
            return;
        }
        
        const isTextarea = input.tagName.toLowerCase() === 'textarea';
        
        // Gestion standard des touches
        if (event.key === 'Enter' && !isTextarea) {
            // Pour les inputs, Enter valide l'édition
            this.finishEditing(cell, input);
            event.preventDefault();
        } else if (event.key === 'Enter' && isTextarea && event.ctrlKey) {
            // Pour les textareas, Ctrl+Enter valide l'édition
            this.finishEditing(cell, input);
            event.preventDefault();
        } else if (event.key === 'Escape') {
            this.cancelEditing(cell);
            event.preventDefault();
        }
    }

    finishEditing(cell, input) {
        const newValue = input.value.trim();
        const oldValue = cell.getAttribute('data-value');
        
        // Point d'extension avant sauvegarde
        if (this.executeHook('beforeSave', cell, newValue, oldValue) === false) {
            this.debug('Save prevented by a hook');
            this.cancelEditing(cell);
            return;
        }
        
        // Mise à jour de la valeur
        cell.setAttribute('data-value', newValue);
        
        // Mise à jour du contenu
        const wrapper = cell.querySelector('.cell-wrapper') || cell;
        
        // Utiliser le hook onRender pour personnaliser le rendu
        const renderResult = this.executeHook('onRender', cell, newValue);
        
        if (renderResult !== false) {
            if (wrapper === cell) {
                cell.innerHTML = newValue;
                if (this.table.initializeWrappers) {
                    this.table.initializeWrappers();
                }
            } else {
                wrapper.innerHTML = newValue;
            }
        }
        
        // Marquer la ligne comme modifiée si la valeur a changé
        const row = cell.closest('tr');
        const initialValue = cell.getAttribute('data-initial-value');
        if (newValue !== initialValue && row) {
            row.classList.add(this.config.modifiedClass);
        }
        
        // Déclencher l'événement de changement
        this.triggerChangeEvent(cell, newValue, oldValue);
        
        // Point d'extension après sauvegarde
        this.executeHook('afterSave', cell, newValue, oldValue);
    }

    cancelEditing(cell) {
        const originalValue = cell.getAttribute('data-value');
        const wrapper = cell.querySelector('.cell-wrapper') || cell;
        
        // Utiliser le hook onRender pour le rendu personnalisé
        const renderResult = this.executeHook('onRender', cell, originalValue);
        
        if (renderResult !== false) {
            wrapper.innerHTML = originalValue;
        }
    }

    triggerChangeEvent(cell, newValue, oldValue) {
        const row = cell.closest('tr');
        const changeEvent = new CustomEvent('cell:change', {
            detail: {
                cellId: cell.id,
                columnId: cell.id.split('_')[0],
                rowId: row ? row.id : null,
                value: newValue,
                oldValue: oldValue,
                cell: cell,
                source: 'edit',
                tableId: this.table.table.id
            },
            bubbles: false
        });
        
        this.table.table.dispatchEvent(changeEvent);
    }

    // Méthodes pour gérer les hooks
    addHook(hookName, callback) {
        if (!this.hooks[hookName]) {
            this.hooks[hookName] = [];
        }
        
        this.hooks[hookName].push(callback);
        return this;
    }

    executeHook(hookName, ...args) {
        if (!this.hooks[hookName] || !this.hooks[hookName].length) {
            return true;
        }
        
        for (const callback of this.hooks[hookName]) {
            try {
                const result = callback(...args);
                // Si un hook retourne explicitement false, on arrête l'exécution
                if (result === false) return false;
            } catch (error) {
                console.error(`Error executing hook ${hookName}:`, error);
            }
        }
        
        return true;
    }

    refresh() {
        this.setupEditCells();
    }

    destroy() {
        // Nettoyage des événements et des références
        if (this.table?.table) {
            const editCells = this.table.table.querySelectorAll('.' + this.config.cellClass);
            editCells.forEach(cell => {
                if (cell.hasAttribute('data-edit-initialized')) {
                    cell.removeEventListener('dblclick', (e) => this.startEditing(e));
                    cell.removeAttribute('data-edit-initialized');
                }
            });
        }
        
        // Vider les hooks
        Object.keys(this.hooks).forEach(key => {
            this.hooks[key] = [];
        });
    }
}