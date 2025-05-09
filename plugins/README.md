# TableFlow Plugins

Documentation complète des plugins pour la bibliothèque TableFlow.

## Table des matières

1. [Introduction](#introduction)
2. [Plugins disponibles](#plugins-disponibles)
3. [Plugin Actions](#plugin-actions)
4. [Plugin Choice](#plugin-choice)
5. [Plugin Color](#plugin-color)
6. [Plugin ColumnReorder](#plugin-columnreorder)
7. [Développer un nouveau plugin](#développer-un-nouveau-plugin)

## Introduction

Les plugins TableFlow permettent d'étendre les fonctionnalités de base des tableaux avec des comportements spécifiques. Chaque plugin est conçu pour être modulaire et configurable selon les besoins de votre application.

## Plugins disponibles

TableFlow propose plusieurs plugins prêts à l'emploi :

| Plugin | Type | Description |
|--------|------|-------------|
| Actions | action | Gère des boutons d'action dans les cellules (édition, suppression, etc.) |
| Choice | edit | Permet de sélectionner des valeurs dans une liste (toggle ou searchable) |
| Color | edit | Permet de sélectionner des couleurs dans les cellules |
| ColumnReorder | interaction | Permet de réorganiser les colonnes par glisser-déposer |
| ContextMenu | interaction | Ajoute un menu contextuel aux cellules et en-têtes |
| Edit | edit | Permet l'édition directe des cellules |
| FilterAndPaginate | data | Ajoute des fonctionnalités de filtrage et pagination |
| Hide | display | Permet de masquer/afficher des colonnes |
| Highlight | display | Met en évidence des cellules selon des conditions |
| LineToggle | interaction | Permet de plier/déplier des lignes hiérarchiques |
| Selection | interaction | Permet la sélection de cellules ou lignes |
| Sort | data | Ajoute le tri des colonnes |
| TextEditor | edit | Éditeur de texte avancé pour les cellules |
| Validation | data | Valide les données des cellules selon des règles |

## Plugin Actions

Le plugin Actions permet d'ajouter des boutons d'action dans les cellules d'un tableau, comme des boutons d'édition, de suppression, de sauvegarde, etc.

### Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ActionsPlugin from 'path/to/tableFlow/plugins/actions';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const actionsPlugin = new ActionsPlugin({
    // Configuration du plugin
});

table.registerPlugin(actionsPlugin);
```

### Configuration

```javascript
const actionsPlugin = new ActionsPlugin({
    actionAttribute: 'th-actions',        // Attribut HTML pour marquer les colonnes d'actions
    sqlExcludeAttribute: 'th-sql-exclude', // Attribut pour exclure des colonnes de la collecte de données
    cellClass: 'td-actions',              // Classe CSS pour les cellules d'actions
    useIcons: true,                       // Utiliser des icônes pour les actions
    debug: false,                         // Mode debug
    showOnChange: [],                     // Actions à afficher uniquement quand la ligne est modifiée
    modifiedClass: 'modified',            // Classe CSS pour les lignes modifiées
    actions: {                            // Configuration des actions disponibles
        save: {
            icon: '<i class="fas fa-save"></i>',
            handler: (context) => {
                // Code pour sauvegarder la ligne
                console.log('Saving row:', context.data);
            },
            tooltip: 'Sauvegarder',       // Texte d'info-bulle
            showOnChange: true,           // Afficher uniquement quand la ligne est modifiée
            isDisabled: (data, row) => {  // Fonction pour désactiver conditionnellement
                return data.status === 'locked';
            }
        },
        delete: {
            icon: '<i class="fas fa-trash"></i>',
            handler: (context) => {
                // Code pour supprimer la ligne
                console.log('Deleting row:', context.data);
            },
            tooltip: 'Supprimer'
        }
    },
    confirmMessages: {                    // Messages de confirmation
        delete: 'Êtes-vous sûr de vouloir supprimer cette ligne ?'
    },
    autoSave: false,                      // Sauvegarder automatiquement après modification
    actionButtonClass: 'action-button',   // Classe pour les boutons d'action
    actionButtonActiveClass: 'active',    // Classe pour les boutons actifs
    actionButtonDisabledClass: 'disabled', // Classe pour les boutons désactivés
    tooltipAttribute: 'data-tooltip',     // Attribut pour les tooltips
    tooltipPosition: 'top'                // Position par défaut des tooltips
});
```

### Utilisation dans le HTML

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="email">Email</th>
            <th id="actions" th-actions="edit,delete,save">Actions</th>
        </tr>
    </thead>
    <tbody>
        <!-- Les cellules d'action seront automatiquement configurées -->
    </tbody>
</table>
```

### Méthodes publiques

- `markRowAsSaved(row, options)` : Marque une ligne comme sauvegardée
- `updateActionButtons(row, options)` : Met à jour les boutons d'action d'une ligne
- `refreshRow(row)` : Rafraîchit une ligne et ses boutons d'action
- `executeAction(actionName, cell, options)` : Exécute une action spécifique

### Événements

Le plugin écoute et émet plusieurs événements :

- Écoute : `cell:change`, `row:saved`, `row:added`
- Émet : `cell:saved`, `row:saved`, `row:refresh`

### Contexte d'action

Lorsqu'une action est exécutée, un objet contexte est passé au handler avec les propriétés suivantes :

```javascript
{
    row,            // Élément DOM de la ligne
    cell,           // Élément DOM de la cellule d'action
    tableHandler,   // Instance de TableFlow
    data,           // Données de la ligne sous forme d'objet
    source,         // Source de l'action ('manual', 'autoSave', etc.)
    utils: {        // Méthodes utilitaires
        markRowAsSaved: (options) => {},
        updateActionButtons: (options) => {},
        refreshRow: () => {}
    }
}
```

## Plugin Choice

Le plugin Choice permet de créer des cellules avec sélection de valeurs, soit en mode toggle (basculement entre options) soit en mode searchable (recherche dans une liste déroulante).

### Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ChoicePlugin from 'path/to/tableFlow/plugins/choice';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const choicePlugin = new ChoicePlugin({
    // Configuration du plugin
});

table.registerPlugin(choicePlugin);
```

### Configuration

```javascript
const choicePlugin = new ChoicePlugin({
    choiceAttribute: 'th-choice',         // Attribut HTML pour marquer les colonnes de choix
    cellClass: 'choice-cell',             // Classe CSS pour les cellules de choix
    readOnlyClass: 'readonly',            // Classe CSS pour les cellules en lecture seule
    modifiedClass: 'modified',            // Classe CSS pour les lignes modifiées
    debug: false,                         // Mode debug
    columns: {                            // Configuration par colonne
        status: {                         // ID de la colonne
            type: 'toggle',               // Type: 'toggle' ou 'searchable'
            values: [                     // Valeurs disponibles
                { value: 'active', label: 'Actif' },
                { value: 'inactive', label: 'Inactif' },
                { value: 'pending', label: 'En attente', readOnly: true }
            ],
            readOnlyValues: [             // Valeurs en lecture seule
                { value: 'locked', class: 'readonly-locked' }
            ]
        },
        category: {
            type: 'searchable',           // Type avec recherche
            values: [                     // Liste initiale de valeurs
                { value: '1', label: 'Catégorie 1' },
                { value: '2', label: 'Catégorie 2' }
            ],
            searchable: {                 // Options pour le mode searchable
                minWidth: '250px',
                placeholder: 'Rechercher une catégorie...',
                noResultsText: 'Aucune catégorie trouvée'
            },
            ajax: {                       // Configuration AJAX pour charger les options
                enabled: true,
                url: '/api/categories',
                method: 'GET',
                minChars: 2,
                debounceTime: 300,
                paramName: 'query',
                responseParser: (data) => data.items,
                extraParams: { type: 'active' }
            },
            autoFill: {                   // Auto-remplissage d'autres cellules
                enabled: true,
                mappings: {
                    'description': 'categoryDescription',
                    'code': 'categoryCode'
                }
            }
        }
    }
});
```

### Utilisation dans le HTML

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="status" th-choice>Statut</th>
            <th id="category" th-choice="searchable">Catégorie</th>
        </tr>
    </thead>
    <tbody>
        <!-- Les cellules de choix seront automatiquement configurées -->
    </tbody>
</table>
```

### Événements

Le plugin écoute et émet plusieurs événements :

- Écoute : `click`, `cell:saved`, `row:saved`, `row:added`
- Émet : `cell:change`

## Plugin Color

Le plugin Color permet de créer des cellules avec sélection de couleur.

### Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ColorPlugin from 'path/to/tableFlow/plugins/color';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const colorPlugin = new ColorPlugin({
    // Configuration du plugin
});

table.registerPlugin(colorPlugin);
```

### Configuration

```javascript
const colorPlugin = new ColorPlugin({
    colorAttribute: 'th-color',           // Attribut HTML pour marquer les colonnes de couleur
    cellClass: 'td-color',                // Classe CSS pour les cellules de couleur
    readOnlyClass: 'readonly',            // Classe CSS pour les cellules en lecture seule
    modifiedClass: 'modified',            // Classe CSS pour les lignes modifiées
    debug: false,                         // Mode debug
    customClass: 'my-color-picker'        // Classe CSS personnalisée pour le sélecteur de couleur
});
```

### Utilisation dans le HTML

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="color" th-color>Couleur</th>
        </tr>
    </thead>
    <tbody>
        <!-- Les cellules de couleur seront automatiquement configurées -->
    </tbody>
</table>
```

### Événements

Le plugin écoute et émet plusieurs événements :

- Écoute : `cell:saved`, `row:saved`, `row:added`
- Émet : `cell:change`

## Plugin ColumnReorder

Le plugin ColumnReorder permet de réorganiser les colonnes d'un tableau par glisser-déposer.

### Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ColumnReorderPlugin from 'path/to/tableFlow/plugins/columnreorder';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const columnReorderPlugin = new ColumnReorderPlugin({
    // Configuration du plugin
});

