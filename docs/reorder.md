# Plugin Reorder

Le plugin Reorder permet de réorganiser les colonnes et les lignes d'un tableau TableFlow par glisser-déposer. Il offre une expérience utilisateur intuitive pour personnaliser l'affichage des données selon les besoins.

**Version actuelle :** 2.0.0  
**Type :** interaction  
**Auteur :** TableFlow Team

## Fonctionnalités

- Réorganisation des colonnes par glisser-déposer
- Réorganisation des lignes par glisser-déposer (nouveau)
- Poignées de glissement personnalisables
- Indicateur visuel de la position de dépôt
- Persistance de l'ordre dans le localStorage
- Exclusion sélective de colonnes ou lignes
- Animation fluide lors du réordonnancement
- Support pour les événements tactiles (mobile)
- Callbacks pour les événements de réorganisation
- Méthodes pour manipuler l'ordre programmatiquement

## Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ReorderPlugin from 'path/to/tableFlow/plugins/reorder';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const reorderPlugin = new ReorderPlugin({
    // Configuration du plugin
});

table.registerPlugin(reorderPlugin);
```

## Configuration

### Options de base

```javascript
const reorderPlugin = new ReorderPlugin({
    enabled: true,                        // Activer/désactiver le plugin
    mode: 'both',                         // 'columns', 'rows', ou 'both'
    
    // Options générales
    debug: false,                         // Mode debug
    animationDuration: 300,               // Durée de l'animation (ms)
    dragThreshold: 5,                     // Seuil de déplacement minimal pour déclencher le glissement
    
    // Persistance
    persistOrder: true,                   // Enregistrer l'ordre dans le localStorage
    storageKeyPrefix: 'tableFlow_',       // Préfixe pour les clés localStorage
    
    // Options visuelles
    draggingClass: 'reorder-dragging',    // Classe lors du glissement
    dropIndicatorClass: 'reorder-drop-indicator', // Classe pour l'indicateur de dépôt
    dragImageOpacity: 0.7,                // Opacité de l'image de glissement
    dragImage: null,                      // Image personnalisée pour le glisser-déposer
});
```

### Options pour les colonnes

```javascript
const reorderPlugin = new ReorderPlugin({
    // ...options de base
    
    columns: {
        enabled: true,                    // Activer la réorganisation des colonnes
        handleSelector: '.column-drag-handle', // Sélecteur CSS pour la poignée
        handleHTML: '<div class="column-drag-handle" title="Glisser pour réorganiser"><i class="fas fa-grip-vertical"></i></div>',
        handlePosition: 'prepend',        // Position de la poignée: 'prepend', 'append', 'replace'
        reorderableClass: 'reorderable-column', // Classe pour les colonnes réorganisables
        headerContainerClass: 'column-header-container', // Classe pour le conteneur d'en-tête
        excludeSelector: '[th-noreorder]', // Sélecteur CSS pour exclure des colonnes
        
        // Callbacks spécifiques aux colonnes
        onColumnReorder: (details) => {   // Fonction appelée après réorganisation
            console.log('Column reordered:', details);
        }
    }
});
```

### Options pour les lignes

```javascript
const reorderPlugin = new ReorderPlugin({
    // ...options de base
    
    rows: {
        enabled: true,                    // Activer la réorganisation des lignes
        handleSelector: '.row-drag-handle', // Sélecteur CSS pour la poignée
        handleHTML: '<div class="row-drag-handle" title="Glisser pour réorganiser"><i class="fas fa-grip-lines"></i></div>',
        handlePosition: 'prepend',        // Position de la poignée: 'prepend', 'append', 'replace'
        reorderableClass: 'reorderable-row', // Classe pour les lignes réorganisables
        cellContainerClass: 'row-cell-container', // Classe pour le conteneur de cellule
        excludeSelector: '[tr-noreorder]', // Sélecteur CSS pour exclure des lignes
        handleColumn: 0,                  // Index de la colonne où placer la poignée (0 = première colonne)
        
        // Callbacks spécifiques aux lignes
        onRowReorder: (details) => {      // Fonction appelée après réorganisation
            console.log('Row reordered:', details);
        }
    }
});
```

### Callbacks généraux

```javascript
const reorderPlugin = new ReorderPlugin({
    // ...autres options
    
    // Callbacks généraux
    onDragStart: (details) => {           // Fonction appelée au début du glissement
        console.log('Drag started:', details);
    },
    onDragEnd: (details) => {             // Fonction appelée à la fin du glissement
        console.log('Drag ended:', details);
    },
    onReorder: (details) => {             // Fonction appelée après toute réorganisation
        console.log('Reorder completed:', details);
    }
});
```

## Utilisation dans le HTML

### Pour les colonnes

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

### Pour les lignes

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="email">Email</th>
            <th id="status">Statut</th>
        </tr>
    </thead>
    <tbody>
        <tr id="row1">
            <td>John Doe</td>
            <td>john@example.com</td>
            <td>Actif</td>
        </tr>
        <tr id="row2" tr-noreorder> <!-- Cette ligne ne sera pas réorganisable -->
            <td>Jane Smith</td>
            <td>jane@example.com</td>
            <td>Inactif</td>
        </tr>
    </tbody>
</table>
```

