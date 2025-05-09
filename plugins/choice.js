/**
 * Plugin Choice pour TableFlow
 * Permet de gérer des sélections de valeurs avec deux modes :
 * - toggle : basculement direct entre les options par clic
 * - searchable : recherche et sélection dans une liste déroulante avec support AJAX
 */
export default class ChoicePlugin {
    constructor(config = {}) {
        this.name = 'choice';
        this.version = '3.0.0';  // Mise à jour de la version
        this.type = 'edit';
        this.table = null;
        this.dependencies = [];
        this.activeDropdown = null;
        this.debounceTimers = new Map(); // Pour stocker les timers de debounce

        // Configuration par défaut pour le mode searchable
        this.defaultSearchableConfig = {
            minWidth: '200px',
            dropdownClass: 'choice-dropdown',
            optionClass: 'choice-option',
            searchClass: 'choice-search',
            placeholder: 'Rechercher...',
            noResultsText: 'Aucun résultat',
            loadingText: 'Chargement...'
        };

        // Configuration unifiée
        this.config = {
            // Configuration de base
            choiceAttribute: 'th-choice',
            cellClass: 'choice-cell',
            readOnlyClass: 'readonly',
            modifiedClass: 'modified',
            debug: false,

            // Options pour chaque colonne
            columns: {}
        };

        // Fusionner avec la config fournie
        Object.assign(this.config, config);

        // Configurer le debug
        this.debug = this.config.debug ?
            (...args) => console.log('[ChoicePlugin]', ...args) :
            () => { };

        // Ajouter les styles CSS
        this.addStyles();

        // Lier les méthodes pour préserver le contexte
        this.handleClick = this.handleClick.bind(this);
        this.handleToggleClick = this.handleToggleClick.bind(this);
        this.handleSearchableClick = this.handleSearchableClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    getColumnConfig(columnId) {
        const columnConfig = this.config.columns[columnId];
        if (!columnConfig) return null;

        // Si c'est un tableau (ancienne syntaxe), le convertir en objet
        if (Array.isArray(columnConfig)) {
            return {
                type: 'toggle',
                values: columnConfig
            };
        }

        // Convertir les valeurs readOnly en readOnlyValues si nécessaire
        if (columnConfig.values) {
            const readOnlyValues = [];
            columnConfig.values = columnConfig.values.map(value => {
                if (typeof value === 'object' && value.readOnly) {
                    readOnlyValues.push({
                        value: value.value,
                        class: value.readOnlyClass || value.class || 'readonly-locked'
                    });
                    // Créer une nouvelle copie sans les propriétés readOnly
                    const { readOnly, readOnlyClass, ...cleanValue } = value;
                    return cleanValue;
                }
                return value;
            });

            // Fusionner avec les readOnlyValues existants
            if (readOnlyValues.length > 0) {
                columnConfig.readOnlyValues = [
                    ...(columnConfig.readOnlyValues || []),
                    ...readOnlyValues
                ];
            }
        }

        // Configuration par défaut pour AJAX
        const defaultAjaxConfig = {
            enabled: false,
            url: null,
            method: 'GET',
            headers: {},
            minChars: 3,
            debounceTime: 300,
            paramName: 'query',
            responseParser: null,
            extraParams: {}
        };

        // Configuration par défaut pour l'auto-remplissage
        const defaultAutoFillConfig = {
            enabled: false,
            mappings: {}
        };

        return {
            type: columnConfig.type || 'toggle',
            values: columnConfig.values || [],
            readOnlyValues: columnConfig.readOnlyValues || [],
            searchable: {
                ...this.defaultSearchableConfig,
                ...(columnConfig.searchable || {})
            },
            ajax: {
                ...defaultAjaxConfig,
                ...(columnConfig.ajax || {})
            },
            autoFill: {
                ...defaultAutoFillConfig,
                ...(columnConfig.autoFill || {})
            }
        };
    }

    createSearchableDropdown(cell, choices, columnId) {
        const dropdown = document.createElement('div');
        const columnConfig = this.getColumnConfig(columnId);
        const searchableConfig = columnConfig.searchable || this.defaultSearchableConfig;
        const ajaxConfig = columnConfig.ajax || {};

        dropdown.className = searchableConfig.dropdownClass || this.defaultSearchableConfig.dropdownClass;
        dropdown.style.minWidth = searchableConfig.minWidth || this.defaultSearchableConfig.minWidth;

        // Ajouter la barre de recherche
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = searchableConfig.searchClass || this.defaultSearchableConfig.searchClass;
        searchInput.placeholder = searchableConfig.placeholder || this.defaultSearchableConfig.placeholder;
        dropdown.appendChild(searchInput);

        // Conteneur pour les options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';
        dropdown.appendChild(optionsContainer);

        // Afficher les options initiales si disponibles et si AJAX n'est pas activé
        if (choices && choices.length && (!ajaxConfig.enabled || ajaxConfig.loadInitialOptions)) {
            this.renderSearchableOptions(optionsContainer, choices, cell, columnId);
        }

        // Variable pour stocker l'ID du timer de debounce
        const debounceKey = `${columnId}_${cell.id}`;

        // Gestionnaire de recherche
        searchInput.addEventListener('input', () => {
            const searchText = searchInput.value.toLowerCase();
            
            // Effacer le timer précédent
            if (this.debounceTimers.has(debounceKey)) {
                clearTimeout(this.debounceTimers.get(debounceKey));
            }
            
            // Si AJAX est activé et qu'on a assez de caractères
            if (ajaxConfig.enabled && searchText.length >= (ajaxConfig.minChars || 3)) {
                // Afficher un indicateur de chargement
                optionsContainer.innerHTML = `<div class="loading">${searchableConfig.loadingText || 'Chargement...'}</div>`;
                
                // Attendre avant d'envoyer la requête
                const timerId = setTimeout(() => {
                    this.fetchOptionsFromAjax(searchText, columnId)
                        .then(results => {
                            this.renderSearchableOptions(optionsContainer, results, cell, columnId);
                        })
                        .catch(error => {
                            this.debug('Erreur lors de la recherche AJAX:', error);
                            optionsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
                        });
                }, ajaxConfig.debounceTime || 300);
                
                this.debounceTimers.set(debounceKey, timerId);
            } 
            // Sinon, filtrer les options locales
            else if (choices && choices.length) {
                const filteredChoices = choices.filter(choice => {
                    const label = typeof choice === 'object' ? choice.label : choice;
                    return label.toLowerCase().includes(searchText);
                });
                this.renderSearchableOptions(optionsContainer, filteredChoices, cell, columnId);
            }
        });

        return dropdown;
    }

    async fetchOptionsFromAjax(query, columnId) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig || !columnConfig.ajax || !columnConfig.ajax.enabled) {
            return [];
        }
        
