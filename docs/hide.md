# Plugin Hide

Le plugin Hide permet de masquer/afficher des colonnes et des lignes dans un tableau TableFlow. Il offre une interface intuitive pour contrôler la visibilité des éléments du tableau et peut persister l'état entre les sessions.

**Version actuelle :** 2.0.0  
**Type :** display  
**Auteur :** TableFlow Team

## Fonctionnalités

- Masquage/affichage de colonnes et lignes
- Boutons de toggle personnalisables
- Masquage initial via attributs HTML
- Persistance de l'état dans le localStorage
- Support pour les événements et callbacks
- API complète pour contrôler la visibilité programmatiquement
- Styles CSS personnalisables

## Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import HidePlugin from 'path/to/tableFlow/plugins/hide';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const hidePlugin = new HidePlugin({
    // Configuration du plugin
});

table.registerPlugin(hidePlugin);
```

## Configuration

### Options de base

```javascript
const hidePlugin = new HidePlugin({
    debug: false,                     // Mode debug
    mode: 'both',                     // 'columns', 'rows', ou 'both'
    
    // Persistance
    persistState: true,               // Enregistrer l'état dans localStorage
    storageKeyPrefix: 'tableFlow_',   // Préfixe pour les clés localStorage
    
    // Callbacks généraux
    onToggle: (details) => {          // Fonction après masquage/affichage
        console.log('Élément basculé:', details);
    }
});
```

### Configuration des colonnes

```javascript
const hidePlugin = new HidePlugin({
    // ...options de base
    
    columns: {
        hideAttribute: 'th-hide',     // Attribut pour masquer les colonnes
        toggleAttribute: 'th-toggle', // Attribut pour ajouter un bouton toggle
        toggleSelector: '.column-toggle', // Sélecteur pour le bouton toggle
        toggleHTML: '<div class="column-toggle" title="Masquer/Afficher"><i class="fas fa-eye-slash"></i></div>',
        togglePosition: 'append',     // 'prepend', 'append'
        hiddenClass: 'hidden-column', // Classe pour les colonnes masquées
        storageKey: null,             // Clé pour localStorage
        onColumnToggle: (details) => {// Callback après masquage/affichage
            console.log('Colonne basculée:', details);
        }
    }
});
```

### Configuration des lignes

```javascript
const hidePlugin = new HidePlugin({
    // ...options de base
    
    rows: {
        hideAttribute: 'tr-hide',     // Attribut pour masquer les lignes
        toggleAttribute: 'tr-toggle', // Attribut pour ajouter un bouton toggle
        toggleSelector: '.row-toggle',// Sélecteur pour le bouton toggle
        toggleHTML: '<div class="row-toggle" title="Masquer/Afficher"><i class="fas fa-eye-slash"></i></div>',
        togglePosition: 'prepend',    // 'prepend', 'append'
        hiddenClass: 'hidden-row',    // Classe pour les lignes masquées
        toggleColumn: 0,              // Index de la colonne pour le bouton toggle
        storageKey: null,             // Clé pour localStorage
        onRowToggle: (details) => {   // Callback après masquage/affichage
            console.log('Ligne basculée:', details);
        }
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
            <!-- Colonne initialement masquée -->
            <th id="phone" th-hide>Téléphone</th>
            <!-- Colonne avec bouton toggle -->
            <th id="address" th-toggle>Adresse</th>
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
        <!-- Ligne initialement masquée -->
        <tr id="row2" tr-hide>
            <td>Jane Smith</td>
            <td>jane@example.com</td>
            <td>Inactif</td>
        </tr>
        <!-- Ligne avec bouton toggle -->
        <tr id="row3" tr-toggle>
            <td>Bob Johnson</td>
            <td>bob@example.com</td>
            <td>En attente</td>
        </tr>
    </tbody>
</table>
```

## Méthodes publiques

### Méthodes pour les colonnes

- `hideColumn(columnIndex, save = true)` : Masque une colonne
- `showColumn(columnIndex, save = true)` : Affiche une colonne
- `toggleColumn(columnIndex)` : Bascule la visibilité d'une colonne
- `isColumnHidden(columnIndex)` : Vérifie si une colonne est masquée

### Méthodes pour les lignes

- `hideRow(rowIndex, save = true)` : Masque une ligne
- `showRow(rowIndex, save = true)` : Affiche une ligne
- `toggleRow(rowIndex)` : Bascule la visibilité d'une ligne
- `isRowHidden(rowIndex)` : Vérifie si une ligne est masquée

### Méthodes générales

- `resetState()` : Réinitialise l'état (affiche toutes les colonnes et lignes)
- `refresh()` : Rafraîchit le plugin après des modifications de la table

## Événements

Le plugin émet plusieurs événements :

### Événements pour les colonnes

- `column:toggle` : Émis lorsqu'une colonne est masquée ou affichée

### Événements pour les lignes

- `row:toggle` : Émis lorsqu'une ligne est masquée ou affichée

### Événements généraux

- `hide:reset` : Émis lorsque l'état est réinitialisé

### Structure des données d'événement

```javascript
// Pour column:toggle
{
    detail: {
        columnId: 'name',      // ID de la colonne
        index: 0,              // Index de la colonne
        isHidden: true         // Si la colonne est masquée
    }
}

// Pour row:toggle
{
    detail: {
        rowId: 'row1',         // ID de la ligne
        index: 0,              // Index de la ligne
        isHidden: true         // Si la ligne est masquée
    }
}
```

## Exemples d'utilisation

### Configuration de base (colonnes et lignes)

```javascript
const hidePlugin = new HidePlugin({
    mode: 'both',
    persistState: true,
    
    columns: {
        toggleHTML: '<div class="column-toggle"><i class="fas fa-eye-slash"></i></div>'
    },
    
    rows: {
        toggleHTML: '<div class="row-toggle"><i class="fas fa-eye-slash"></i></div>',
        toggleColumn: 0
    },
    
    onToggle: (details) => {
        console.log('Élément basculé:', details);
        
        // Exemple: Sauvegarder l'état sur le serveur
        if (details.type === 'column') {
            saveColumnStateToServer(details.columnId, details.isHidden);
        } else if (details.type === 'row') {
            saveRowStateToServer(details.rowId, details.isHidden);
        }
    }
});
```

### Colonnes uniquement avec callbacks personnalisés

```javascript
const hidePlugin = new HidePlugin({
    mode: 'columns',
    
    columns: {
        togglePosition: 'append',
        toggleHTML: '<div class="column-toggle"><i class="fas fa-eye"></i></div>',
        
        onColumnToggle: (details) => {
            // Mettre à jour l'interface utilisateur
            updateColumnVisibilityUI(details.columnId, details.isHidden);
            
            // Sauvegarder l'état sur le serveur
            fetch('/api/columns/visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tableId: 'myTable', 
                    columnId: details.columnId, 
                    isHidden: details.isHidden 
                })
            });
        }
    }
});
```

### Lignes uniquement avec gestion d'événements

```javascript
const hidePlugin = new HidePlugin({
    mode: 'rows',
    
    rows: {
        toggleColumn: 0,
        hiddenClass: 'my-hidden-row'
    }
});

