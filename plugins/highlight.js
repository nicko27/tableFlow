export default class HighlightPlugin {
    constructor(config = {}) {
        this.name = 'highlight';
        this.version = '1.1.0';
        this.type = 'display';
        this.table = null;
        this.editPlugin = null;
        this.contextMenuPlugin = null;
        
        // Configuration par défaut
        const defaultConfig = {
            // Options générales
            highlightEnabled: true,  
            highlightDuringEdit: true,
            highlightClass: 'tf-highlight',
            spanClass: 'tf-highlight-span',
            
            // Clé pour le stockage des règles
            storageKey: 'tableflow-highlight-rules',
            
            // Définition des groupes (entièrement configurable)
            groups: [
                {
                    id: 'red',
                    name: 'Rouge', 
                    color: '#FF0000',
                    backgroundColor: 'transparent',
                    priority: 0
                },
                {
                    id: 'yellow',
                    name: 'Jaune', 
                    color: '#000000',
                    backgroundColor: '#FFFF00',
                    priority: 1
                },
                {
                    id: 'ignored',
                    name: 'Ignoré',
                    isExclusion: true, // Groupe spécial pour définir des exclusions
                    priority: 10
                }
            ],
            
            // Règles par groupe
            rules: [],
            
            // Options pour le menu contextuel
            menuEnabled: true,
            menuSection: 'Surlignage',
            
            // Options pour la création de règles
            ruleCreation: {
                enabled: true,
                useAjax: false,
                ajaxUrl: '/api/rules',
                ajaxMethod: 'POST',
                ajaxHeaders: {},
                ajaxCallback: null,
            },
            
            // Options pour l'interface utilisateur
            ui: {
                showGroupHeaders: true,
                groupByColor: true,
                allowExport: true,
                allowImport: true,
                modalClass: 'tf-highlight-modal',
                buttonClass: 'tf-highlight-button',
                formClass: 'tf-highlight-form',
                inputClass: 'tf-highlight-input'
            },
            
            debug: false
        };
        
        // Fusion de la configuration par défaut avec celle fournie
        this.config = this._mergeConfigs(defaultConfig, config);
        
        // Fonction de debug conditionnelle
        this.debug = this.config.debug ? 
            (...args) => console.log('[HighlightPlugin]', ...args) : 
            () => {};
            
        // Charger les règles sauvegardées si le stockage local est activé
        if (this.config.storageKey) {
            this.loadRules();
        }
    }
    
    // Fusion profonde des configurations
    _mergeConfigs(defaultConfig, userConfig) {
        const result = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (userConfig[key] === null || userConfig[key] === undefined) {
                continue;
            }
            
            if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key]) && 
                typeof defaultConfig[key] === 'object' && !Array.isArray(defaultConfig[key])) {
                // Fusion récursive des objets
                result[key] = this._mergeConfigs(defaultConfig[key], userConfig[key]);
            } else {
                // Remplacement direct pour les non-objets ou les tableaux
                result[key] = userConfig[key];
            }
        }
        
        return result;
    }
    
    init(tableHandler) {
        this.table = tableHandler;
        
        // Trouver les plugins nécessaires
        this.editPlugin = this.table.getPlugin('edit');
        if (!this.editPlugin) {
            console.error('HighlightPlugin: Edit plugin is required but not found');
            return;
        }
        
        // Rechercher le plugin de menu contextuel (optionnel)
        if (this.config.menuEnabled) {
            this.contextMenuPlugin = this.table.getPlugin('contextMenu');
            if (this.contextMenuPlugin) {
                // S'enregistrer comme fournisseur de menu
                this.contextMenuPlugin.registerProvider(this);
            } else {
                this.debug('ContextMenu plugin not found, highlight context menu will be disabled');
            }
        }
        
        // S'enregistrer aux hooks du plugin Edit
        this.registerWithEditPlugin();
        
        // Appliquer le surlignage initial
        this.highlightAllCells();
    }
    
    registerWithEditPlugin() {
        // S'abonner au hook de rendu pour personnaliser l'affichage
        this.editPlugin.addHook('onRender', this.handleRender.bind(this));
        
        // S'abonner au hook de création de champ d'édition pour gérer l'édition avec surlignage
        if (this.config.highlightDuringEdit) {
            this.editPlugin.addHook('afterEdit', this.setupHighlightedEditing.bind(this));
        }
    }
    
    // Hook de rendu pour surligner le texte
    handleRender(cell, value) {
        // Si le surlignage est désactivé ou la cellule n'est pas gérable, ne rien faire
        if (!this.config.highlightEnabled || !this.isCellHighlightable(cell)) {
            return true;
        }
        
        // Appliquer le surlignage
        const highlightedText = this.highlightText(value);
        
        // Mettre à jour le contenu du wrapper
        const wrapper = cell.querySelector('.cell-wrapper') || cell;
        wrapper.innerHTML = highlightedText;
        
        // Indiquer que nous avons géré le rendu
        return false;
    }
    
    // Vérifier si une cellule peut être surlignée
    isCellHighlightable(cell) {
        // Vérifier que c'est bien une cellule éditable
        return cell && cell.classList.contains(this.editPlugin.config.cellClass);
    }
    
    // Configuration de l'édition avec surlignage
    setupHighlightedEditing(cell, input, currentValue) {
        // Si le surlignage pendant l'édition est désactivé, ne rien faire
        if (!this.config.highlightDuringEdit) {
            return true;
        }
        
        // Créer la structure pour l'édition avec surlignage
        this.setupHighlightedEditField(cell, input, currentValue);
    }
    
    setupHighlightedEditField(cell, input, currentValue) {
        // Remplacer l'input standard par notre système de surlignage
        const container = document.createElement('div');
        container.className = 'tf-highlight-edit-container';
        container.style.position = 'relative';
        container.style.width = '100%';
        
        // Conserver l'input original mais le rendre transparent
        input.className += ' tf-highlight-edit-input';
        input.style.position = 'relative';
        input.style.background = 'transparent';
        input.style.color = 'transparent';
        input.style.caretColor = 'black'; // Pour voir le curseur
        input.style.width = '100%';
        
        // Créer la couche de surlignage (overlay)
        const overlay = document.createElement('div');
        overlay.className = 'tf-highlight-edit-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.whiteSpace = 'pre-wrap';
        overlay.style.overflow = 'hidden';
        
        // Appliquer le surlignage initial
        overlay.innerHTML = this.highlightText(currentValue);
        
        // Ajouter l'événement de mise à jour en temps réel
        input.addEventListener('input', () => {
            overlay.innerHTML = this.highlightText(input.value);
        });
        
        // Construire la structure DOM
        const wrapper = cell.querySelector('.cell-wrapper') || cell;
        wrapper.innerHTML = '';
        
        container.appendChild(overlay);
        container.appendChild(input);
        wrapper.appendChild(container);
        
        // Focus sur l'input
        input.focus();
    }
    
    // Récupérer un groupe par son ID
    getGroupById(groupId) {
        return this.config.groups.find(group => group.id === groupId);
    }
    
    // Surlignage du texte avec les groupes
    highlightText(text) {
        if (!text || typeof text !== 'string' || !this.config.highlightEnabled) {
            return text;
        }
        
        // Préparation des règles d'exclusion
        const exclusionPatterns = this.config.rules
            .filter(rule => {
                const group = this.getGroupById(rule.group);
                return group && group.isExclusion;
            })
            .map(rule => rule.regex);
        
        // Collecter toutes les correspondances
        let matches = [];
        
        for (const rule of this.config.rules) {
            // Récupérer le groupe associé à cette règle
            const group = this.getGroupById(rule.group);
            if (!group) continue; // Ignorer les règles sans groupe valide
            
            // Ignorer les règles d'exclusion dans cette étape
            if (group.isExclusion) continue;
            
            // Ignorer les règles désactivées
            if (rule.enabled === false) continue;
            
            try {
                const regex = new RegExp(rule.regex, 'g');
                let match;
                
                while ((match = regex.exec(text)) !== null) {
                    const matchText = match[0];
                    
                    // Vérifier si ce match doit être ignoré (par les exclusions)
                    let excluded = false;
                    
                    // Vérifier les exclusions globales
                    for (const exclusion of exclusionPatterns) {
                        try {
                            const exclusionRegex = new RegExp(exclusion);
                            if (exclusionRegex.test(matchText)) {
                                excluded = true;
                                break;
                            }
                        } catch (e) {
                            // Ignorer les regex invalides
                        }
                    }
                    
                    // Si le match a ses propres exclusions, les vérifier aussi
                    if (!excluded && rule.exclusions && Array.isArray(rule.exclusions)) {
                        for (const exclusion of rule.exclusions) {
                            try {
                                const exclusionRegex = new RegExp(exclusion);
                                if (exclusionRegex.test(matchText)) {
                                    excluded = true;
                                    break;
                                }
                            } catch (e) {
                                // Ignorer les regex invalides
                            }
                        }
                    }
                    
                    // Ajouter le match s'il n'est pas exclu
                    if (!excluded) {
                        matches.push({
                            start: match.index,
                            end: match.index + matchText.length,
                            text: matchText,
                            group: group,
                            priority: group.priority || 0
                        });
                    }
                }
            } catch (error) {
                console.error(`Invalid regex in highlight rule:`, rule, error);
            }
        }
        
        // Si aucune correspondance, retourner le texte original
        if (matches.length === 0) {
            return text;
        }
        
        // Trier les correspondances et résoudre les chevauchements
        matches.sort((a, b) => a.start - b.start);
        const nonOverlappingMatches = this.resolveOverlaps(matches);
        
        // Construire le HTML surligné
        nonOverlappingMatches.sort((a, b) => b.end - a.end);
        
        let highlightedText = text;
        for (const match of nonOverlappingMatches) {
            const beforeMatch = highlightedText.substring(0, match.start);
            const matchText = highlightedText.substring(match.start, match.end);
            const afterMatch = highlightedText.substring(match.end);
            
            const spanStyle = `background-color: ${match.group.backgroundColor || 'transparent'}; color: ${match.group.color || 'inherit'};`;
            
            highlightedText = beforeMatch + 
                            `<span class="${this.config.spanClass}" style="${spanStyle}" data-group="${match.group.id}">` + 
                            matchText + 
                            '</span>' + 
                            afterMatch;
        }
        
        return highlightedText;
    }
    
    // Résoudre les chevauchements entre correspondances
    resolveOverlaps(matches) {
        if (matches.length <= 1) {
            return matches;
        }
        
        // Trier par priorité du groupe (valeur numérique la plus basse = priorité la plus haute)
        matches.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        
        const result = [];
        const segments = new Map(); // Map pour suivre les segments de texte déjà attribués
        
        for (const match of matches) {
            let canAdd = true;
            let start = match.start;
            let end = match.end;
            
            // Vérifier les chevauchements avec les segments existants
            for (let pos = start; pos < end; pos++) {
                if (segments.has(pos)) {
                    // Ce point est déjà couvert par un match avec priorité plus élevée
                    canAdd = false;
                    break;
                }
            }
            
            if (canAdd) {
                // Marquer tous les points de ce match comme couverts
                for (let pos = start; pos < end; pos++) {
                    segments.set(pos, match);
                }
                result.push(match);
            }
        }
        
        return result;
    }
    
    // Appliquer le surlignage à toutes les cellules
    highlightAllCells() {
        if (!this.table?.table || !this.config.highlightEnabled) {
            return;
        }
        
        const editCells = this.table.table.querySelectorAll('.' + this.editPlugin.config.cellClass);
        editCells.forEach(cell => {
            // Ne pas modifier les cellules en cours d'édition
            if (cell.querySelector('input')) {
                return;
            }
            
            const value = cell.getAttribute('data-value') || cell.textContent.trim();
            if (!value) {
                return;
            }
            
            // Appliquer le surlignage
            const wrapper = cell.querySelector('.cell-wrapper') || cell;
            wrapper.innerHTML = this.highlightText(value);
        });
        
        this.debug('Highlighting applied to all cells');
    }
    
    // Chargement des règles depuis le stockage local
    loadRules() {
        try {
            const savedData = localStorage.getItem(this.config.storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Charger les groupes si fournis
                if (data.groups && Array.isArray(data.groups)) {
                    this.config.groups = data.groups;
                }
                
                // Charger les règles
                if (data.rules && Array.isArray(data.rules)) {
                    this.config.rules = data.rules;
                }
                
                this.debug('Loaded highlight configuration:', { groups: this.config.groups.length, rules: this.config.rules.length });
            }
        } catch (error) {
            console.error('Error loading highlight configuration:', error);
        }
    }
    
    // Sauvegarde des règles dans le stockage local
    saveRules() {
        if (!this.config.storageKey) return;
        
        try {
            const dataToSave = {
                groups: this.config.groups,
                rules: this.config.rules
            };
            
            localStorage.setItem(this.config.storageKey, JSON.stringify(dataToSave));
            this.debug('Saved highlight configuration');
        } catch (error) {
            console.error('Error saving highlight configuration:', error);
        }
    }
    
    // Ajouter une nouvelle règle
    addRule(rule) {
        // Si la création de règles est désactivée, ne rien faire
        if (!this.config.ruleCreation.enabled) {
            this.debug('Rule creation is disabled');
            return null;
        }
        
        // Vérifier la validité minimale de la règle
        if (!rule.group || !rule.regex) {
            console.error('Invalid rule: missing group or regex', rule);
            return null;
        }
        
        // Vérifier que le groupe existe
        const group = this.getGroupById(rule.group);
        if (!group) {
            console.error(`Group '${rule.group}' not found`);
            return null;
        }
        
        // Générer un ID unique si non fourni
        if (!rule.id) {
            rule.id = 'rule_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }
        
        // Si AJAX est activé, envoyer la règle au serveur
        if (this.config.ruleCreation.useAjax) {
            return this.sendRuleToServer(rule);
        }
        
        // Sinon, procéder à l'ajout local
        this.config.rules.push(rule);
        this.saveRules();
        this.highlightAllCells();
        
        return rule;
    }
    
    // Envoi d'une règle au serveur via AJAX
    sendRuleToServer(rule) {
        const { ajaxUrl, ajaxMethod, ajaxHeaders, ajaxCallback } = this.config.ruleCreation;
        
        return fetch(ajaxUrl, {
            method: ajaxMethod,
            headers: {
                'Content-Type': 'application/json',
                ...ajaxHeaders
            },
            body: JSON.stringify(rule)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Si le serveur a répondu avec une règle mise à jour, l'utiliser
            const serverRule = data.rule || rule;
            
            // Ajouter la règle localement
            this.config.rules.push(serverRule);
            this.saveRules();
            this.highlightAllCells();
            
            // Appeler le callback si fourni
            if (typeof ajaxCallback === 'function') {
                ajaxCallback(serverRule, data);
            }
            
            return serverRule;
        })
        .catch(error => {
            console.error('Error sending rule to server:', error);
            return null;
        });
    }
    
    // Mettre à jour une règle existante
    updateRule(ruleId, updates) {
        const index = this.config.rules.findIndex(r => r.id === ruleId);
        if (index === -1) {
            return false;
        }
        
        // Mettre à jour les propriétés
        this.config.rules[index] = {
            ...this.config.rules[index],
            ...updates
        };
        
        this.saveRules();
        this.highlightAllCells();
        
        return true;
    }
    
    // Supprimer une règle
    deleteRule(ruleId) {
        const index = this.config.rules.findIndex(r => r.id === ruleId);
        if (index === -1) {
            return false;
        }
        
        this.config.rules.splice(index, 1);
        this.saveRules();
        this.highlightAllCells();
        
        return true;
    }
    
    // Activer/désactiver le surlignage global
    toggleHighlighting(enabled) {
        this.config.highlightEnabled = enabled !== undefined ? enabled : !this.config.highlightEnabled;
        
        if (this.config.highlightEnabled) {
            this.highlightAllCells();
        } else {
            // Restaurer les textes originaux
            const editCells = this.table.table.querySelectorAll('.' + this.editPlugin.config.cellClass);
            editCells.forEach(cell => {
                const value = cell.getAttribute('data-value');
                if (value) {
                    const wrapper = cell.querySelector('.cell-wrapper') || cell;
                    wrapper.textContent = value;
                }
            });
        }
        
        return this.config.highlightEnabled;
    }
    
    /**************************************************************
     * INTERFACE MENU CONTEXTUEL
     **************************************************************/
    
    // Méthode pour fournir des éléments de menu au ContextMenuPlugin
    getMenuItems(cell) {
        // Ne fournir des éléments que pour les cellules éditables
        if (!cell || !cell.classList.contains(this.editPlugin.config.cellClass)) {
            return [];
        }
        
        const items = [];
        
        // En-tête de section
        if (this.config.menuSection) {
            items.push({
                type: 'header',
                label: this.config.menuSection
            });
        }
        
        // Option pour activer/désactiver le surlignage
        items.push({
            id: 'toggleHighlighting',
            label: this.config.highlightEnabled ? 'Désactiver le surlignage' : 'Activer le surlignage',
            icon: this.config.highlightEnabled ? '👁️' : '👁️‍🗨️'
        });
        
        // Options pour ajouter une règle selon le groupe
        if (this.config.ruleCreation.enabled) {
            const selection = window.getSelection();
            const hasSelection = selection && !selection.isCollapsed && selection.toString().trim() !== '';
            
            if (hasSelection) {
                items.push({
                    type: 'header',
                    label: 'Ajouter une règle'
                });
                
                // Ajouter une entrée pour chaque groupe non-exclusion
                this.config.groups
                    .filter(group => !group.isExclusion)
                    .forEach(group => {
                        items.push({
                            id: `addRuleToGroup:${group.id}`,
                            label: `Sélection en ${group.name}`,
                            icon: '✓'
                        });
                    });
                
                // Option pour ajouter à 'Ignoré'
                const ignoredGroup = this.config.groups.find(g => g.isExclusion);
                if (ignoredGroup) {
                    items.push({
                        id: `addRuleToGroup:${ignoredGroup.id}`,
                        label: `Ignorer cette sélection`,
                        icon: '✗'
                    });
                }
            }
        }
        
        // Option pour gérer les règles (ouvre une modale)
        items.push({
            id: 'manageRules',
            label: 'Gérer les règles de surlignage',
            icon: '⚙️'
        });
        
        return items;
    }
    
    // Exécuter une action demandée via le menu contextuel
    executeAction(actionId, cell) {
        if (actionId === 'toggleHighlighting') {
            this.toggleHighlighting();
            return;
        }
        
        if (actionId === 'manageRules') {
            this.showRulesManager();
            return;
        }
        
        // Gestion des actions addRuleToGroup:{groupId}
        if (actionId.startsWith('addRuleToGroup:')) {
            const groupId = actionId.split(':')[1];
            this.createRuleFromSelection(cell, groupId);
            return;
        }
    }
    
    // Créer une règle basée sur la sélection de texte
    createRuleFromSelection(cell, groupId) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            alert('Veuillez d\'abord sélectionner du texte dans la cellule.');
            return;
        }
        
        // Obtenir le texte sélectionné
        const selectedText = selection.toString().trim();
        if (!selectedText) {
            alert('Aucun texte sélectionné.');
            return;
        }
        
        // Vérifier que le groupe existe
        const group = this.getGroupById(groupId);
        if (!group) {
            alert(`Groupe '${groupId}' introuvable.`);
            return;
        }
        
        // Échapper les caractères spéciaux de regex
        const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Créer la nouvelle règle
        const newRule = {
            id: 'rule_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            group: groupId,
            regex: escapedText,
            exclusions: []
        };
        
        // Ajouter la règle
        const addedRule = this.addRule(newRule);
        
        if (addedRule) {
            // Notification succès
            alert(`Règle ajoutée avec succès au groupe '${group.name}'`);
        }
    }
    
    refresh() {
        if (this.config.highlightEnabled) {
            this.highlightAllCells();
        }
    }
    
    destroy() {
        // Se désabonner des hooks du plugin Edit
        if (this.editPlugin && this.editPlugin.hooks) {
            // Trouver et supprimer nos handlers des tableaux de hooks
            if (this.editPlugin.hooks.onRender) {
                const renderIndex = this.editPlugin.hooks.onRender.findIndex(
                    handler => handler.toString().includes('handleRender')
                );
                if (renderIndex !== -1) {
                    this.editPlugin.hooks.onRender.splice(renderIndex, 1);
                    this.debug('Hook onRender supprimé avec succès');
                }
            }
            
            if (this.config.highlightDuringEdit && this.editPlugin.hooks.afterEdit) {
                const afterEditIndex = this.editPlugin.hooks.afterEdit.findIndex(
                    handler => handler.toString().includes('setupHighlightedEditing')
                );
                if (afterEditIndex !== -1) {
                    this.editPlugin.hooks.afterEdit.splice(afterEditIndex, 1);
                    this.debug('Hook afterEdit supprimé avec succès');
                }
            }
        }
        
        // Se désabonner du plugin de menu contextuel
        if (this.contextMenuPlugin && typeof this.contextMenuPlugin.unregisterProvider === 'function') {
            this.contextMenuPlugin.unregisterProvider(this);
            this.debug('Désinscription du fournisseur de menu contextuel');
        }
    }
}