## Méthodes publiques

### Méthodes générales

- `setEnabled(enabled)` : Active ou désactive le plugin
- `refresh()` : Rafraîchit le plugin après des modifications de la table

### Méthodes pour les colonnes

- `getColumnOrder()` : Retourne l'ordre actuel des colonnes
- `setColumnOrder(newOrder, persist = true)` : Définit l'ordre des colonnes programmatiquement
- `resetColumnOrder()` : Réinitialise l'ordre des colonnes à l'ordre original
- `isColumnReorderable(columnIndex)` : Vérifie si une colonne est réorganisable

### Méthodes pour les lignes

- `getRowOrder()` : Retourne l'ordre actuel des lignes
- `setRowOrder(newOrder, persist = true)` : Définit l'ordre des lignes programmatiquement
- `resetRowOrder()` : Réinitialise l'ordre des lignes à l'ordre original
- `isRowReorderable(rowIndex)` : Vérifie si une ligne est réorganisable

## Événements

Le plugin émet plusieurs événements :

### Événements pour les colonnes

- `column:reorder:start` : Émis au début du glissement d'une colonne
- `column:reordered` : Émis lorsqu'une colonne est réorganisée
- `column:orderreset` : Émis lorsque l'ordre des colonnes est réinitialisé

### Événements pour les lignes

- `row:reorder:start` : Émis au début du glissement d'une ligne
- `row:reordered` : Émis lorsqu'une ligne est réorganisée
- `row:orderreset` : Émis lorsque l'ordre des lignes est réinitialisé

### Structure des données d'événement

```javascript
// Pour column:reordered
{
    detail: {
        from: 2,                // Index source
        to: 4,                  // Index cible
        columnId: 'name',       // ID de la colonne déplacée
        newOrder: [0, 1, 3, 4, 2, 5] // Nouvel ordre des colonnes
    }
}

// Pour row:reordered
{
    detail: {
        from: 1,                // Index source
        to: 3,                  // Index cible
        rowId: 'row2',          // ID de la ligne déplacée
        newOrder: [0, 2, 3, 1, 4] // Nouvel ordre des lignes
    }
}
```

## Exemples d'utilisation

### Configuration de base (colonnes et lignes)

```javascript
const reorderPlugin = new ReorderPlugin({
    mode: 'both',
    persistOrder: true,
    
    columns: {
        enabled: true,
        handleHTML: '<div class="column-drag-handle"><i class="fas fa-grip-vertical"></i></div>'
    },
    
    rows: {
        enabled: true,
        handleHTML: '<div class="row-drag-handle"><i class="fas fa-grip-lines"></i></div>',
        handleColumn: 0
    },
    
    onReorder: (details) => {
        console.log('Élément réorganisé:', details);
        
        // Exemple: Sauvegarder l'ordre sur le serveur
        if (details.type === 'column') {
            saveColumnOrderToServer(details.newOrder);
        } else if (details.type === 'row') {
            saveRowOrderToServer(details.newOrder);
        }
    }
});
```

### Colonnes uniquement avec callbacks personnalisés

```javascript
const reorderPlugin = new ReorderPlugin({
    mode: 'columns',
    
    columns: {
        enabled: true,
        handlePosition: 'append',
        handleHTML: '<div class="column-drag-handle"><i class="fas fa-arrows-alt"></i></div>',
        
        onColumnReorder: (details) => {
            // Mettre à jour l'interface utilisateur
            updateColumnOrderUI(details.newOrder);
            
            // Sauvegarder l'ordre sur le serveur
            fetch('/api/columns/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableId: 'myTable', order: details.newOrder })
            });
        }
    }
});
```

### Lignes uniquement avec gestion d'événements

```javascript
const reorderPlugin = new ReorderPlugin({
    mode: 'rows',
    
    rows: {
        enabled: true,
        handleColumn: 0,
        excludeSelector: '[data-fixed="true"]'
    }
});

// Écouter les événements de réorganisation
document.getElementById('myTable').addEventListener('row:reordered', (event) => {
    const { from, to, rowId, newOrder } = event.detail;
    
    // Mettre à jour l'ordre des IDs dans la base de données
    const rowIds = Array.from(document.querySelectorAll('#myTable tbody tr'))
        .map(row => row.id);
    
    updateRowOrderInDatabase(rowIds);
});
```