        const ajaxConfig = columnConfig.ajax;
        if (!ajaxConfig.url) {
            this.debug('URL AJAX non définie pour la colonne', columnId);
            return [];
        }
        
        try {
            // Construire l'URL avec les paramètres
            const url = new URL(ajaxConfig.url, window.location.origin);
            
            // Ajouter le terme de recherche
            url.searchParams.append(ajaxConfig.paramName || 'query', query);
            
            // Ajouter les paramètres supplémentaires
            if (ajaxConfig.extraParams) {
                Object.entries(ajaxConfig.extraParams).forEach(([key, value]) => {
                    url.searchParams.append(key, value);
                });
            }
            
            // Effectuer la requête
            const response = await fetch(url, {
                method: ajaxConfig.method || 'GET',
                headers: ajaxConfig.headers || {},
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Parser la réponse si une fonction de parsing est définie
            if (typeof ajaxConfig.responseParser === 'function') {
                return ajaxConfig.responseParser(data);
            }
            
            // Format par défaut attendu: tableau d'objets avec value et label
            return data;
        } catch (error) {
            this.debug('Erreur lors de la récupération des options:', error);
            throw error;
        }
    }

    renderSearchableOptions(container, choices, cell, columnId) {
        container.innerHTML = '';
        const columnConfig = this.getColumnConfig(columnId);
        const searchableConfig = columnConfig.searchable || this.defaultSearchableConfig;

        if (!choices || !choices.length) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = searchableConfig.noResultsText || this.defaultSearchableConfig.noResultsText;
            container.appendChild(noResults);
            return;
        }

        choices.forEach(choice => {
            // Extraire les valeurs et les données additionnelles
            const value = typeof choice === 'object' ? choice.value : choice;
            const label = typeof choice === 'object' ? choice.label : choice;
            
            // Récupérer toutes les données additionnelles (pour l'auto-remplissage)
            const additionalData = typeof choice === 'object' ? { ...choice } : {};
            delete additionalData.value;
            delete additionalData.label;

            // Ne pas afficher les options en lecture seule
            if (this.isReadOnly(columnId, value)) {
                return;
            }

            const optionElement = document.createElement('div');
            optionElement.className = searchableConfig.optionClass || this.defaultSearchableConfig.optionClass;
            optionElement.innerHTML = label;

            optionElement.addEventListener('click', () => {
                this.updateCellValue(cell, value, label, columnId, additionalData);
                this.closeAllDropdowns();
            });

            container.appendChild(optionElement);
        });
    }

