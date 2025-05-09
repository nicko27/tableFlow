# Documentation du Plugin Selection

## Vue d'ensemble

Le plugin Selection ajoute des fonctionnalités avancées de sélection aux tableaux TableFlow. Il permet aux utilisateurs de sélectionner des cellules, des lignes ou des colonnes, et d'effectuer diverses opérations sur ces sélections comme la copie, le collage ou la suppression.

## Version

Version actuelle : 1.1.0

## Fonctionnalités

- Sélection de cellules individuelles, de lignes, de colonnes ou de plages
- Sélection multiple avec les touches Ctrl/Shift
- Sélection par glissement de souris
- Navigation au clavier dans la sélection
- Copier/couper/coller/supprimer le contenu des cellules sélectionnées
- Menu contextuel personnalisable
- Mise en évidence visuelle des lignes et colonnes sélectionnées
- API complète pour manipuler la sélection par programmation

## Options de configuration

```javascript
{
    // Options de sélection
    mode: 'cell',                 // Mode de sélection: 'cell', 'row', 'column', 'multiple'
    selectionClass: 'selected',   // Classe CSS pour les cellules sélectionnées
    rowClass: 'row-selected',     // Classe CSS pour les lignes sélectionnées
    columnClass: 'col-selected',  // Classe CSS pour les colonnes sélectionnées
    multipleClass: 'multiple-selected', // Classe CSS pour les sélections multiples
    enableKeyboard: true,         // Activer la navigation au clavier
    enableMouseDrag: true,        // Activer la sélection par glissement
    shiftSelect: true,            // Activer la sélection avec Shift
    ctrlSelect: true,             // Activer la sélection avec Ctrl
    
    // Mise en forme
    showSelectionBorder: true,    // Afficher une bordure autour de la sélection
    highlightRow: true,           // Mettre en évidence la ligne entière
    highlightColumn: true,        // Mettre en évidence la colonne entière
    animateSelection: true,       // Animer les transitions de sélection
    
    // Événements
    onSelect: null,               // Fonction appelée lors de la sélection
    onDeselect: null,             // Fonction appelée lors de la désélection
    onSelectionChange: null,      // Fonction appelée lors d'un changement de sélection
    
    // Options contextuelles
    showContextMenu: true,        // Afficher un menu contextuel
    menuItems: [                  // Éléments du menu contextuel
        { label: 'Copier', action: 'copy', icon: '<i class="fas fa-copy"></i>' },
        { label: 'Couper', action: 'cut', icon: '<i class="fas fa-cut"></i>' },
        { label: 'Coller', action: 'paste', icon: '<i class="fas fa-paste"></i>' },
        { label: 'Supprimer', action: 'delete', icon: '<i class="fas fa-trash"></i>' }
    ],
    
    // Actions rapides
    enableCopyPaste: true,        // Activer les raccourcis copier/coller
    enableDelete: true,           // Activer la suppression avec Delete
    
    debug: false                  // Mode débogage
}
```

## Modes de sélection

Le plugin propose quatre modes de sélection différents :

- **cell** : Sélection de cellules individuelles
- **row** : Sélection de lignes entières
- **column** : Sélection de colonnes entières
- **multiple** : Sélection de plages de cellules

## Exemples d'utilisation

### Configuration de base

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Selection'],
        select: {
            mode: 'cell',
            debug: true
        }
    }
});
```

### Sélection de lignes avec menu contextuel personnalisé

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Selection'],
        select: {
            mode: 'row',
            showContextMenu: true,
            menuItems: [
                { label: 'Éditer', action: 'edit', icon: '✏️' },
                { label: 'Supprimer', action: 'delete', icon: '🗑️' },
                { label: 'Dupliquer', action: 'duplicate', icon: '📋' }
            ],
            onSelectionChange: function(selection) {
                console.log('Lignes sélectionnées:', selection.rows.length);
            }
        }
    }
});

// Ajouter un gestionnaire pour l'action personnalisée "duplicate"
table.table.addEventListener('contextmenu:action', function(event) {
    if (event.detail.action === 'duplicate') {
        // Logique pour dupliquer la ligne
        const rowData = event.detail.selection.data.rows[0];
        console.log('Dupliquer la ligne:', rowData);
    }
});
```

