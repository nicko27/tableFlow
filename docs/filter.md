# Plugin Filter pour TableFlow

## Description
Le plugin Filter permet de filtrer les données d'un tableau TableFlow avec un filtre global et/ou des filtres par colonne.

## Version
1.0.1 (avec correctifs)

## Fonctionnalités
- Filtre global pour rechercher dans toutes les colonnes
- Filtres par colonne pour un filtrage précis
- Mémorisation de l'état des filtres
- Compatibilité avec d'autres plugins (notamment Paginate)
- Gestion des types de données (texte, nombre, date)

## Configuration

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Filter'],
        filter: {
            enableGlobalFilter: true,
            globalFilterSelector: '#search', // Sélecteur CSS de l'input de recherche
            debounceTime: 300, // Délai avant application du filtre (ms)
            rememberState: false, // Mémoriser l'état des filtres
            enableColumnFilters: true, // Activer les filtres par colonne
            filterColumnAttribute: 'th-filter', // Attribut pour les colonnes filtrables
            filterExcludeAttribute: 'th-filter-exclude', // Attribut pour exclure des colonnes
            preserveHiddenState: true, // Préserver l'état caché des lignes
            debug: false // Activer les logs de débogage
        }
    }
});
```

## Options

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `enableGlobalFilter` | Boolean | `true` | Active le filtre global |
| `globalFilterSelector` | String | `null` | Sélecteur CSS de l'input de recherche |
| `debounceTime` | Number | `300` | Délai avant application du filtre (ms) |
| `rememberState` | Boolean | `false` | Mémoriser l'état des filtres |
| `enableColumnFilters` | Boolean | `false` | Activer les filtres par colonne |
| `filterColumnAttribute` | String | `'th-filter'` | Attribut pour les colonnes filtrables |
| `filterExcludeAttribute` | String | `'th-filter-exclude'` | Attribut pour exclure des colonnes |
| `preserveHiddenState` | Boolean | `true` | Préserver l'état caché des lignes |
| `debug` | Boolean | `false` | Activer les logs de débogage |

## Utilisation dans le HTML

### Filtre global
```html
<input type="text" id="search" placeholder="Rechercher...">
<table id="monTableau">
    <!-- ... -->
</table>
```

### Filtres par colonne
Pour activer le filtre sur une colonne spécifique, ajoutez l'attribut `th-filter` à l'en-tête de colonne :
```html
<table id="monTableau">
    <thead>
        <tr>
            <th th-filter>Nom</th>
            <th th-filter>Email</th>
            <th th-filter-exclude>Actions</th> <!-- Cette colonne sera exclue du filtrage -->
        </tr>
    </thead>
    <tbody>
        <!-- ... -->
    </tbody>
</table>
```

## Méthodes publiques

| Méthode | Description |
|---------|-------------|
| `applyFilters()` | Applique les filtres actuels |
| `refreshFilters()` | Rafraîchit les filtres sans changer leur valeur |
| `resetFilters()` | Réinitialise tous les filtres |
| `getVisibleRows()` | Retourne les lignes visibles après filtrage |

## Événements

| Événement | Détails | Description |
|-----------|---------|-------------|
| `filterUpdated` | `{ filteredRowsCount, totalRows, globalFilter, columnFilters }` | Déclenché après l'application des filtres |

## Intégration avec d'autres plugins

### Avec le plugin Paginate
Le plugin Filter fonctionne parfaitement avec le plugin Paginate. Lorsque les deux sont utilisés ensemble, le filtrage est appliqué avant la pagination.

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Filter', 'Paginate'],
        filter: {
            globalFilterSelector: '#search'
        },
        paginate: {
            pageSize: 10
        }
    }
});
```

## Exemples

### Exemple complet avec filtre global et pagination
```html
<div class="table-container">
    <div class="table-controls">
        <input type="text" id="search" placeholder="Rechercher...">
    </div>
    <table id="monTableau">
        <!-- ... -->
    </table>
</div>

<script type="module">
    import TableFlow from './path/to/tableFlow.js';
    
    const table = new TableFlow({
        tableId: 'monTableau',
        plugins: {
            names: ['Filter', 'Paginate'],
            filter: {
                globalFilterSelector: '#search',
                enableColumnFilters: true
            },
            paginate: {
                pageSize: 10,
                showPageSizes: true
            }
        }
    });
</script>
```

## Dépannage

### Le filtre global ne fonctionne pas
- Vérifiez que le sélecteur CSS `globalFilterSelector` est correct
- Assurez-vous que l'élément input existe dans le DOM avant l'initialisation de TableFlow

### Les filtres par colonne ne s'affichent pas
- Vérifiez que `enableColumnFilters` est défini à `true`
- Assurez-vous que les colonnes ont l'attribut `th-filter`

### Le filtrage ne fonctionne pas sur certaines colonnes
- Vérifiez si ces colonnes ont l'attribut `th-filter-exclude` ou `th-hide`
- Pour les données spéciales (dates, nombres), utilisez l'attribut `data-type="date"` ou `data-type="number"` sur les cellules