table.registerPlugin(columnReorderPlugin);
```

### Configuration

```javascript
const columnReorderPlugin = new ColumnReorderPlugin({
    enabled: true,                        // Activer/désactiver le plugin
    handleSelector: '.column-drag-handle', // Sélecteur CSS pour la poignée de glisser-déposer
    handleHTML: '<div class="column-drag-handle" title="Glisser pour réorganiser"><i class="fas fa-grip-vertical"></i></div>',
    handlePosition: 'prepend',            // Position de la poignée: 'prepend', 'append', 'replace'
    reorderableClass: 'reorderable-column', // Classe pour les colonnes réorganisables
    draggingClass: 'column-dragging',     // Classe lors du glissement
    dropIndicatorClass: 'column-drop-indicator', // Classe pour l'indicateur de dépôt
    headerContainerClass: 'column-header-container', // Classe pour le conteneur d'en-tête
    dragThreshold: 5,                     // Seuil de déplacement minimal pour déclencher le glissement
    animationDuration: 300,               // Durée de l'animation (ms)
    excludeSelector: '[th-noreorder]',    // Sélecteur CSS pour exclure des colonnes
    persistOrder: true,                   // Enregistrer l'ordre dans le localStorage
    storageKey: 'myTable_columnOrder',    // Clé pour localStorage
    dragImage: null,                      // Image personnalisée pour le glisser-déposer
    dragImageOpacity: 0.7,                // Opacité de l'image de glissement
    
    // Callbacks
    onColumnReorder: (details) => {       // Fonction appelée après réorganisation
        console.log('Column reordered:', details);
    },
    onDragStart: (details) => {           // Fonction appelée au début du glissement
        console.log('Drag started:', details);
    },
    onDragEnd: (details) => {             // Fonction appelée à la fin du glissement
        console.log('Drag ended:', details);
    },
    
    debug: false                          // Mode debug
});
```

### Utilisation dans le HTML

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="email">Email</th>
            <th id="status" th-noreorder>Statut</th> <!-- Cette colonne ne sera pas réorganisable -->
        </tr>
    </thead>
    <tbody>
        <!-- Le contenu du tableau -->
    </tbody>
</table>
```