### Utilisation de l'API pour manipuler la sélection

```javascript
// Obtenir l'instance du plugin
const selectionPlugin = table.getPlugin('select');

// Sélectionner une cellule par son ID
selectionPlugin.selectCellById('nom_1');

// Sélectionner une ligne par son ID
selectionPlugin.selectRowById('2');

// Sélectionner une colonne par son ID
selectionPlugin.selectColumnById('email');

// Effectuer une action sur la sélection
selectionPlugin.doAction('copy');

// Effacer la sélection
selectionPlugin.clearSelection();
```

## Raccourcis clavier

Le plugin prend en charge les raccourcis clavier suivants :

| Raccourci | Action |
|-----------|--------|
| Flèches | Navigation dans la sélection |
| Shift + Flèches | Extension de la sélection |
| Ctrl/Cmd + C | Copier la sélection |
| Ctrl/Cmd + X | Couper la sélection |
| Ctrl/Cmd + V | Coller à partir de la sélection |
| Delete / Backspace | Supprimer le contenu des cellules sélectionnées |
| Ctrl/Cmd + A | Sélectionner toutes les cellules |

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `selectCell(cell, toggleMode)` | Sélectionne une cellule | `cell` - Élément cellule<br>`toggleMode` - Mode bascule (ajoute/retire) |
| `selectRow(row, toggleMode)` | Sélectionne une ligne | `row` - Élément ligne<br>`toggleMode` - Mode bascule |
| `selectColumn(columnIndex, toggleMode)` | Sélectionne une colonne | `columnIndex` - Index de colonne<br>`toggleMode` - Mode bascule |
| `selectAll()` | Sélectionne toutes les cellules | - |
| `clearSelection()` | Efface la sélection actuelle | - |
| `copySelection()` | Copie la sélection dans le presse-papiers | - |
| `cutSelection()` | Coupe la sélection | - |
| `pasteSelection()` | Colle le contenu du presse-papiers | - |
| `deleteSelection()` | Supprime le contenu des cellules sélectionnées | - |
| `selectCellById(cellId, clearPrevious)` | Sélectionne une cellule par ID | `cellId` - ID de la cellule<br>`clearPrevious` - Effacer la sélection précédente |
| `selectRowById(rowId, clearPrevious)` | Sélectionne une ligne par ID | `rowId` - ID de la ligne<br>`clearPrevious` - Effacer la sélection précédente |
| `selectColumnById(columnId, clearPrevious)` | Sélectionne une colonne par ID | `columnId` - ID de la colonne<br>`clearPrevious` - Effacer la sélection précédente |
| `doAction(action)` | Effectue une action sur la sélection | `action` - Nom de l'action |
| `getSelectedData()` | Récupère les données de la sélection | - |
| `refresh()` | Rafraîchit le plugin | - |

## Événements

Le plugin déclenche les événements suivants :

| Événement | Description | Détails |
|-----------|-------------|---------|
| `cells:pasted` | Déclenché après un collage | `{ cells, source }` |
| `cells:deleted` | Déclenché après une suppression | `{ cells, source }` |
| `cell:change` | Déclenché lors d'un changement de cellule | `{ cell, cellId, columnId, rowId, value, source }` |

## Styles CSS

Le plugin ajoute automatiquement les styles CSS suivants :

```css
.selected {
    background-color: rgba(66, 133, 244, 0.1) !important;
    outline: 2px solid rgba(66, 133, 244, 0.5) !important;
    position: relative;
    z-index: 1;
}

.row-selected td {
    background-color: rgba(66, 133, 244, 0.05) !important;
}

.col-selected {
    background-color: rgba(66, 133, 244, 0.05) !important;
}

.multiple-selected {
    background-color: rgba(66, 133, 244, 0.2) !important;
}

/* Animation de sélection */
.selected {
    transition: background-color 0.15s ease-in-out, outline 0.15s ease-in-out;
}

/* Menu contextuel */
.selection-context-menu {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    padding: 5px 0;
    z-index: 1000;
}

.selection-context-menu ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
}

.selection-context-menu li {
    padding: 8px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.selection-context-menu li:hover {
    background-color: #f5f5f5;
}

/* Style pour la table lorsque le drag est actif */
.table-drag-selecting {
    user-select: none;
}
```

