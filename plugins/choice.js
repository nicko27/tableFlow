/**
 * Plugin Choice pour TableFlow
 * Permet de gérer des sélections de valeurs avec trois modes :
 * - toggle : basculement direct entre les options par clic
 * - searchable : recherche et sélection dans une liste déroulante avec support AJAX
 * - multiple : sélection de plusieurs valeurs avec tags et support pour les valeurs personnalisées
 * 
 * Version 3.4.0 avec support du tri des tags
 */

// Récupérer l'URL du module actuel et extraire le chemin de base
const MODULE_URL = import.meta.url;
const MODULE_PATH = MODULE_URL.substring(0, MODULE_URL.lastIndexOf('/') + 1);

export default class ChoicePlugin {
    constructor(config = {}) {
        this.name = 'choice';
        this.version = '3.4.0';  // Mise à jour de la version avec support du tri des tags
        this.type = 'edit';
        this.table = null;
        this.dependencies = [];
        this.activeDropdown = null;
        this.debounceTimers = new Map(); // Pour stocker les timers de debounce
        this.ajaxRequests = new Map(); // Pour stocker les requêtes AJAX en cours
        this.sortableInstances = new Map(); // Pour stocker les instances Sortable.js
        this.modulePath = MODULE_PATH; // Stocker le chemin du module

        // Configuration par défaut pour le mode searchable
        this.defaultSearchableConfig = {
            minWidth: '200px',
            dropdownClass: 'choice-dropdown',
            optionClass: 'choice-option',
            searchClass: 'choice-search',
            noResultsClass: 'no-results',
            loadingClass: 'loading',
            errorClass: 'error',
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
            tagOrderClass: 'tag-order',
            selectedClass: 'multiple-selected',
            optionCheckboxClass: 'multiple-option-checkbox',
            placeholder: 'Sélectionner des options...',
            maxTags: null, // null = illimité
            allowCustomValues: true, // Autoriser l'ajout de valeurs personnalisées
            customValueClass: 'custom-value', // Classe CSS pour les valeurs personnalisées
            showOrder: false, // Afficher les numéros d'ordre devant les tags
            orderPrefix: '', // Préfixe pour les numéros d'ordre (ex: "#")
            orderSuffix: '-', // Suffixe pour les numéros d'ordre (ex: "-")
            upDownButtons: false, // Afficher les boutons haut/bas pour réordonner
            upButtonClass: 'choice-tag-up', // Classe CSS pour le bouton monter
            downButtonClass: 'choice-tag-down' // Classe CSS pour le bouton descendre
        };

        // Configuration par défaut pour l'auto-remplissage amélioré
        this.defaultAutoFillConfig = {
            enabled: false,
            mappings: {},
            autoDetect: true, // Détection automatique des champs
            cellIdFormat: '{column}_{rowId}' // Format par défaut pour les IDs de cellule
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

        // Afficher des informations de débogage sur le chemin du module
        this.debug(`Chemin du module détecté: ${this.modulePath}`);

        // Ajouter les styles CSS
        this.addStyles();

        // Lier toutes les méthodes pour préserver le contexte
        this.handleClick = this.handleClick.bind(this);
        this.handleToggleClick = this.handleToggleClick.bind(this);
        this.handleSearchableClick = this.handleSearchableClick.bind(this);
        this.handleMultipleClick = this.handleMultipleClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleTagRemove = this.handleTagRemove.bind(this);
        this.closeAllDropdowns = this.closeAllDropdowns.bind(this);
        this.isManagedCell = this.isManagedCell.bind(this);
        this.updateCellValue = this.updateCellValue.bind(this);
        this.updateMultipleCell = this.updateMultipleCell.bind(this);
        this.getMultipleValues = this.getMultipleValues.bind(this);
        this.handleAutoFill = this.handleAutoFill.bind(this);
        this.findTargetCell = this.findTargetCell.bind(this);
        this.updateTargetCell = this.updateTargetCell.bind(this);
    }

    /**
     * Récupère et normalise la configuration d'une colonne
     * @param {string} columnId - ID de la colonne
     * @returns {Object|null} - Configuration normalisée de la colonne ou null
     */
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

        // Normaliser la configuration d'auto-remplissage
        const autoFill = this.normalizeAutoFillConfig(columnConfig.autoFill || {});

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
            autoFill: autoFill
        };
    }

    /**
     * Normalise la configuration d'auto-remplissage
     * @param {Object} autoFillConfig - Configuration d'auto-remplissage brute
     * @returns {Object} - Configuration normalisée
     */
    normalizeAutoFillConfig(autoFillConfig) {
        const config = {
            ...this.defaultAutoFillConfig,
            ...autoFillConfig
        };

        // Si les mappings sont un tableau, les convertir en objet
        if (Array.isArray(config.mappings)) {
            const normalizedMappings = {};
            config.mappings.forEach(field => {
                normalizedMappings[field] = field;
            });
            
            // Fusionner avec customMappings si présent
            if (config.customMappings && typeof config.customMappings === 'object') {
                Object.assign(normalizedMappings, config.customMappings);
            }
            
            // Remplacer les mappings
            config.mappings = normalizedMappings;
        } else if (typeof config.mappings !== 'object') {
            config.mappings = {};
        }

        return config;
    }

    /**
     * Crée un dropdown pour le mode searchable
     * @param {HTMLElement} cell - Cellule du tableau
     * @param {Array} choices - Options disponibles
     * @param {string} columnId - ID de la colonne
     * @returns {HTMLElement} - Élément dropdown créé
     */
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

        // Gestionnaire pour la touche Entrée
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                
                const searchText = searchInput.value.trim();
                if (!searchText) return;
                
                // Vérifier si on est en mode multiple
                if (columnConfig.type === 'multiple') {
                    const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
                    const allowCustomValues = multipleConfig.allowCustomValues !== false;
                    
                    if (allowCustomValues) {
                        // Récupérer les valeurs actuelles
                        const currentValues = this.getMultipleValues(cell);
                        
                        // Vérifier si la valeur existe déjà dans les choix
                        const existingChoice = choices.find(c => 
                            (typeof c === 'object' ? c.value : c) === searchText ||
                            (typeof c === 'object' ? c.label : c).toLowerCase() === searchText.toLowerCase()
                        );
                        
                        if (existingChoice) {
                            // Si la valeur existe, l'ajouter avec sa valeur et son label
                            const value = typeof existingChoice === 'object' ? existingChoice.value : existingChoice;
                            
                            if (!currentValues.includes(value)) {
                                currentValues.push(value);
                                this.updateMultipleCell(cell, currentValues, columnId);
                            }
                        } else {
                            // Si la valeur n'existe pas et que les valeurs personnalisées sont autorisées
                            if (!currentValues.includes(searchText)) {
                                currentValues.push(searchText);
                                this.updateMultipleCell(cell, currentValues, columnId);
                            }
                        }
                        
                        // Fermer le dropdown et effacer le champ de recherche
                        searchInput.value = '';
                        this.closeAllDropdowns();
                    }
                } else {
                    // Pour le mode searchable simple
                    const allowCustomValues = columnConfig.searchable?.allowCustomValues !== false;
                    
                    if (allowCustomValues) {
                        this.updateCellValue(cell, searchText, searchText, columnId);
                        this.closeAllDropdowns();
                    }
                }
            }
        });

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

                // Stocker la requête actuelle pour le parser
                ajaxConfig._lastQuery = searchText;

                // Afficher un indicateur de chargement
                optionsContainer.innerHTML = `<div class="${searchableConfig.loadingClass || this.defaultSearchableConfig.loadingClass}">${searchableConfig.loadingText || this.defaultSearchableConfig.loadingText}</div>`;

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
                                optionsContainer.innerHTML = `<div class="${searchableConfig.errorClass || this.defaultSearchableConfig.errorClass}">Erreur de chargement</div>`;
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

    /**
     * Récupère les options via AJAX
     * @param {string} query - Terme de recherche
     * @param {string} columnId - ID de la colonne
     * @returns {Promise<Array>} - Promesse avec les résultats de la recherche
     */
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

    /**
     * Affiche les options dans le dropdown searchable
     * @param {HTMLElement} container - Conteneur pour les options
     * @param {Array} choices - Options à afficher
     * @param {HTMLElement} cell - Cellule associée
     * @param {string} columnId - ID de la colonne
     */
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

    /**
     * Ferme tous les dropdowns
     */
    closeAllDropdowns() {
        // Vérifier si un élément de réorganisation a le focus
        const activeElement = document.activeElement;
        const multipleConfig = this.defaultMultipleConfig;
        
        if (activeElement && (
            activeElement.classList.contains(multipleConfig.upButtonClass) ||
            activeElement.classList.contains(multipleConfig.downButtonClass) ||
            activeElement.classList.contains(multipleConfig.removeTagClass)
        )) {
            // Ne pas fermer les dropdowns si un bouton de réorganisation a le focus
            return;
        }
        
        const dropdowns = document.querySelectorAll(`.${this.defaultSearchableConfig.dropdownClass}.active`);
        dropdowns.forEach(dropdown => {
            dropdown.remove();
        });
        this.activeDropdown = null;
    }

    /**
     * Vérifie si une valeur est en lecture seule
     * @param {string} columnId - ID de la colonne
     * @param {string} value - Valeur à vérifier
     * @param {HTMLElement} cell - Cellule à vérifier (optionnel)
     * @returns {boolean} - true si la valeur est en lecture seule
     */
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

    /**
     * Récupère les données d'une ligne
     * @param {HTMLElement} row - Ligne du tableau
     * @returns {Object} - Données de la ligne sous forme d'objet
     */
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

    /**
     * Ajoute les styles CSS pour le plugin
     */
    addStyles() {
        if (!document.getElementById('choice-plugin-styles')) {
            // Définir les options de chargement des styles
            const options = {
                // Priorité des méthodes de chargement des styles
                methods: ['config', 'auto', 'bundle', 'inline'],
                
                // Utilise les styles configurés si disponibles
                config: () => {
                    if (this.config.cssPath) {
                        return {
                            type: 'link',
                            path: this.config.cssPath
                        };
                    }
                    return null;
                },
                
                // Essaie de découvrir automatiquement l'emplacement du CSS
                auto: () => {
                    try {
                        // Trouver le script actuel
                        const scripts = document.getElementsByTagName('script');
                        for (let i = 0; i < scripts.length; i++) {
                            const src = scripts[i].src;
                            if (!src) continue;
                            
                            // Vérifier si c'est le script choice.js ou TableFlow.js
                            if (src.match(/[\/\\](choice|TableFlow)(\.min)?\.js(\?.*)?$/)) {
                                // Extraire le chemin du répertoire
                                const basePath = src.substring(0, src.lastIndexOf('/') + 1);
                                return {
                                    type: 'link',
                                    path: basePath + 'choice.css'
                                };
                            }
                        }
                    } catch (e) {
                        this.debug('Erreur lors de la détection automatique:', e);
                    }
                    return null;
                },
                
                // Essaie de charger un bundle CSS prédéfini
                bundle: () => {
                    // Essayer de charger depuis des emplacements courants
                    const commonPaths = [
                        '/css/choice.css',
                        '/assets/css/choice.css',
                        '/styles/choice.css',
                        '/plugins/choice/choice.css',
                        '/TableFlow/plugins/choice.css'
                    ];
                    
                    // Vérifier si l'un des fichiers est accessible
                    for (const path of commonPaths) {
                        try {
                            // Utiliser fetch pour vérifier l'existence du fichier
                            // Note: ceci est asynchrone, mais comme c'est juste une vérification,
                            // nous allons simplement tenter de charger le fichier
                            const testRequest = new XMLHttpRequest();
                            testRequest.open('HEAD', path, false);
                            testRequest.send();
                            
                            if (testRequest.status === 200) {
                                return {
                                    type: 'link',
                                    path: path
                                };
                            }
                        } catch (e) {
                            // Ignorer l'erreur et passer au chemin suivant
                        }
                    }
                    
                    return null;
                },
                
                // Fallback: insérer les styles CSS directement dans le document
                inline: () => {
                    return {
                        type: 'style',
                        css: `
                        .choice-cell { cursor: pointer; position: relative; }
                        .choice-cell.readonly { cursor: not-allowed; opacity: 0.8; background-color: #f8f8f8; }
                        .choice-dropdown { position: absolute; top: 100%; left: 0; z-index: 1000; display: none; min-width: 200px; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: auto; max-height: 200px; }
                        .choice-dropdown.active { display: block; }
                        .choice-search { width: 100%; padding: 8px; border: none; border-bottom: 1px solid #ddd; outline: none; box-sizing: border-box; }
                        .choice-option { padding: 8px; cursor: pointer; }
                        .choice-option:hover { background-color: #f5f5f5; }
                        .no-results, .loading, .error { padding: 8px; color: #999; font-style: italic; text-align: center; }
                        .error { color: #e74c3c; }
                        .choice-tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 2px; }
                        .choice-tag { display: inline-flex; align-items: center; background-color: #e9f5fe; border: 1px solid #c5e2fa; border-radius: 3px; padding: 2px 6px; margin: 2px; font-size: 0.9em; user-select: none; cursor: default; }
                        .choice-tag .tag-order { font-weight: bold; margin-right: 3px; opacity: 0.7; }
                        .choice-tag-remove { display: inline-flex; align-items: center; justify-content: center; margin-left: 4px; width: 16px; height: 16px; border-radius: 50%; background-color: #c5e2fa; color: #4a90e2; cursor: pointer; font-size: 10px; font-weight: bold; }
                        .choice-tag-remove:hover { background-color: #4a90e2; color: white; }
                        .choice-tag-up, .choice-tag-down { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background-color: #e0e0e0; color: #666; cursor: pointer; font-size: 10px; font-weight: bold; margin-left: 2px; position: relative; z-index: 1001; }
                        .choice-tag-up:hover, .choice-tag-down:hover { background-color: #c0c0c0; color: #333; }
                        .choice-tag-up:focus, .choice-tag-down:focus, .choice-tag-remove:focus { outline: none; box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.5); }
                        .multiple-selected { background-color: #e9f5fe; }
                        .multiple-option-checkbox { margin-right: 8px; }
                        .choice-tag.custom-value { background-color: #f9f0ff; border-color: #e0c6f5; }
                        .add-custom-option { display: flex; align-items: center; color: #4a90e2; }
                        .custom-option-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background-color: #e9f5fe; color: #4a90e2; margin-right: 8px; font-weight: bold; }
                        `
                    };
                }
            };
            
            // Essayer chaque méthode dans l'ordre de priorité
            let styleInfo = null;
            for (const method of options.methods) {
                styleInfo = options[method]();
                if (styleInfo) {
                    this.debug(`Chargement des styles avec la méthode: ${method}`);
                    break;
                }
            }
            
            // Appliquer les styles
            if (styleInfo) {
                if (styleInfo.type === 'link') {
                    const link = document.createElement('link');
                    link.id = 'choice-plugin-styles';
                    link.rel = 'stylesheet';
                    link.href = styleInfo.path;
                    this.debug('Chargement des styles CSS depuis:', link.href);
                    document.head.appendChild(link);
                } else if (styleInfo.type === 'style') {
                    const style = document.createElement('style');
                    style.id = 'choice-plugin-styles';
                    style.textContent = styleInfo.css;
                    this.debug('Utilisation des styles CSS intégrés');
                    document.head.appendChild(style);
                }
            } else {
                this.debug('Aucune méthode de chargement de styles n\'a fonctionné');
            }
        }
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
        this.debug('Initializing choice plugin');

        this.setupChoiceCells();
        
        // S'assurer que toutes les méthodes sont correctement liées au contexte this
        this.closeAllDropdowns = this.closeAllDropdowns.bind(this);
        this.isManagedCell = this.isManagedCell.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleToggleClick = this.handleToggleClick.bind(this);
        this.handleSearchableClick = this.handleSearchableClick.bind(this);
        this.handleMultipleClick = this.handleMultipleClick.bind(this);
        this.handleTagRemove = this.handleTagRemove.bind(this);
        
        this.setupEventListeners();
    }

    /**
     * Configure les cellules avec le plugin Choice
     */
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

    /**
     * Configure une cellule avec le plugin Choice
     * @param {HTMLElement} cell - Cellule à configurer
     * @param {string} columnId - ID de la colonne
     * @param {string} type - Type de choice (toggle, searchable, multiple)
     */
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

    /**
     * Configure une cellule en mode multiple
     * @param {HTMLElement} cell - Cellule à configurer
     * @param {string} columnId - ID de la colonne
     * @param {string} currentValue - Valeur actuelle
     */
    setupMultipleCell(cell, columnId, currentValue) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const separator = multipleConfig.separator || ',';

        // Créer le conteneur de tags
        const wrapper = cell.querySelector('.cell-wrapper') || document.createElement('div');
        wrapper.className = 'cell-wrapper';

        // Nettoyer le contenu existant
        wrapper.innerHTML = '';

        // Créer le conteneur de tags
        const tagContainer = document.createElement('div');
        tagContainer.className = multipleConfig.tagContainerClass;
        wrapper.appendChild(tagContainer);

        // S'assurer que le wrapper est ajouté à la cellule
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

    /**
     * Affiche les tags dans une cellule multiple
     * @param {HTMLElement} container - Conteneur pour les tags
     * @param {Array} values - Valeurs à afficher
     * @param {string} columnId - ID de la colonne
     */
    renderMultipleTags(container, values, columnId) {
        if (!container) {
            this.debug('Erreur: conteneur de tags non défini dans renderMultipleTags');
            return;
        }
        
        // Supprimer les gestionnaires d'événements existants pour éviter les doublons
        const oldHandler = container._clickHandler;
        if (oldHandler) {
            container.removeEventListener('click', oldHandler);
        }
        
        container.innerHTML = '';

        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        const choices = columnConfig.values || [];
        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const allowCustomValues = multipleConfig.allowCustomValues !== false; // Par défaut, autoriser les valeurs personnalisées
        const showOrder = multipleConfig.showOrder === true; // Afficher les numéros d'ordre
        const upDownButtons = multipleConfig.upDownButtons === true; // Afficher les boutons haut/bas

        // S'assurer que values est un tableau
        const valueArray = Array.isArray(values) ? values : 
                          (typeof values === 'string' ? values.split(multipleConfig.separator || ',').map(v => v.trim()).filter(Boolean) : []);

        valueArray.forEach((value, index) => {
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
            tag.setAttribute('data-index', index);

            // Si c'est une valeur personnalisée, ajouter une classe spéciale
            if (!choice && allowCustomValues) {
                tag.classList.add(multipleConfig.customValueClass);
            }

            // Ajouter le numéro d'ordre si activé
            if (showOrder) {
                const orderSpan = document.createElement('span');
                orderSpan.className = 'tag-order';
                orderSpan.textContent = `${multipleConfig.orderPrefix || ''}${index + 1}${multipleConfig.orderSuffix || ''}`;
                tag.appendChild(orderSpan);
            }

            // Ajouter le label
            const labelSpan = document.createElement('span');
            labelSpan.innerHTML = label;
            tag.appendChild(labelSpan);

            // Ajouter le bouton de suppression
            const removeBtn = document.createElement('span');
            removeBtn.className = multipleConfig.removeTagClass;
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Supprimer';
            tag.appendChild(removeBtn);

            // Ajouter les boutons haut/bas si activés
            if (upDownButtons) {
                // Bouton monter
                if (index > 0) {
                    const upBtn = document.createElement('span');
                    upBtn.className = multipleConfig.upButtonClass;
                    upBtn.innerHTML = '↑';
                    upBtn.title = 'Monter';
                    upBtn.setAttribute('data-action', 'up');
                    tag.appendChild(upBtn);
                }

                // Bouton descendre
                if (index < valueArray.length - 1) {
                    const downBtn = document.createElement('span');
                    downBtn.className = multipleConfig.downButtonClass;
                    downBtn.innerHTML = '↓';
                    downBtn.title = 'Descendre';
                    downBtn.setAttribute('data-action', 'down');
                    tag.appendChild(downBtn);
                }
            }

            container.appendChild(tag);
        });
        
        // Créer un nouveau gestionnaire d'événements
        const clickHandler = (e) => {
            // Empêcher la propagation pour éviter la fermeture du dropdown
            e.stopPropagation();
            
            // Gestion du bouton de suppression
            if (e.target.classList.contains(multipleConfig.removeTagClass)) {
                const tag = e.target.closest('.' + multipleConfig.tagClass);
                if (tag) {
                    const value = tag.getAttribute('data-value');
                    const cell = container.closest('td');
                    if (cell) {
                        const currentValues = this.getMultipleValues(cell);
                        const newValues = currentValues.filter(v => v !== value);
                        this.updateMultipleCell(cell, newValues, columnId);
                    }
                }
                return;
            }
            
            // Gestion des boutons haut/bas
            if (e.target.classList.contains(multipleConfig.upButtonClass) || 
                e.target.classList.contains(multipleConfig.downButtonClass)) {
                const tag = e.target.closest('.' + multipleConfig.tagClass);
                if (tag) {
                    const action = e.target.getAttribute('data-action');
                    const index = parseInt(tag.getAttribute('data-index'), 10);
                    const cell = container.closest('td');
                    
                    if (cell) {
                        const currentValues = this.getMultipleValues(cell);
                        
                        // Réorganiser les valeurs
                        if (action === 'up' && index > 0) {
                            // Échanger avec l'élément précédent
                            const temp = currentValues[index];
                            currentValues[index] = currentValues[index - 1];
                            currentValues[index - 1] = temp;
                        } else if (action === 'down' && index < currentValues.length - 1) {
                            // Échanger avec l'élément suivant
                            const temp = currentValues[index];
                            currentValues[index] = currentValues[index + 1];
                            currentValues[index + 1] = temp;
                        }
                        
                        this.updateMultipleCell(cell, currentValues, columnId);
                    }
                }
                return;
            }
        };
        
        // Stocker le gestionnaire pour pouvoir le supprimer plus tard
        container._clickHandler = clickHandler;
        
        // Ajouter le gestionnaire d'événements
        container.addEventListener('click', clickHandler);
    }

    /**
     * Crée un dropdown pour le mode multiple
     * @param {HTMLElement} cell - Cellule du tableau
     * @param {Array} choices - Options disponibles
     * @param {string} columnId - ID de la colonne
     * @returns {HTMLElement} - Élément dropdown créé
     */
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
            
            // Fonction pour ajouter une valeur
            const addValue = (searchText) => {
                if (!searchText) return;
                
                const allowCustomValues = multipleConfig.allowCustomValues !== false;
                
                if (allowCustomValues) {
                    // Récupérer les valeurs actuelles
                    const currentValues = this.getMultipleValues(cell);
                    
                    // Vérifier si la valeur existe déjà dans les choix
                    const existingChoice = choices.find(c => 
                        (typeof c === 'object' ? c.value : c) === searchText ||
                        (typeof c === 'object' ? c.label : c).toLowerCase() === searchText.toLowerCase()
                    );
                    
                    if (existingChoice) {
                        // Si la valeur existe, l'ajouter avec sa valeur
                        const value = typeof existingChoice === 'object' ? existingChoice.value : existingChoice;
                        
                        if (!currentValues.includes(value)) {
                            currentValues.push(value);
                            this.updateMultipleCell(cell, currentValues, columnId);
                        }
                    } else {
                        // Si la valeur n'existe pas et que les valeurs personnalisées sont autorisées
                        if (!currentValues.includes(searchText)) {
                            currentValues.push(searchText);
                            this.updateMultipleCell(cell, currentValues, columnId);
                        }
                    }
                    
                    // Effacer le champ de recherche
                    searchInput.value = '';
                }
            };
            
            // Gestionnaire pour la touche Entrée
            searchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const searchText = searchInput.value.trim();
                    addValue(searchText);
                    // Ne pas fermer le dropdown pour permettre d'ajouter plusieurs valeurs
                }
            });
            
            // Gestionnaire pour la perte de focus
            searchInput.addEventListener('blur', (event) => {
                // Vérifier si le clic est sur un élément du dropdown ou un bouton de réorganisation
                const relatedTarget = event.relatedTarget;
                if (relatedTarget && (
                    dropdown.contains(relatedTarget) || 
                    relatedTarget.classList.contains(multipleConfig.upButtonClass) ||
                    relatedTarget.classList.contains(multipleConfig.downButtonClass) ||
                    relatedTarget.classList.contains(multipleConfig.removeTagClass)
                )) {
                    // Si c'est un clic sur un élément du dropdown ou un bouton, ne rien faire
                    return;
                }
                
                // Si c'est un clic en dehors du dropdown, ajouter la valeur si elle existe
                const searchText = searchInput.value.trim();
                if (searchText) {
                    addValue(searchText);
                }
                
                // Attendre un peu avant de fermer le dropdown pour permettre aux clics de se propager
                setTimeout(() => {
                    // Vérifier si le focus est toujours en dehors du dropdown et des boutons
                    const activeElement = document.activeElement;
                    if (!dropdown.contains(activeElement) && 
                        !activeElement?.classList.contains(multipleConfig.upButtonClass) &&
                        !activeElement?.classList.contains(multipleConfig.downButtonClass) &&
                        !activeElement?.classList.contains(multipleConfig.removeTagClass)) {
                        this.closeAllDropdowns();
                    }
                }, 300); // Augmenter le délai pour donner plus de temps aux clics de se propager
            });

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
                    optionsContainer.innerHTML = `<div class="${searchableConfig.loadingClass || this.defaultSearchableConfig.loadingClass}">${searchableConfig.loadingText || 'Chargement...'}</div>`;

                    // Attendre avant d'envoyer la requête
                    const timerId = setTimeout(() => {
                        this.fetchOptionsFromAjax(searchText, columnId)
                            .then(results => {
                                this.renderMultipleOptions(optionsContainer, results, cell, columnId);
                            })
                            .catch(error => {
                                if (error.name !== 'AbortError') {
                                    this.debug('Erreur lors de la recherche AJAX:', error);
                                    optionsContainer.innerHTML = `<div class="${searchableConfig.errorClass || this.defaultSearchableConfig.errorClass}">Erreur de chargement</div>`;
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

    /**
     * Affiche les options dans le dropdown multiple
     * @param {HTMLElement} container - Conteneur pour les options
     * @param {Array} choices - Options à afficher
     * @param {HTMLElement} cell - Cellule associée
     * @param {string} columnId - ID de la colonne
     */
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
                
                // Ajouter le gestionnaire de clic pour ajouter la valeur personnalisée
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

    /**
     * Récupère les valeurs multiples d'une cellule
     * @param {HTMLElement} cell - Cellule à analyser
     * @returns {Array} - Tableau des valeurs
     */
    getMultipleValues(cell) {
        const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return [];

        const multipleConfig = columnConfig.multiple || this.defaultMultipleConfig;
        const separator = multipleConfig.separator || ',';

        const currentValue = cell.getAttribute('data-value') || '';
        
        // Vérifier si la valeur est déjà un tableau (pour compatibilité)
        if (Array.isArray(currentValue)) {
            return currentValue;
        }
        
        return currentValue.split(separator).map(v => v.trim()).filter(Boolean);
    }

    /**
     * Met à jour une cellule multiple
     * @param {HTMLElement} cell - Cellule à mettre à jour
     * @param {Array} values - Valeurs à définir
     * @param {string} columnId - ID de la colonne
     */
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
        } else {
            // Si le conteneur de tags n'existe pas, reconfigurer la cellule complètement
            this.setupMultipleCell(cell, columnId, newValue);
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
                tableId: this.table?.table?.id,
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

    /**
     * Vérifie si une cellule est gérée par le plugin Choice
     * @param {HTMLElement} cell - Cellule à vérifier
     * @returns {boolean} - true si la cellule est gérée par Choice
     */
    isManagedCell(cell) {
        return cell?.classList.contains(this.config.cellClass);
    }

    /**
     * Configure les écouteurs d'événements
     */
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

    /**
     * Gère le clic en dehors des dropdowns pour les fermer
     * @param {Event} event - Événement de clic
     */
    handleDocumentClick(event) {
        // Vérifier si le clic est sur un bouton de réorganisation ou de suppression
        if (event.target.classList.contains(this.defaultMultipleConfig.upButtonClass) ||
            event.target.classList.contains(this.defaultMultipleConfig.downButtonClass) ||
            event.target.classList.contains(this.defaultMultipleConfig.removeTagClass)) {
            // Ne pas fermer le dropdown si c'est un clic sur un bouton de réorganisation
            event.stopPropagation();
            return;
        }
        
        // Vérifier si le clic est en dehors d'une cellule ou d'un dropdown
        if (!event.target.closest(`.${this.config.cellClass}`) &&
            !event.target.closest(`.${this.defaultSearchableConfig.dropdownClass}`)) {
            this.closeAllDropdowns();
        }
    }

    /**
     * Gère le clic sur une cellule
     * @param {Event} event - Événement de clic
     */
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

    /**
     * Gère le clic sur une cellule de type multiple
     * @param {HTMLElement} cell - Cellule cliquée
     */
    handleMultipleClick(cell) {
        const columnId = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig) return;

        // Vérifier si la cellule a été correctement configurée pour le mode multiple
        const tagContainer = cell.querySelector('.' + (columnConfig.multiple?.tagContainerClass || this.defaultMultipleConfig.tagContainerClass));
        if (!tagContainer) {
            // Reconfigurer la cellule si le conteneur de tags n'existe pas
            const currentValue = cell.getAttribute('data-value') || '';
            this.setupMultipleCell(cell, columnId, currentValue);
        }

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
                optionsContainer.innerHTML = `<div class="${searchableConfig.loadingClass || this.defaultSearchableConfig.loadingClass}">${searchableConfig.loadingText || 'Chargement...'}</div>`;

                this.fetchOptionsFromAjax('', columnId)
                    .then(results => {
                        this.renderMultipleOptions(optionsContainer, results, cell, columnId);
                    })
                    .catch(error => {
                        if (error.name !== 'AbortError') {
                            this.debug('Erreur lors du chargement initial AJAX:', error);
                            optionsContainer.innerHTML = `<div class="${searchableConfig.errorClass || this.defaultSearchableConfig.errorClass}">Erreur de chargement</div>`;
                        }
                    });
            }
        }
    }

    /**
     * Gère la suppression d'un tag
     * @param {Event} event - Événement de clic
     */
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

    /**
     * Gère le clic sur une cellule de type toggle
     * @param {HTMLElement} cell - Cellule cliquée
     */
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

    /**
     * Gère le clic sur une cellule de type searchable
     * @param {HTMLElement} cell - Cellule cliquée
     */
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
            const searchableConfig = columnConfig.searchable || this.defaultSearchableConfig;
            optionsContainer.innerHTML = `<div class="${searchableConfig.loadingClass || this.defaultSearchableConfig.loadingClass}">${searchableConfig.loadingText || 'Chargement...'}</div>`;

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
                        optionsContainer.innerHTML = `<div class="${searchableConfig.errorClass || this.defaultSearchableConfig.errorClass}">Erreur de chargement</div>`;
                    }
                });
        }
    }

    /**
     * Met à jour la valeur d'une cellule et gère l'auto-remplissage
     * @param {HTMLElement} cell - Cellule à mettre à jour
     * @param {string} value - Nouvelle valeur
     * @param {string} label - Texte à afficher
     * @param {string} columnId - ID de la colonne
     * @param {Object} additionalData - Données supplémentaires pour l'auto-remplissage
     */
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
            if (row) {
                this.handleAutoFill(cell, value, additionalData, columnId, row);
            }

            // Créer l'événement avec bubbles:true pour permettre sa propagation
            const changeEvent = new CustomEvent('cell:change', {
                detail: {
                    cell,
                    value,
                    columnId,
                    rowId: row?.id,
                    source: 'choice',
                    tableId: this.table?.table?.id,
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

    /**
     * Gère l'auto-remplissage des cellules associées
     * @param {HTMLElement} cell - Cellule source
     * @param {string} value - Valeur sélectionnée
     * @param {Object} additionalData - Données supplémentaires
     * @param {string} columnId - ID de la colonne source
     * @param {HTMLElement} row - Ligne du tableau
     */
    handleAutoFill(cell, value, additionalData, columnId, row) {
        const columnConfig = this.getColumnConfig(columnId);
        if (!columnConfig || !columnConfig.autoFill || !columnConfig.autoFill.enabled) return;

        const autoFillConfig = columnConfig.autoFill;
        const mappings = autoFillConfig.mappings || {};
        
        this.debug('Auto-remplissage avec données:', additionalData);
        
        // 1. Traiter les mappings explicites
        Object.entries(mappings).forEach(([sourceField, targetInfo]) => {
            // Obtenir la valeur source
            let fillValue;
            
            // Si le mapping est une fonction, l'exécuter
            if (typeof targetInfo === 'function') {
                try {
                    targetInfo(additionalData, row);
                    return; // La fonction gère tout, pas besoin de continuer
                } catch (error) {
                    this.debug(`Erreur lors de l'exécution de la fonction de mapping pour ${sourceField}:`, error);
                    return;
                }
            }
            
            // Si targetInfo est une valeur directe (nombre ou chaîne mais pas un ID de colonne)
            if (typeof targetInfo === 'number' || 
                (typeof targetInfo === 'string' && !targetInfo.includes('_'))) {
                fillValue = targetInfo;
            }
            // Sinon, récupérer la valeur des données additionnelles
            else {
                fillValue = additionalData[sourceField];
            }
            
            if (fillValue !== undefined) {
                // Trouver la cellule cible avec la méthode améliorée
                const targetCell = this.findTargetCell(row, targetInfo, autoFillConfig.cellIdFormat);
                
                if (targetCell) {
                    this.updateTargetCell(targetCell, fillValue, targetInfo);
                }
            }
        });
        
        // 2. Auto-détection des champs si activée
        if (autoFillConfig.autoDetect) {
            // Pour chaque propriété dans additionalData qui n'est pas déjà dans les mappings
            Object.entries(additionalData).forEach(([field, value]) => {
                // Ignorer les champs déjà traités par le mapping explicite
                if (Object.keys(mappings).includes(field)) return;
                
                // Chercher une cellule correspondant directement au nom du champ
                const targetCell = this.findTargetCell(row, field, autoFillConfig.cellIdFormat);
                
                if (targetCell) {
                    this.updateTargetCell(targetCell, value, field);
                }
            });
        }
    }

    /**
     * Trouve une cellule cible pour l'auto-remplissage
     * @param {HTMLElement} row - Ligne du tableau
     * @param {string} targetColumnId - ID de la colonne cible
     * @param {string} format - Format de l'ID de cellule
     * @returns {HTMLElement|null} - Cellule cible ou null si non trouvée
     */
    findTargetCell(row, targetColumnId, format) {
        if (!row || !targetColumnId) return null;
        
        const rowId = row.id;
        format = format || '{column}_{rowId}'; // Format par défaut
        
        // Générer l'ID formaté
        const formattedId = format
            .replace('{column}', targetColumnId)
            .replace('{rowId}', rowId);
        
        // Essayer plusieurs stratégies pour trouver la cellule
        
        // 1. Rechercher par ID exact (préféré)
        let targetCell = row.querySelector(`td[id="${formattedId}"]`);
        if (targetCell) return targetCell;
        
        // 2. Rechercher par préfixe de colonne
        targetCell = row.querySelector(`td[id^="${targetColumnId}_"]`);
        if (targetCell) return targetCell;
        
        // 3. Rechercher par attribut data-column-id
        targetCell = row.querySelector(`td[data-column-id="${targetColumnId}"]`);
        if (targetCell) return targetCell;
        
        // 4. Rechercher l'index de colonne dans les en-têtes et trouver la cellule correspondante
        if (this.table?.table) {
            const headers = this.table.table.querySelectorAll('thead th');
            const headerIndex = Array.from(headers).findIndex(th => th.id === targetColumnId);
            
            if (headerIndex !== -1 && row.cells[headerIndex]) {
                return row.cells[headerIndex];
            }
        }
        
        this.debug(`Cellule cible non trouvée pour la colonne ${targetColumnId} dans la ligne ${rowId}`);
        return null;
    }

    /**
     * Met à jour une cellule cible lors de l'auto-remplissage
     * @param {HTMLElement} cell - Cellule à mettre à jour
     * @param {*} value - Valeur à définir
     * @param {string} columnId - ID de la colonne
     */
    updateTargetCell(cell, value, columnId) {
        if (!cell) return;
        
        // Type de contenu attendu pour le plugin Choice
        const type = cell.getAttribute('data-choice-type');
        const stringValue = value === null || value === undefined ? '' : String(value);
        
        // Mettre à jour l'attribut data-value
        cell.setAttribute('data-value', stringValue);
        
        // Mettre à jour l'affichage selon le type de cellule
        if (type === 'multiple') {
            // Pour les cellules multiples, utiliser la méthode dédiée
            const multipleValues = stringValue ? stringValue.split(',').map(v => v.trim()).filter(Boolean) : [];
            const choiceColumn = cell.getAttribute('data-choice-column') || cell.id.split('_')[0];
            
            if (choiceColumn) {
                this.updateMultipleCell(cell, multipleValues, choiceColumn);
                return; // La méthode updateMultipleCell s'occupe de tout
            }
        }
        
        // Pour les types toggle et searchable ou cellules normales
        const columnConfig = this.getColumnConfig(columnId);
        let displayText = stringValue;
        
        // Si c'est une cellule Choice, rechercher le label correspondant
        if (columnConfig && (type === 'toggle' || type === 'searchable')) {
            const choice = columnConfig.values.find(c => 
                (typeof c === 'object' ? c.value : c) === stringValue
            );
            
            if (choice) {
                displayText = typeof choice === 'object' ? choice.label : choice;
            }
        }
        
        // Mettre à jour le contenu
        const wrapper = cell.querySelector('.cell-wrapper');
        if (wrapper) {
            wrapper.innerHTML = displayText;
        } else {
            cell.textContent = displayText;
        }
        
        // Déclencher un événement de changement
        const row = cell.closest('tr');
        const eventId = `choice-autofill-${columnId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const changeEvent = new CustomEvent('cell:change', {
            detail: {
                cell,
                value: stringValue,
                columnId,
                rowId: row?.id,
                source: 'choice-autofill',
                tableId: this.table?.table?.id,
                isModified: true,
                eventId
            },
            bubbles: true
        });
        
        if (this.table?.table) {
            this.table.table.dispatchEvent(changeEvent);
        }
        
        // Réappliquer les plugins si la méthode existe
        if (this.table && typeof this.table.reapplyPluginsToCell === 'function') {
            this.table.reapplyPluginsToCell(cell, columnId);
        }
    }
}