### Méthodes publiques

- `resetColumnOrder()` : Réinitialise l'ordre des colonnes à l'ordre original
- `getColumnOrder()` : Retourne l'ordre actuel des colonnes
- `setColumnOrder(newOrder, persist)` : Définit l'ordre des colonnes programmatiquement
- `setEnabled(enabled)` : Active ou désactive le plugin
- `isColumnReorderable(columnIndex)` : Vérifie si une colonne est réorganisable

### Événements

Le plugin émet plusieurs événements :

- `column:reordered` : Émis lorsqu'une colonne est réorganisée
- `column:orderreset` : Émis lorsque l'ordre des colonnes est réinitialisé

## Développer un nouveau plugin

Pour créer un nouveau plugin pour TableFlow, suivez cette structure de base :

```javascript
export default class MyCustomPlugin {
    constructor(config = {}) {
        this.name = 'mycustomplugin';     // Nom unique du plugin
        this.version = '1.0.0';           // Version du plugin
        this.type = 'custom';             // Type de plugin (action, edit, display, data, interaction)
        this.table = null;                // Référence à l'instance TableFlow
        this.dependencies = [];           // Dépendances à d'autres plugins
        
        // Configuration par défaut
        this.config = {
            debug: false,
            // Autres options de configuration
            ...config
        };
        
        // Fonction de debug
        this.debug = this.config.debug ?
            (...args) => console.log(`[${this.name}]`, ...args) :
            () => {};
            
        // Lier les méthodes pour préserver le contexte
        this.handleEvent = this.handleEvent.bind(this);
    }
    
    // Méthode d'initialisation appelée par TableFlow
    init(tableHandler) {
        this.table = tableHandler;
        this.debug('Plugin initialized');
        
        // Initialisation du plugin
        this.setupEventListeners();
    }
    
    // Configuration des écouteurs d'événements
    setupEventListeners() {
        if (!this.table?.table) return;
        
        this.table.table.addEventListener('some:event', this.handleEvent);
    }
    
    // Gestionnaire d'événement
    handleEvent(event) {
        // Traitement de l'événement
    }
    
    // Méthode appelée pour rafraîchir le plugin
    refresh() {
        this.debug('Plugin refreshed');
        // Code de rafraîchissement
    }
    
    // Méthode appelée lors de la destruction du plugin
    destroy() {
        this.debug('Plugin destroyed');
        
        // Nettoyage des écouteurs d'événements
        if (this.table?.table) {
            this.table.table.removeEventListener('some:event', this.handleEvent);
        }
        
        // Autres opérations de nettoyage
    }
}
```

### Intégration avec TableFlow

Pour enregistrer votre plugin dans TableFlow :

```javascript
import TableFlow from 'path/to/tableFlow';
import MyCustomPlugin from './myCustomPlugin';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const myPlugin = new MyCustomPlugin({
    // Configuration du plugin
});

table.registerPlugin(myPlugin);
```

### Bonnes pratiques

1. Utilisez toujours des noms uniques pour vos plugins
2. Documentez clairement les options de configuration
3. Implémentez les méthodes `init()`, `refresh()` et `destroy()`
4. Nettoyez correctement les ressources dans `destroy()`
5. Utilisez le système d'événements pour communiquer avec TableFlow et d'autres plugins
6. Respectez le cycle de vie des plugins
7. Utilisez le mode debug pour faciliter le développement et le débogage