// Écouter les événements de toggle
document.getElementById('myTable').addEventListener('row:toggle', (event) => {
    const { rowId, isHidden } = event.detail;
    
    // Mettre à jour un compteur de lignes visibles
    updateVisibleRowCount(isHidden ? -1 : 1);
    
    // Mettre à jour l'état dans la base de données
    updateRowVisibilityInDatabase(rowId, !isHidden);
});
```

### Utilisation programmatique

```javascript
// Masquer une colonne programmatiquement
hidePlugin.hideColumn(2);

// Afficher une ligne programmatiquement
hidePlugin.showRow(1);

// Vérifier si une colonne est masquée
if (hidePlugin.isColumnHidden(3)) {
    console.log('La colonne 3 est masquée');
}

// Réinitialiser l'état (afficher tout)
hidePlugin.resetState();
```

## Styles CSS recommandés

```css
/* Styles pour les éléments masqués */
.hidden-column,
.hidden-row {
    display: none !important;
}

/* Styles pour les boutons toggle de colonnes */
.column-toggle {
    cursor: pointer;
    margin-left: 8px;
    color: #999;
    transition: color 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.column-toggle:hover {
    color: #333;
}

/* Styles pour les boutons toggle de lignes */
.row-toggle {
    cursor: pointer;
    margin-right: 8px;
    color: #999;
    transition: color 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.row-toggle:hover {
    color: #333;
}
```

## Bonnes pratiques

1. **Identifiants uniques** : Assurez-vous que vos colonnes et lignes ont des identifiants uniques pour une persistance correcte.

2. **Icônes claires** : Utilisez des icônes intuitives pour les boutons de toggle (œil ouvert/fermé par exemple).

3. **Persistance** : Activez la persistance pour une meilleure expérience utilisateur entre les sessions.

4. **Combinaison avec d'autres plugins** : Le plugin Hide fonctionne bien avec d'autres plugins comme FilterAndPaginate ou ColumnReorder.

5. **Accessibilité** : Ajoutez des attributs ARIA appropriés dans votre HTML pour améliorer l'accessibilité.

6. **Performances** : Pour les grands tableaux, considérez l'utilisation de la délégation d'événements pour améliorer les performances.

7. **État initial** : Utilisez les attributs HTML pour définir l'état initial plutôt que de masquer programmatiquement après le chargement.

## Compatibilité

- Navigateurs modernes : Chrome, Firefox, Safari, Edge
- IE11 avec polyfills appropriés

## Changelog

### Version 2.0.0
- Support complet pour masquer/afficher des lignes
- Refactorisation en plugin unifié avec modes 'columns', 'rows', ou 'both'
- Boutons de toggle personnalisables
- Persistance de l'état améliorée
- Nouveaux événements et callbacks

### Version 1.0.0
- Version initiale avec support pour masquer/afficher des colonnes uniquement