    isReadOnly(columnId, value, cell) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return false;

        // Vérifier dans readOnlyValues
        if (columnConfig.readOnlyValues?.length) {
            const readOnlyConfig = columnConfig.readOnlyValues.find(config => config.value === value);
            if (readOnlyConfig) {
                if (cell && readOnlyConfig.class) {
                    cell.classList.add(readOnlyConfig.class);
                }
                return true;
            }
        }

        return false;
    }

    addStyles() {
        if (!document.getElementById('choice-plugin-styles')) {
            const style = document.createElement('style');
            style.id = 'choice-plugin-styles';
            style.textContent = `
                .${this.config.cellClass} {
                    cursor: pointer;
                    position: relative;
                }
                .${this.defaultSearchableConfig.dropdownClass} {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    z-index: 1000;
                    display: none;
                    min-width: ${this.defaultSearchableConfig.minWidth};
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: auto;
                    max-height: 200px;
                }
                .${this.defaultSearchableConfig.dropdownClass}.active {
                    display: block;
                }
                .${this.defaultSearchableConfig.searchClass} {
                    width: 100%;
                    padding: 8px;
                    border: none;
                    border-bottom: 1px solid #ddd;
                    outline: none;
                    box-sizing: border-box;
                }
                .${this.defaultSearchableConfig.optionClass} {
                    padding: 8px;
                    cursor: pointer;
                }
                .${this.defaultSearchableConfig.optionClass}:hover {
                    background-color: #f5f5f5;
                }
                .no-results, .loading, .error {
                    padding: 8px;
                    color: #999;
                    font-style: italic;
                    text-align: center;
                }
                .error {
                    color: #e74c3c;
                }
            `;
            document.head.appendChild(style);
        }
    }

    init(tableHandler) {
        if (!tableHandler) {
            throw new Error('TableHandler instance is required');
        }
        this.table = tableHandler;
        this.debug('Initializing choice plugin');

        this.setupChoiceCells();
        this.setupEventListeners();
    }

    setupChoiceCells() {
        if (!this.table?.table) return;

        const headerCells = this.table.table.querySelectorAll('th');
        const choiceColumns = Array.from(headerCells)
            .filter(header => header.hasAttribute(this.config.choiceAttribute))
            .map(header => {
                const columnId = header.id;
                const columnConfig = this.getColumnConfig(columnId);
                const headerType = header.getAttribute(this.config.choiceAttribute);

                return {
                    id: columnId,
                    index: Array.from(headerCells).indexOf(header),
                    type: headerType || (columnConfig ? columnConfig.type : 'toggle')
                };
            });

        if (!choiceColumns.length) return;

        const rows = this.table.table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            choiceColumns.forEach(({ id: columnId, index, type }) => {
                const cell = row.cells[index];
                if (!cell) return;

                if (cell.getAttribute('data-plugin') && cell.getAttribute('data-plugin') !== 'choice') {
                    return;
                }

                this.setupChoiceCell(cell, columnId, type);
            });
        });
    }

    setupChoiceCell(cell, columnId, type) {
        cell.classList.add(this.config.cellClass);
        cell.setAttribute('data-plugin', 'choice');
        cell.setAttribute('data-choice-type', type);
        cell.setAttribute('data-choice-column', columnId);

        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const choices = columnConfig.values;
        if (!choices || !choices.length) return;

        // Récupérer la valeur actuelle
        let currentValue = cell.getAttribute('data-value');
        if (currentValue === null) {
            currentValue = cell.textContent.trim();
            cell.setAttribute('data-value', currentValue);
        }

        // Définir la valeur initiale si elle n'existe pas
        if (!cell.hasAttribute('data-initial-value')) {
            cell.setAttribute('data-initial-value', currentValue);
        }

        // Trouver et afficher la valeur actuelle
        const currentChoice = choices.find(c =>
            (typeof c === 'object' ? c.value : c) === currentValue
        );

        if (currentChoice) {
            const label = typeof currentChoice === 'object' ? currentChoice.label : currentChoice;
            const wrapper = cell.querySelector('.cell-wrapper') || document.createElement('div');
            wrapper.className = 'cell-wrapper';
            wrapper.innerHTML = label;
            if (!wrapper.parentNode) {
                cell.textContent = '';
                cell.appendChild(wrapper);
            }
        }
    }

    setupEventListeners() {
        if (!this.table?.table) return;

        // Gestionnaire de clic sur les cellules
        this.table.table.addEventListener('click', this.handleClick);

        // Fermer le dropdown quand on clique ailleurs
        document.addEventListener('click', this.handleDocumentClick);

        // Écouter l'événement cell:saved
        this.table.table.addEventListener('cell:saved', (event) => {
            const cell = event.detail.cell;
            if (!cell || !this.isManagedCell(cell)) return;

            const currentValue = cell.getAttribute('data-value');
            cell.setAttribute('data-initial-value', currentValue);

            // Mettre à jour le label si nécessaire
            const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
            const columnConfig = this.getColumnConfig(columnId);
            if (columnConfig) {
                const currentChoice = columnConfig.values.find(c =>
                    (typeof c === 'object' ? c.value : c) === currentValue
                );
                if (currentChoice) {
                    const label = typeof currentChoice === 'object' ? currentChoice.label : currentChoice;
                    const wrapper = cell.querySelector('.cell-wrapper');
                    if (wrapper) {
                        wrapper.innerHTML = label;
                    }
                }
            }
        });

        // Écouter l'événement row:saved
        this.table.table.addEventListener('row:saved', (event) => {
            const row = event.detail.row;
            if (!row) return;

            Array.from(row.cells).forEach(cell => {
                if (!this.isManagedCell(cell)) return;

                const currentValue = cell.getAttribute('data-value');
                cell.setAttribute('data-initial-value', currentValue);
            });

            row.classList.remove(this.config.modifiedClass);
        });

        // Écouter l'ajout de nouvelles lignes
        this.table.table.addEventListener('row:added', () => {
            this.debug('row:added event received');
            this.setupChoiceCells();
        });
    }

    handleDocumentClick(event) {
        if (!event.target.closest(`.${this.config.cellClass}`) && 
            !event.target.closest(`.${this.defaultSearchableConfig.dropdownClass}`)) {
            this.closeAllDropdowns();
        }
    }

    handleClick(event) {
        const cell = event.target.closest('td');
        if (!cell || !this.isManagedCell(cell)) return;

        // Vérifier si la cellule est en lecture seule
        if (cell.classList.contains(this.config.readOnlyClass)) return;

        const type = cell.getAttribute('data-choice-type') || 'toggle';

        if (type === 'toggle') {
            this.handleToggleClick(cell);
        } else if (type === 'searchable') {
            this.handleSearchableClick(cell);
        }
    }

    handleToggleClick(cell) {
        const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const choices = columnConfig.values;
        if (!choices || !choices.length) return;

        // Filtrer les choix pour exclure ceux en readOnly
        const availableChoices = choices.filter(choice => {
            const value = typeof choice === 'object' ? choice.value : choice;
            return !this.isReadOnly(columnId, value);
        });

        if (!availableChoices.length) return;

        // Obtenir la valeur actuelle
        const currentValue = cell.getAttribute('data-value');

        // Trouver l'index du choix actuel
        const currentIndex = availableChoices.findIndex(choice =>
            (typeof choice === 'object' ? choice.value : choice) === currentValue
        );

        // Obtenir le prochain choix
        const nextChoice = availableChoices[(currentIndex + 1) % availableChoices.length];
        const nextValue = typeof nextChoice === 'object' ? nextChoice.value : nextChoice;
        const nextLabel = typeof nextChoice === 'object' ? nextChoice.label : nextChoice;

        // Retirer toutes les classes de lecture seule précédentes
        if (columnConfig.readOnlyValues) {
            columnConfig.readOnlyValues.forEach(config => {
                if (config.class) {
                    cell.classList.remove(config.class);
                }
            });
        }

        // Extraire les données additionnelles pour l'auto-remplissage
        const additionalData = typeof nextChoice === 'object' ? { ...nextChoice } : {};
        delete additionalData.value;
        delete additionalData.label;

        this.updateCellValue(cell, nextValue, nextLabel, columnId, additionalData);
    }

    handleSearchableClick(cell) {
        const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        // Fermer les autres dropdowns
        this.closeAllDropdowns();

        // Si le dropdown est déjà ouvert pour cette cellule, le fermer
        if (cell.querySelector(`.${this.defaultSearchableConfig.dropdownClass}`)) {
            this.closeAllDropdowns();
            return;
        }

        // Créer et afficher le dropdown
        const choices = columnConfig.values || [];
        const dropdown = this.createSearchableDropdown(cell, choices, columnId);
        cell.appendChild(dropdown);
        dropdown.classList.add('active');
        this.activeDropdown = dropdown;

        // Focus sur la recherche
        const searchInput = dropdown.querySelector(`.${this.defaultSearchableConfig.searchClass}`);
        if (searchInput) {
            searchInput.focus();
        }

        // Si AJAX est activé et loadOnFocus est true, charger les options
        if (columnConfig.ajax && columnConfig.ajax.enabled && columnConfig.ajax.loadOnFocus) {
            const optionsContainer = dropdown.querySelector('.options-container');
            optionsContainer.innerHTML = `<div class="loading">${columnConfig.searchable.loadingText || 'Chargement...'}</div>`;
            
            this.fetchOptionsFromAjax('', columnId)
                .then(results => {
                    this.renderSearchableOptions(optionsContainer, results, cell, columnId);
                })
                .catch(error => {
                    this.debug('Erreur lors du chargement initial AJAX:', error);
                    optionsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
                });
        }
    }

    updateCellValue(cell, value, label, columnId, additionalData = {}) {
        // Mettre à jour la cellule
        cell.setAttribute('data-value', value);

        // Rechercher ou créer un wrapper
        let wrapper = cell.querySelector('.cell-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'cell-wrapper';
            cell.textContent = '';
            cell.appendChild(wrapper);
        }

        wrapper.innerHTML = label;

        // S'assurer que data-initial-value existe
        if (!cell.hasAttribute('data-initial-value')) {
            cell.setAttribute('data-initial-value', value);
        }

        // Marquer comme modifié si nécessaire
        const initialValue = cell.getAttribute('data-initial-value');
        const isModified = value !== initialValue;
        const row = cell.closest('tr');

        // Gérer l'auto-remplissage si configuré
        const columnConfig = this.getColumnConfig(columnId);
        if (columnConfig && columnConfig.autoFill && columnConfig.autoFill.enabled && row) {
            const mappings = columnConfig.autoFill.mappings || {};
            
            // Pour chaque mapping défini
            Object.entries(mappings).forEach(([sourceField, targetColumnId]) => {
                // Récupérer la valeur à partir des données additionnelles
                const fillValue = additionalData[sourceField];
                if (fillValue !== undefined) {
                    // Trouver la cellule cible dans la même ligne
                    const targetCell = row.querySelector(`td[id^="${targetColumnId}_"]`);
                    if (targetCell) {
                        // Mettre à jour la valeur de la cellule cible
                        targetCell.setAttribute('data-value', fillValue);
                        
                        // Mettre à jour l'affichage si nécessaire
                        const targetWrapper = targetCell.querySelector('.cell-wrapper');
                        if (targetWrapper) {
                            targetWrapper.textContent = fillValue;
                        } else {
                            targetCell.textContent = fillValue;
                        }
                        
                        // Déclencher un événement de changement pour cette cellule
                        const targetEvent = new CustomEvent('cell:change', {
                            detail: {
                                cell: targetCell,
                                value: fillValue,
                                columnId: targetColumnId,
                                rowId: row.id,
                                source: 'choice-autofill',
                                tableId: this.table.table.id,
                                isModified: true
                            },
                            bubbles: true
                        });
                        this.table.table.dispatchEvent(targetEvent);
                    }
                }
            });
        }

        // Créer l'événement avec bubbles:true pour permettre sa propagation
        const changeEvent = new CustomEvent('cell:change', {
            detail: {
                cell,
                value,
                columnId,
                rowId: row?.id,
                source: 'choice',
                tableId: this.table.table.id,
                isModified
            },
            bubbles: true
        });

        // Dispatcher l'événement sur la table
        this.table.table.dispatchEvent(changeEvent);

        // Mettre à jour la classe modified sur la ligne
        if (isModified && row) {
            row.classList.add(this.config.modifiedClass);
        } else if (!isModified && row) {
            // Vérifier si d'autres cellules sont modifiées avant de retirer la classe
            const otherModifiedCells = Array.from(row.cells).some(otherCell => {
                if (otherCell === cell) return false;
                const otherInitialValue = otherCell.getAttribute('data-initial-value');
                const otherCurrentValue = otherCell.getAttribute('data-value');
                return otherInitialValue !== otherCurrentValue;
            });
            
            if (!otherModifiedCells) {
                row.classList.remove(this.config.modifiedClass);
            }
        }
    }

    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll(`.${this.defaultSearchableConfig.dropdownClass}.active`);
        dropdowns.forEach(dropdown => {
            dropdown.remove();
        });
        this.activeDropdown = null;
    }

    isManagedCell(cell) {
        return cell?.classList.contains(this.config.cellClass);
    }

    refresh() {
        this.setupChoiceCells();
    }

    destroy() {
        if (this.table?.table) {
            this.table.table.removeEventListener('click', this.handleClick);
        }
        document.removeEventListener('click', this.handleDocumentClick);
        this.closeAllDropdowns();
        
        // Nettoyer les timers de debounce
        this.debounceTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.debounceTimers.clear();
    }
}