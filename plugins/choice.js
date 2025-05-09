/**
 * Plugin Choice pour TableFlow
 * Permet de gérer des sélections de valeurs avec trois modes :
 * - toggle : basculement direct entre les options par clic
 * - searchable : recherche et sélection dans une liste déroulante avec support AJAX
 * - multiple : sélection de plusieurs valeurs avec tags et support pour les valeurs personnalisées
 */
export default class ChoicePlugin {
    constructor(config = {}) {
        this.name = 'choice';
        this.version = '3.2.0';  // Mise à jour de la version
        this.type = 'edit';
        this.table = null;
        this.dependencies = [];
        this.activeDropdown = null;
        this.debounceTimers = new Map(); // Pour stocker les timers de debounce
        this.ajaxRequests = new Map(); // Pour stocker les requêtes AJAX en cours

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

        // Configuration par défaut pour le mode multiple
        this.defaultMultipleConfig = {
            separator: ',',
            tagClass: 'choice-tag',
            tagContainerClass: 'choice-tags',
            removeTagClass: 'choice-tag-remove',
            placeholder: 'Sélectionner des options...',
            maxTags: null, // null = illimité
            allowCustomValues: true, // Autoriser l'ajout de valeurs personnalisées
            customValueClass: 'custom-value' // Classe CSS pour les valeurs personnalisées
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
            extraParams: {},
            loadOnFocus: false,
            abortPrevious: true // Annuler les requêtes précédentes
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
            isReadOnly: columnConfig.isReadOnly || null, // Fonction pour déterminer si une cellule est en lecture seule
            searchable: {
                ...this.defaultSearchableConfig,
                ...(columnConfig.searchable || {})
            },
            multiple: {
                ...this.defaultMultipleConfig,
                ...(columnConfig.multiple || {})
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

            // Si AJAX est activé et qu'on a assez de caractères ou si loadOnFocus est activé et le champ est vide
            if (ajaxConfig.enabled &&
                (searchText.length >= (ajaxConfig.minChars || 3) ||
                    (ajaxConfig.loadOnFocus && searchText.length === 0))) {

                // Afficher un indicateur de chargement
                optionsContainer.innerHTML = `<div class="loading">${searchableConfig.loadingText || 'Chargement...'}</div>`;

                // Attendre avant d'envoyer la requête
                const timerId = setTimeout(() => {
                    this.fetchOptionsFromAjax(searchText, columnId)
                        .then(results => {
                            this.renderSearchableOptions(optionsContainer, results, cell, columnId);
                        })
                        .catch(error => {
                            // Ne pas afficher d'erreur si la requête a été annulée intentionnellement
                            if (error.name !== 'AbortError') {
                                this.debug('Erreur lors de la recherche AJAX:', error);
                                optionsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
                            }
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
            // Annuler la requête précédente si elle existe et si abortPrevious est activé
            if (ajaxConfig.abortPrevious && this.ajaxRequests.has(columnId)) {
                this.debug(`Annulation de la requête AJAX précédente pour ${columnId}`);
                this.ajaxRequests.get(columnId).abort();
            }

            // Créer un contrôleur d'annulation pour cette requête
            const controller = new AbortController();
            const signal = controller.signal;

            // Stocker le contrôleur pour pouvoir annuler la requête plus tard
            this.ajaxRequests.set(columnId, controller);

            // Construire l'URL avec les paramètres
            let finalUrl;

            try {
                // Vérifier si l'URL est relative ou absolue
                if (ajaxConfig.url.startsWith('http://') || ajaxConfig.url.startsWith('https://')) {
                    finalUrl = new URL(ajaxConfig.url);
                } else {
                    // Pour les URLs relatives, on doit gérer plusieurs cas
                    let baseUrl = window.location.origin;

                    // Si l'URL commence par un slash, on l'ajoute directement à l'origine
                    if (ajaxConfig.url.startsWith('/')) {
                        finalUrl = new URL(ajaxConfig.url, baseUrl);
                    } else {
                        // Si l'URL ne commence pas par un slash, on doit la résoudre par rapport au chemin actuel
                        // Récupérer le chemin de base de la page actuelle (sans le nom de fichier)
                        const currentPath = window.location.pathname;
                        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

                        // Construire l'URL complète
                        finalUrl = new URL(basePath + ajaxConfig.url, baseUrl);
                    }
                }
            } catch (urlError) {
                this.debug('Erreur lors de la construction de l\'URL:', urlError);
                // Fallback: essayer de construire une URL relative simple
                try {
                    finalUrl = new URL(ajaxConfig.url, window.location.href);
                } catch (fallbackError) {
                    this.debug('Erreur lors de la construction de l\'URL de fallback:', fallbackError);
                    throw new Error(`Impossible de construire une URL valide à partir de ${ajaxConfig.url}`);
                }
            }

            // Ajouter le terme de recherche
            finalUrl.searchParams.append(ajaxConfig.paramName || 'query', query);

            // Ajouter les paramètres supplémentaires
            if (ajaxConfig.extraParams) {
                Object.entries(ajaxConfig.extraParams).forEach(([key, value]) => {
                    finalUrl.searchParams.append(key, value);
                });
            }

            this.debug(`Requête AJAX pour ${columnId} vers ${finalUrl.toString()}`);

            // Effectuer la requête avec le signal d'annulation
            const response = await fetch(finalUrl, {
                method: ajaxConfig.method || 'GET',
                headers: ajaxConfig.headers || {},
                cache: 'no-cache',
                signal: signal
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            // Nettoyer la référence à la requête terminée
            this.ajaxRequests.delete(columnId);

            // Parser la réponse si une fonction de parsing est définie
            if (typeof ajaxConfig.responseParser === 'function') {
                return ajaxConfig.responseParser(data);
            }

            // Format par défaut attendu: tableau d'objets avec value et label
            return data;
        } catch (error) {
            // Ne pas afficher d'erreur si la requête a été annulée intentionnellement
            if (error.name === 'AbortError') {
                this.debug(`Requête AJAX pour ${columnId} annulée`);
                return [];
            }

            this.debug('Erreur lors de la récupération des options:', error);
            throw error;
        } finally {
            // S'assurer que la référence est nettoyée même en cas d'erreur
            if (this.ajaxRequests.has(columnId)) {
                this.ajaxRequests.delete(columnId);
            }
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

        // Vérifier avec la fonction isReadOnly si elle existe
        if (typeof columnConfig.isReadOnly === 'function' && cell) {
            const row = cell.closest('tr');
            if (row) {
                // Récupérer les données de la ligne pour la fonction isReadOnly
                const rowData = this.getRowData(row);

                // Appeler la fonction isReadOnly avec la valeur et les données de la ligne
                const isReadOnlyResult = columnConfig.isReadOnly(value, rowData);

                if (isReadOnlyResult) {
                    cell.classList.add(this.config.readOnlyClass);
                    return true;
                }
            }
        }

        return false;
    }

    // Nouvelle méthode pour récupérer les données d'une ligne (similaire à celle d'ActionsPlugin)
    getRowData(row) {
        if (!row || !this.table?.table) return {};

        const data = {};

        // Ajouter l'ID de ligne s'il existe
        if (row.id) {
            data.id = row.id;
        }

        // Récupérer les données de chaque cellule
        Array.from(row.cells).forEach((cell, index) => {
            const header = this.table.table.querySelector(`thead th:nth-child(${index + 1})`);
            if (!header?.id) return;

            let value = cell.getAttribute('data-value');
            if (value === null) {
                const wrapper = cell.querySelector('.cell-wrapper');
                value = wrapper ? wrapper.textContent.trim() : cell.textContent.trim();
            }

            // Conversion des types
            if (!isNaN(value) && value !== '') {
                data[header.id] = Number(value);
            } else if (value === 'true' || value === 'false') {
                data[header.id] = value === 'true';
            } else {
                data[header.id] = value;
            }
        });

        return data;
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
                .${this.config.cellClass}.${this.config.readOnlyClass} {
                    cursor: not-allowed;
                    opacity: 0.8;
                    background-color: #f8f8f8;
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

                /* Styles pour le mode multiple */
                .${this.defaultMultipleConfig.tagContainerClass} {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    padding: 2px;
                }
                .${this.defaultMultipleConfig.tagClass} {
                    display: inline-flex;
                    align-items: center;
                    background-color: #e9f5fe;
                    border: 1px solid #c5e2fa;
                    border-radius: 3px;
                    padding: 2px 6px;
                    margin: 2px;
                    font-size: 0.9em;
                }
                .${this.defaultMultipleConfig.removeTagClass} {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 4px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: #c5e2fa;
                    color: #4a90e2;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: bold;
                }
                .${this.defaultMultipleConfig.removeTagClass}:hover {
                    background-color: #4a90e2;
                    color: white;
                }
                .multiple-selected {
                    background-color: #e9f5fe;
                }
                .multiple-option-checkbox {
                    margin-right: 8px;
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

        // Vérifier si la cellule doit être en lecture seule
        const row = cell.closest('tr');
        if (row && typeof columnConfig.isReadOnly === 'function') {
            const rowData = this.getRowData(row);
            if (columnConfig.isReadOnly(currentValue, rowData)) {
                cell.classList.add(this.config.readOnlyClass);
            }
        }

        // Traitement spécifique selon le type
        if (type === 'multiple') {
            this.setupMultipleCell(cell, columnId, currentValue);
        } else {
            // Pour les types toggle et searchable
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
    }

    // Nouvelle méthode pour configurer une cellule de type multiple
    setupMultipleCell(cell, columnId, currentValue) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const separator = multipleConfig.separator || ',';

        // Créer le conteneur de tags
        const wrapper = cell.querySelector('.cell-wrapper') || document.createElement('div');
        wrapper.className = 'cell-wrapper';

        const tagContainer = document.createElement('div');
        tagContainer.className = multipleConfig.tagContainerClass;

        // Nettoyer le contenu existant
        wrapper.innerHTML = '';
        wrapper.appendChild(tagContainer);

        if (!wrapper.parentNode) {
            cell.textContent = '';
            cell.appendChild(wrapper);
        }

        // Si la valeur actuelle est vide, ne rien faire de plus
        if (!currentValue) return;

        // Diviser la valeur actuelle en tableau
        const values = currentValue.split(separator).map(v => v.trim()).filter(Boolean);

        // Créer les tags pour chaque valeur
        this.renderMultipleTags(tagContainer, values, columnId);
    }

    // Nouvelle méthode pour rendre les tags dans une cellule multiple
    renderMultipleTags(container, values, columnId) {
        container.innerHTML = '';

        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const choices = columnConfig.values || [];
        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const allowCustomValues = multipleConfig.allowCustomValues !== false; // Par défaut, autoriser les valeurs personnalisées

        values.forEach(value => {
            // Trouver le choix correspondant à cette valeur
            const choice = choices.find(c => (typeof c === 'object' ? c.value : c) === value);

            // Si la valeur n'existe pas dans les choix et que les valeurs personnalisées ne sont pas autorisées, ignorer
            if (!choice && !allowCustomValues) return;

            // Utiliser le label du choix s'il existe, sinon utiliser la valeur comme label
            const label = choice ? (typeof choice === 'object' ? choice.label : choice) : value;

            // Créer le tag
            const tag = document.createElement('span');
            tag.className = multipleConfig.tagClass;
            tag.setAttribute('data-value', value);

            // Si c'est une valeur personnalisée, ajouter une classe spéciale
            if (!choice && allowCustomValues) {
                tag.classList.add(multipleConfig.customValueClass);
            }

            // Ajouter le label
            const labelSpan = document.createElement('span');
            labelSpan.innerHTML = label;
            tag.appendChild(labelSpan);

            // Ajouter le bouton de suppression
            const removeBtn = document.createElement('span');
            removeBtn.className = multipleConfig.removeTagClass;
            removeBtn.innerHTML = '×';
            tag.appendChild(removeBtn);

            container.appendChild(tag);
        });
    }

    // Nouvelle méthode pour créer un dropdown pour le mode multiple
    createMultipleDropdown(cell, choices, columnId) {
        const dropdown = document.createElement('div');
        const columnConfig = this.getColumnConfig(columnId);
        const searchableConfig = columnConfig.searchable || this.defaultSearchableConfig;
        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const ajaxConfig = columnConfig.ajax || {};

        dropdown.className = searchableConfig.dropdownClass || this.defaultSearchableConfig.dropdownClass;
        dropdown.style.minWidth = searchableConfig.minWidth || this.defaultSearchableConfig.minWidth;

        // Ajouter la barre de recherche si nécessaire
        if (columnConfig.searchable && columnConfig.searchable.enabled !== false) {
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = searchableConfig.searchClass || this.defaultSearchableConfig.searchClass;
            searchInput.placeholder = searchableConfig.placeholder || this.defaultSearchableConfig.placeholder;
            dropdown.appendChild(searchInput);

            // Variable pour stocker l'ID du timer de debounce
            const debounceKey = `${columnId}_${cell.id}`;

            // Gestionnaire de recherche
            searchInput.addEventListener('input', () => {
                const searchText = searchInput.value.toLowerCase();

                // Effacer le timer précédent
                if (this.debounceTimers.has(debounceKey)) {
                    clearTimeout(this.debounceTimers.get(debounceKey));
                }

                // Si AJAX est activé et qu'on a assez de caractères ou si loadOnFocus est activé et le champ est vide
                if (ajaxConfig.enabled &&
                    (searchText.length >= (ajaxConfig.minChars || 3) ||
                        (ajaxConfig.loadOnFocus && searchText.length === 0))) {

                    // Afficher un indicateur de chargement
                    optionsContainer.innerHTML = `<div class="loading">${searchableConfig.loadingText || 'Chargement...'}</div>`;

                    // Attendre avant d'envoyer la requête
                    const timerId = setTimeout(() => {
                        this.fetchOptionsFromAjax(searchText, columnId)
                            .then(results => {
                                this.renderMultipleOptions(optionsContainer, results, cell, columnId);
                            })
                            .catch(error => {
                                if (error.name !== 'AbortError') {
                                    this.debug('Erreur lors de la recherche AJAX:', error);
                                    optionsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
                                }
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
                    this.renderMultipleOptions(optionsContainer, filteredChoices, cell, columnId);
                }
            });
        }

        // Conteneur pour les options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';
        dropdown.appendChild(optionsContainer);

        // Afficher les options initiales
        if (choices && choices.length) {
            this.renderMultipleOptions(optionsContainer, choices, cell, columnId);
        }

        return dropdown;
    }

    // Nouvelle méthode pour rendre les options dans le dropdown multiple
    renderMultipleOptions(container, choices, cell, columnId) {
        container.innerHTML = '';
        const columnConfig = this.getColumnConfig(columnId);
        const searchableConfig = columnConfig.searchable || this.defaultSearchableConfig;
        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const allowCustomValues = multipleConfig.allowCustomValues !== false; // Par défaut, autoriser les valeurs personnalisées

        // Récupérer les valeurs actuellement sélectionnées
        const currentValues = this.getMultipleValues(cell);

        // Récupérer la valeur de recherche si elle existe
        const searchInput = container.parentNode?.querySelector('.' + searchableConfig.searchClass);
        const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';

        // Si aucun résultat n'est trouvé et que la recherche n'est pas vide
        if ((!choices || !choices.length) && searchText) {
            // Si les valeurs personnalisées sont autorisées, afficher une option pour ajouter la valeur
            if (allowCustomValues) {
                const addCustomOption = document.createElement('div');
                addCustomOption.className = searchableConfig.optionClass + ' add-custom-option';

                // Ajouter une icône "+"
                const plusIcon = document.createElement('span');
                plusIcon.className = 'custom-option-icon';
                plusIcon.innerHTML = '+';
                addCustomOption.appendChild(plusIcon);

                // Ajouter le texte
                const labelSpan = document.createElement('span');
                labelSpan.textContent = `Ajouter "${searchText}"`;
                addCustomOption.appendChild(labelSpan);

                // Gestionnaire de clic pour ajouter la valeur personnalisée
                addCustomOption.addEventListener('click', (e) => {
                    // Ajouter la valeur si elle n'est pas déjà présente
                    if (!currentValues.includes(searchText)) {
                        const newValues = [...currentValues, searchText];
                        this.updateMultipleCell(cell, newValues, columnId);
                    }

                    // Vider le champ de recherche
                    if (searchInput) {
                        searchInput.value = '';
                    }

                    // Fermer le dropdown
                    this.closeAllDropdowns();

                    // Empêcher la propagation
                    e.stopPropagation();
                });

                container.appendChild(addCustomOption);
                return;
            } else {
                // Sinon, afficher le message "aucun résultat"
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.textContent = searchableConfig.noResultsText || this.defaultSearchableConfig.noResultsText;
                container.appendChild(noResults);
                return;
            }
        } else if (!choices || !choices.length) {
            // Si aucun résultat et pas de recherche
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = searchableConfig.noResultsText || this.defaultSearchableConfig.noResultsText;
            container.appendChild(noResults);
            return;
        }

        choices.forEach(choice => {
            // Extraire les valeurs
            const value = typeof choice === 'object' ? choice.value : choice;
            const label = typeof choice === 'object' ? choice.label : choice;

            // Ne pas afficher les options en lecture seule
            if (this.isReadOnly(columnId, value)) {
                return;
            }

            const optionElement = document.createElement('div');
            optionElement.className = searchableConfig.optionClass;

            // Ajouter une case à cocher
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'multiple-option-checkbox';
            checkbox.checked = currentValues.includes(value);
            optionElement.appendChild(checkbox);

            // Ajouter le label
            const labelSpan = document.createElement('span');
            labelSpan.innerHTML = label;
            optionElement.appendChild(labelSpan);

            // Ajouter la classe selected si l'option est déjà sélectionnée
            if (currentValues.includes(value)) {
                optionElement.classList.add('multiple-selected');
            }

            // Gestionnaire de clic sur l'option
            optionElement.addEventListener('click', (e) => {
                // Inverser l'état de la case à cocher
                checkbox.checked = !checkbox.checked;

                // Mettre à jour la liste des valeurs sélectionnées
                let newValues;
                if (checkbox.checked) {
                    // Ajouter la valeur si elle n'est pas déjà présente
                    if (!currentValues.includes(value)) {
                        newValues = [...currentValues, value];
                    } else {
                        newValues = currentValues;
                    }
                    optionElement.classList.add('multiple-selected');
                } else {
                    // Supprimer la valeur
                    newValues = currentValues.filter(v => v !== value);
                    optionElement.classList.remove('multiple-selected');
                }

                // Mettre à jour la cellule
                this.updateMultipleCell(cell, newValues, columnId);

                // Empêcher la fermeture du dropdown
                e.stopPropagation();
            });

            container.appendChild(optionElement);
        });
    }

    // Nouvelle méthode pour récupérer les valeurs multiples d'une cellule
    getMultipleValues(cell) {
        const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return [];

        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const separator = multipleConfig.separator || ',';

        const currentValue = cell.getAttribute('data-value') || '';
        return currentValue.split(separator).map(v => v.trim()).filter(Boolean);
    }

    // Nouvelle méthode pour mettre à jour une cellule multiple
    updateMultipleCell(cell, values, columnId) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const separator = multipleConfig.separator || ',';

        // Joindre les valeurs en une chaîne
        const newValue = values.join(separator);

        // Mettre à jour l'attribut data-value
        cell.setAttribute('data-value', newValue);

        // Mettre à jour l'affichage des tags
        const tagContainer = cell.querySelector('.' + multipleConfig.tagContainerClass);
        if (tagContainer) {
            this.renderMultipleTags(tagContainer, values, columnId);
        }

        // Déclencher l'événement de changement
        const row = cell.closest('tr');
        const isModified = cell.getAttribute('data-initial-value') !== newValue;
        
        // Générer un ID d'événement unique pour éviter les doublons
        const eventId = `choice-multiple-${columnId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const changeEvent = new CustomEvent('cell:change', {
            detail: {
                cell,
                value: newValue,
                columnId,
                rowId: row?.id,
                source: 'choice-multiple',
                tableId: this.table.table.id,
                isModified: isModified,
                eventId: eventId
            },
            bubbles: true
        });

        this.table.table.dispatchEvent(changeEvent);
        
        // Utiliser le plugin Actions si disponible pour mettre à jour les boutons d'action
        const actionsPlugin = this.table.getPlugin('actions');
        if (actionsPlugin && isModified && row) {
            row.classList.add(this.config.modifiedClass);
            if (typeof actionsPlugin.updateActionButtons === 'function') {
                actionsPlugin.updateActionButtons(row, { showOnModified: true });
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

        // Si l'événement vient d'un bouton de suppression de tag, le gérer séparément
        if (event.target.closest('.' + this.defaultMultipleConfig.removeTagClass)) {
            // Empêcher la propagation immédiatement pour les clics sur les boutons de suppression
            event.stopPropagation();
            event.preventDefault();
            try {
                this.handleTagRemove(event);
            } catch (error) {
                this.debug('Erreur lors de la gestion de la suppression du tag:', error);
            }
            return;
        }

        // Si l'événement vient d'une case à cocher dans le dropdown multiple, ne pas fermer le dropdown
        if (event.target.classList.contains('multiple-option-checkbox')) {
            event.stopPropagation();
            return;
        }

        // Vérifier si la cellule est en lecture seule
        if (cell.classList.contains(this.config.readOnlyClass)) return;

        // Vérifier si la cellule doit être en lecture seule via la fonction isReadOnly
        const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
        const columnConfig = this.getColumnConfig(columnId);

        if (columnConfig && typeof columnConfig.isReadOnly === 'function') {
            const row = cell.closest('tr');
            if (row) {
                const rowData = this.getRowData(row);
                const currentValue = cell.getAttribute('data-value');

                if (columnConfig.isReadOnly(currentValue, rowData)) {
                    cell.classList.add(this.config.readOnlyClass);
                    return;
                }
            }
        }

        const type = cell.getAttribute('data-choice-type') || 'toggle';

        if (type === 'toggle') {
            this.handleToggleClick(cell);
        } else if (type === 'searchable') {
            this.handleSearchableClick(cell);
        } else if (type === 'multiple') {
            this.handleMultipleClick(cell);
        }
    }

    // Nouvelle méthode pour gérer le clic sur une cellule de type multiple
    handleMultipleClick(cell) {
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
        const dropdown = this.createMultipleDropdown(cell, choices, columnId);
        cell.appendChild(dropdown);
        dropdown.classList.add('active');
        this.activeDropdown = dropdown;

        // Focus sur la recherche si elle existe
        const searchInput = dropdown.querySelector(`.${this.defaultSearchableConfig.searchClass}`);
        if (searchInput) {
            searchInput.focus();
        }

        // Si AJAX est activé et loadOnFocus est true, charger les options
        const ajaxConfig = columnConfig.ajax || {};
        if (ajaxConfig.enabled && ajaxConfig.loadOnFocus) {
            const optionsContainer = dropdown.querySelector('.options-container');
            if (optionsContainer) {
                const searchableConfig = columnConfig.searchable || this.defaultSearchableConfig;
                optionsContainer.innerHTML = `<div class="loading">${searchableConfig.loadingText || 'Chargement...'}</div>`;

                this.fetchOptionsFromAjax('', columnId)
                    .then(results => {
                        this.renderMultipleOptions(optionsContainer, results, cell, columnId);
                    })
                    .catch(error => {
                        if (error.name !== 'AbortError') {
                            this.debug('Erreur lors du chargement initial AJAX:', error);
                            optionsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
                        }
                    });
            }
        }
    }

    // Nouvelle méthode pour gérer la suppression d'un tag
    handleTagRemove(event) {
        // Empêcher la propagation de l'événement immédiatement
        event.stopPropagation();
        event.preventDefault();
        
        try {
            const tag = event.target.closest('.' + this.defaultMultipleConfig.tagClass);
            if (!tag) return;

            const cell = tag.closest('td');
            if (!cell) return;

            const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
            const columnConfig = this.getColumnConfig(columnId);
            if (!columnConfig) return;

            const tagValue = tag.getAttribute('data-value');
            if (!tagValue) return;

            // Récupérer les valeurs actuelles
            const currentValues = this.getMultipleValues(cell);

            // Supprimer la valeur du tag
            const newValues = currentValues.filter(v => v !== tagValue);

            // Déclencher un événement spécifique pour la suppression de tag
            const row = cell.closest('tr');
            const tagRemovedEvent = new CustomEvent('tag:removed', {
                detail: {
                    cell,
                    value: tagValue,
                    columnId,
                    rowId: row?.id,
                    tableId: this.table?.table?.id
                },
                bubbles: true
            });
            
            if (this.table?.table) {
                this.table.table.dispatchEvent(tagRemovedEvent);
            }

            // Mettre à jour la cellule
            this.updateMultipleCell(cell, newValues, columnId);
        } catch (error) {
            this.debug('Erreur lors de la suppression du tag:', error);
            console.error('Erreur lors de la suppression du tag:', error);
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

            // Annuler les requêtes précédentes pour cette colonne
            if (columnConfig.ajax.abortPrevious && this.ajaxRequests.has(columnId)) {
                this.debug(`Annulation de la requête AJAX précédente pour ${columnId}`);
                this.ajaxRequests.get(columnId).abort();
            }

            this.fetchOptionsFromAjax('', columnId)
                .then(results => {
                    this.renderSearchableOptions(optionsContainer, results, cell, columnId);
                })
                .catch(error => {
                    // Ne pas afficher d'erreur si la requête a été annulée intentionnellement
                    if (error.name !== 'AbortError') {
                        this.debug('Erreur lors du chargement initial AJAX:', error);
                        optionsContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
                    }
                });
        }
    }

    updateCellValue(cell, value, label, columnId, additionalData = {}) {
        try {
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
                // Récupérer la valeur à partir des données additionnelles ou utiliser directement la valeur du mapping
                let fillValue;

                // Si le mapping est une fonction, l'exécuter
                if (typeof targetColumnId === 'function') {
                    try {
                        fillValue = targetColumnId(additionalData, row);
                    } catch (error) {
                        this.debug(`Erreur lors de l'exécution de la fonction de mapping pour ${sourceField}:`, error);
                        return;
                    }
                }
                // Si le mapping est une valeur directe (non un ID de colonne)
                else if (typeof targetColumnId === 'number' ||
                    (typeof targetColumnId === 'string' && !targetColumnId.includes('_'))) {
                    fillValue = targetColumnId;
                }
                // Sinon, récupérer la valeur des données additionnelles
                else {
                    fillValue = additionalData[sourceField];
                }

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

                        // Utiliser la méthode de TableFlow pour réappliquer les plugins
                        try {
                            if (this.table && typeof this.table.reapplyPluginsToCell === 'function') {
                                this.table.reapplyPluginsToCell(targetCell, targetColumnId);
                            }
                        } catch (error) {
                            this.debug('Erreur lors de la réapplication des plugins:', error);
                            console.error('Erreur lors de la réapplication des plugins:', error);
                        }
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
        if (this.table?.table) {
            this.table.table.dispatchEvent(changeEvent);
        }

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
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la valeur de la cellule:', error);
            this.debug('Erreur lors de la mise à jour de la valeur de la cellule:', error);
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
        // Annuler toutes les requêtes AJAX en cours
        this.ajaxRequests.forEach((controller, columnId) => {
            this.debug(`Annulation de la requête AJAX pour ${columnId} lors du rafraîchissement`);
            controller.abort();
        });
        this.ajaxRequests.clear();

        // Nettoyer les timers de debounce
        this.debounceTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.debounceTimers.clear();

        // Fermer tous les dropdowns
        this.closeAllDropdowns();

        // Réinitialiser les cellules
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

        // Annuler toutes les requêtes AJAX en cours
        this.ajaxRequests.forEach((controller, columnId) => {
            this.debug(`Annulation de la requête AJAX pour ${columnId} lors de la destruction`);
            controller.abort();
        });
        this.ajaxRequests.clear();
    }
    // Cette méthode est supprimée car elle est dupliquée
    // La version correcte est maintenue plus haut dans le code



    // Méthode pour configurer une cellule toggle
    setupToggleCell(cell, columnId) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const choices = columnConfig.values || [];
        if (!choices.length) return;

        // Récupérer la valeur actuelle
        const currentValue = cell.getAttribute('data-value');

        // Trouver le choix correspondant
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

        // Vérifier si la cellule doit être en lecture seule
        if (typeof columnConfig.isReadOnly === 'function') {
            const row = cell.closest('tr');
            if (row) {
                const rowData = this.getRowData(row);
                if (columnConfig.isReadOnly(currentValue, rowData)) {
                    cell.classList.add(this.config.readOnlyClass);
                }
            }
        }
    }

    // Méthode pour configurer une cellule searchable
    setupSearchableCell(cell, columnId) {
        // Similaire à setupToggleCell mais pour le type searchable
        this.setupToggleCell(cell, columnId); // Pour l'instant, même traitement
    }
    // Méthode pour réinitialiser une cellule avec les plugins appropriés
    // Cette méthode est appelée par TableFlow.reapplyPluginsToCell
    setupCell(cell, columnId) {
        if (!cell || !columnId) return;

        // Récupérer le type de plugin pour cette colonne
        const headerCell = this.table.table.querySelector(`thead th#${columnId}`);
        if (!headerCell || !headerCell.hasAttribute(this.config.choiceAttribute)) return;

        const choiceType = headerCell.getAttribute(this.config.choiceAttribute) || 'toggle';

        // Configurer la cellule avec le type approprié
        this.setupChoiceCell(cell, columnId, choiceType);
    }
}