### Utilisation programmatique

```javascript
// Obtenir l'ordre actuel des colonnes
const currentColumnOrder = reorderPlugin.getColumnOrder();
console.log('Ordre actuel des colonnes:', currentColumnOrder);

// Définir un nouvel ordre de colonnes
reorderPlugin.setColumnOrder([3, 0, 1, 2, 4]);

// Réinitialiser l'ordre des lignes
reorderPlugin.resetRowOrder();

// Désactiver temporairement le plugin
reorderPlugin.setEnabled(false);

// Réactiver plus tard
setTimeout(() => {
    reorderPlugin.setEnabled(true);
}, 5000);
```

## Styles CSS recommandés

```css
/* Styles communs */
.reorder-dragging {
    opacity: 0.5;
    cursor: grabbing !important;
}

.reorder-drop-indicator {
    position: fixed;
    background-color: #4f46e5;
    z-index: 1000;
    pointer-events: none;
}

/* Styles pour la réorganisation des colonnes */
.reorderable-column {
    position: relative;
    cursor: grab;
}

.column-header-container {
    display: flex;
    align-items: center;
    width: 100%;
}

.column-drag-handle {
    cursor: grab;
    margin-right: 8px;
    color: #999;
    transition: color 0.2s ease;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.column-drag-handle:hover {
    color: #333;
}

/* Styles pour la réorganisation des lignes */
.reorderable-row {
    cursor: grab;
}

.row-cell-container {
    display: flex;
    align-items: center;
    width: 100%;
}

.row-drag-handle {
    cursor: grab;
    margin-right: 8px;
    color: #999;
    transition: color 0.2s ease;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.row-drag-handle:hover {
    color: #333;
}

/* Indicateurs de position */
.column-drop-indicator {
    width: 4px;
    height: 100%;
}

.row-drop-indicator {
    height: 4px;
    width: 100%;
}
```

## Bonnes pratiques

1. **Choisir le bon mode** : Utilisez le mode approprié ('columns', 'rows', ou 'both') selon vos besoins.

2. **Poignées visuelles claires** : Assurez-vous que les poignées de glissement sont facilement identifiables par les utilisateurs.

3. **Exclusion sélective** : Utilisez les attributs d'exclusion pour les lignes ou colonnes qui ne doivent pas être réorganisées.

4. **Persistance des données** : Si vous utilisez `persistOrder`, assurez-vous de gérer correctement les cas où la structure du tableau change.

5. **Gestion des événements** : Utilisez les événements émis pour synchroniser l'ordre avec votre backend.

6. **Performances** : Pour les grands tableaux, considérez l'utilisation de la virtualisation pour améliorer les performances.

7. **Accessibilité** : Ajoutez des attributs ARIA appropriés pour améliorer l'accessibilité.

8. **Compatibilité mobile** : Testez le comportement sur les appareils tactiles.

## Compatibilité

- Navigateurs modernes : Chrome, Firefox, Safari, Edge
- Support tactile pour les appareils mobiles
- IE11 avec polyfills appropriés

## Implémentation technique

### Réorganisation des colonnes

Le plugin utilise une approche DOM pour réorganiser les colonnes :

1. Lorsqu'une colonne est glissée, un élément fantôme est créé pour représenter visuellement la colonne en cours de déplacement.
2. Un indicateur de position montre où la colonne sera insérée.
3. Lors du dépôt, les cellules de chaque ligne sont réorganisées selon le nouvel ordre.
4. L'ordre est stocké dans le localStorage si `persistOrder` est activé.

### Réorganisation des lignes

Pour les lignes, le processus est similaire :

1. Une poignée est ajoutée à la première cellule de chaque ligne (ou à la cellule spécifiée par `handleColumn`).
2. Lors du glissement, un élément fantôme représente la ligne.
3. Un indicateur horizontal montre où la ligne sera insérée.
4. Lors du dépôt, les lignes du tableau sont réorganisées.
5. L'ordre est stocké dans le localStorage si `persistOrder` est activé.

## Changelog

### Version 2.0.0
- Support complet pour la réorganisation des lignes
- Refactorisation en plugin unifié avec modes 'columns', 'rows', ou 'both'
- Amélioration des indicateurs visuels
- Nouveaux événements et callbacks
- Support amélioré pour les appareils tactiles

### Version 1.0.0
- Version initiale avec support pour la réorganisation des colonnes uniquement