## Bonnes pratiques

1. **Choisir le bon mode de sélection** : Utilisez le mode qui correspond le mieux à votre cas d'utilisation (cellule, ligne, colonne).
2. **Personnaliser le menu contextuel** : Adaptez les options du menu contextuel aux actions pertinentes pour votre application.
3. **Utiliser les événements** : Écoutez les événements pour réagir aux changements de sélection et aux actions utilisateur.
4. **Combiner avec d'autres plugins** : Le plugin Selection fonctionne bien avec les plugins Edit et Actions pour créer des tableaux interactifs.
5. **Personnaliser les styles** : Adaptez les styles CSS pour correspondre à votre design.

## Dépannage

| Problème | Solution |
|-------|----------|
| La sélection ne fonctionne pas | Vérifiez que le plugin est correctement initialisé et que le mode de sélection est approprié |
| Le copier-coller ne fonctionne pas | Assurez-vous que `enableCopyPaste` est activé et vérifiez les permissions du navigateur |
| Le menu contextuel ne s'affiche pas | Vérifiez que `showContextMenu` est activé et que les éléments du menu sont correctement définis |
| La sélection multiple ne fonctionne pas | Assurez-vous que `ctrlSelect` et `shiftSelect` sont activés |
| Les styles de sélection sont incorrects | Vérifiez qu'il n'y a pas de conflit CSS avec d'autres styles de votre application |

## Utilisation avancée

### Personnalisation du menu contextuel avec actions dynamiques

```javascript
// Configuration du plugin avec menu contextuel dynamique
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Selection'],
        select: {
            menuItems: function(selection) {
                // Menu contextuel dynamique basé sur la sélection
                const items = [
                    { label: 'Copier', action: 'copy', icon: '📋' }
                ];
                
                // Ajouter des options spécifiques selon le type de sélection
                if (selection.rows.length === 1) {
                    items.push({ label: 'Éditer la ligne', action: 'editRow', icon: '✏️' });
                }
                
                if (selection.cells.size > 1) {
                    items.push({ label: 'Fusionner les cellules', action: 'mergeCells', icon: '🔗' });
                }
                
                return items;
            }
        }
    }
});
```

### Intégration avec un système d'édition personnalisé

```javascript
// Obtenir l'instance du plugin
const selectionPlugin = table.getPlugin('select');

// Ajouter un gestionnaire d'événements pour les changements de sélection
selectionPlugin.config.onSelectionChange = function(selection) {
    // Mettre à jour l'interface utilisateur avec les informations de sélection
    updateSelectionInfo(selection.cells.size, selection.rows.length);
    
    // Activer/désactiver les boutons d'action selon la sélection
    document.getElementById('btnDelete').disabled = selection.cells.size === 0;
    document.getElementById('btnEdit').disabled = selection.cells.size !== 1;
};

// Ajouter des gestionnaires pour les boutons d'action
document.getElementById('btnDelete').addEventListener('click', function() {
    selectionPlugin.deleteSelection();
});

document.getElementById('btnEdit').addEventListener('click', function() {
    const selectedData = selectionPlugin.getSelectedData();
    if (selectedData.cells.length === 1) {
        openEditDialog(selectedData.cells[0]);
    }
});
```

### Sélection programmatique basée sur des critères

```javascript
// Fonction pour sélectionner des cellules basées sur une condition
function selectCellsByCondition(condition) {
    const selectionPlugin = table.getPlugin('select');
    selectionPlugin.clearSelection();
    
    // Parcourir toutes les cellules du tableau
    const rows = table.getAllRows();
    rows.forEach(row => {
        Array.from(row.cells).forEach(cell => {
            const value = cell.getAttribute('data-value') || cell.textContent.trim();
            
            // Appliquer la condition
            if (condition(value, cell)) {
                selectionPlugin.selectCell(cell, true); // Mode toggle pour ajouter à la sélection
            }
        });
    });
    
    // Déclencher l'événement de changement de sélection
    selectionPlugin.triggerSelectionChange();
}

// Exemple d'utilisation: sélectionner toutes les cellules contenant "Error"
selectCellsByCondition(value => value.includes('Error'));
```