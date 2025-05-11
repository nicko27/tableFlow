# TableFlow

TableFlow est une bibliothèque JavaScript moderne et flexible pour la gestion des tableaux de données dans vos applications web. Elle offre une API intuitive et personnalisable avec des fonctionnalités avancées comme le tri, le filtrage, la pagination et l'édition en ligne.

## Installation

### Via CDN
```html
<link rel="stylesheet" href="path/to/tableFlow.css">
<script src="path/to/tableFlow.js"></script>
```

### Manuellement
1. Téléchargez les fichiers source depuis le dépôt
2. Copiez les fichiers `tableFlow.js` et `tableFlow.css` dans votre projet
3. Incluez les fichiers dans votre HTML :
```html
<link rel="stylesheet" href="path/to/tableFlow.css">
<script src="path/to/tableFlow.js"></script>
```

## Utilisation de base

### HTML
```html
<table id="myTable">
    <thead>
        <tr>
            <th>Nom</th>
            <th>Âge</th>
            <th>Email</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>John Doe</td>
            <td>30</td>
            <td>john@example.com</td>
        </tr>
    </tbody>
</table>
```

### JavaScript
```javascript
// Initialisation simple
const table = new TableFlow('#myTable');

// Initialisation avec options
const table = new TableFlow('#myTable', {
    sortable: true,
    filterable: true,
    pagination: true,
    perPage: 10
});
```

## Options de configuration

```javascript
const table = new TableFlow('#myTable', {
    sortable: true,           // Activer le tri
    filterable: true,         // Activer le filtrage
    pagination: true,         // Activer la pagination
    perPage: 10,             // Nombre d'éléments par page
    searchable: true,         // Activer la recherche
    editable: true,           // Activer l'édition
    selectable: true,         // Activer la sélection
    resizable: true,          // Activer le redimensionnement des colonnes
    draggable: true,          // Activer le drag & drop des lignes
    theme: 'light',           // Thème (light/dark)
    language: 'fr'            // Langue
});
```

## Méthodes principales

### setData()
Définit les données du tableau.

```javascript
table.setData([
    { name: 'John', age: 30, email: 'john@example.com' },
    { name: 'Jane', age: 25, email: 'jane@example.com' }
]);
```

### getData()
Récupère les données du tableau.

```javascript
const data = table.getData();
```

### sort()
Trie le tableau.

```javascript
table.sort('name', 'asc');
```

### filter()
Filtre le tableau.

```javascript
table.filter('name', 'John');
```

### search()
Recherche dans le tableau.

```javascript
table.search('John');
```

### addRow()
Ajoute une ligne.

```javascript
table.addRow({ name: 'John', age: 30, email: 'john@example.com' });
```

### removeRow()
Supprime une ligne.

```javascript
table.removeRow(0);
```

### updateRow()
Met à jour une ligne.

```javascript
table.updateRow(0, { name: 'John Updated' });
```

## Événements

```javascript
table.on('sort', (column, direction) => {
    console.log('Tri:', column, direction);
});

table.on('filter', (filters) => {
    console.log('Filtres:', filters);
});

table.on('search', (query) => {
    console.log('Recherche:', query);
});

table.on('edit', (row, column, value) => {
    console.log('Édition:', row, column, value);
});

table.on('select', (rows) => {
    console.log('Sélection:', rows);
});
```

## Personnalisation

### Styles CSS
Vous pouvez personnaliser l'apparence du tableau en modifiant les classes CSS suivantes :

```css
.table-flow {
    /* Conteneur principal */
}

.table-flow-table {
    /* Tableau */
}

.table-flow-header {
    /* En-tête */
}

.table-flow-body {
    /* Corps */
}

.table-flow-footer {
    /* Pied */
}

.table-flow-pagination {
    /* Pagination */
}

.table-flow-search {
    /* Recherche */
}

.table-flow-filter {
    /* Filtre */
}

.table-flow-sort {
    /* Tri */
}

.table-flow-edit {
    /* Édition */
}

.table-flow-select {
    /* Sélection */
}
```

### Thèmes
TableFlow propose deux thèmes intégrés :

```javascript
// Thème clair (par défaut)
const table = new TableFlow('#myTable', { theme: 'light' });

// Thème sombre
const table = new TableFlow('#myTable', { theme: 'dark' });
```

## Exemples d'utilisation avancée

### Tableau avec édition en ligne
```javascript
const table = new TableFlow('#myTable', {
    editable: true,
    onEdit: (row, column, value) => {
        // Validation
        if (column === 'age' && value < 0) {
            return false;
        }
        return true;
    }
});
```

### Tableau avec chargement dynamique
```javascript
const table = new TableFlow('#myTable', {
    pagination: true,
    perPage: 10,
    onPageChange: async (page) => {
        const response = await fetch(`/api/data?page=${page}`);
        const data = await response.json();
        table.setData(data.items);
        table.setTotal(data.total);
    }
});
```

### Tableau avec export
```javascript
const table = new TableFlow('#myTable', {
    exportable: true,
    exportFormats: ['csv', 'excel', 'pdf'],
    onExport: (format) => {
        const data = table.getData();
        // Logique d'export
    }
});
```

### Tableau avec sélection multiple
```javascript
const table = new TableFlow('#myTable', {
    selectable: true,
    multiSelect: true,
    onSelect: (rows) => {
        console.log('Lignes sélectionnées:', rows);
    }
});
```

## Bonnes pratiques

1. **Performance** : Utilisez la pagination pour les grands ensembles de données
2. **Accessibilité** : Assurez-vous que le tableau est accessible aux lecteurs d'écran
3. **Responsive** : Adaptez l'affichage aux différentes tailles d'écran
4. **Validation** : Validez les données avant l'édition
5. **Sécurité** : Sanitizez les données avant l'affichage

## Compatibilité

TableFlow est compatible avec :
- Chrome (dernières 2 versions)
- Firefox (dernières 2 versions)
- Safari (dernières 2 versions)
- Edge (dernières 2 versions)

## Support

Pour toute question ou problème, veuillez :
1. Consulter la documentation
2. Vérifier les issues existantes sur GitHub
3. Créer une nouvelle issue si nécessaire 