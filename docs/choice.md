# Documentation du Plugin Choice

## Vue d'ensemble

Le plugin Choice permet de transformer des cellules de tableau en éléments de sélection interactifs. Il offre trois modes principaux : le mode "toggle" pour basculer entre des valeurs prédéfinies, le mode "searchable" pour rechercher et sélectionner des valeurs dans une liste déroulante, et le mode "multiple" pour sélectionner plusieurs valeurs dans une même cellule, tous avec support pour les requêtes AJAX.

## Version

Version actuelle : 3.2.0

## Fonctionnalités

- Trois modes de sélection : toggle, searchable et multiple
- Support des requêtes AJAX pour le chargement dynamique des options
- Autocomplétion avec recherche en temps réel
- Auto-remplissage d'autres cellules avec des valeurs associées
- Support pour les valeurs en lecture seule avec fonction de callback dynamique (isReadOnly)
- Gestion améliorée des URLs relatives et absolues pour les requêtes AJAX
- Annulation automatique des requêtes AJAX précédentes
- Sélection multiple avec tags visuels et cases à cocher
- Personnalisation complète de l'apparence et du comportement
- Intégration transparente avec les autres plugins TableFlow

## HTML Attributes

| Attribut | Applied to | Description |
|-----------|------------|-------------|
| `th-choice` | `<th>` | Active le plugin sur une colonne. Peut contenir "toggle", "searchable" ou "multiple" |

## Options de configuration

```javascript
{
    // Configuration de base
    choiceAttribute: 'th-choice',     // Attribut pour activer le plugin
    cellClass: 'choice-cell',         // Classe CSS pour les cellules avec choix
    readOnlyClass: 'readonly',        // Classe CSS pour les cellules en lecture seule
    modifiedClass: 'modified',        // Classe CSS pour les cellules modifiées
    debug: false,                     // Mode débogage
    
    // Options pour chaque colonne
    columns: {
        'columnId': {
            type: 'toggle',           // Type de sélection: 'toggle' ou 'searchable'
            values: [                 // Valeurs disponibles
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' }
            ],
            readOnlyValues: [         // Valeurs en lecture seule
                { value: '3', class: 'readonly-locked' }
            ],
            isReadOnly: (value, rowData) => {
                // Fonction pour déterminer dynamiquement si une cellule est en lecture seule
                return rowData.super_admin === 1 || rowData.super_admin === '1';
            },
            searchable: {             // Options pour le mode searchable
                minWidth: '200px',
                dropdownClass: 'choice-dropdown',
                optionClass: 'choice-option',
                searchClass: 'choice-search',
                placeholder: 'Rechercher...',
                noResultsText: 'Aucun résultat',
                loadingText: 'Chargement...'
            },
            multiple: {               // Options pour le mode multiple
                separator: ',',       // Séparateur pour les valeurs multiples
                tagClass: 'choice-tag', // Classe CSS pour les tags
                tagContainerClass: 'choice-tags', // Classe CSS pour le conteneur de tags
                removeTagClass: 'choice-tag-remove', // Classe CSS pour le bouton de suppression
                placeholder: 'Sélectionner des options...', // Texte par défaut
                maxTags: null,        // Nombre maximum de tags (null = illimité)
                allowCustomValues: true, // Autoriser l'ajout de valeurs personnalisées
                customValueClass: 'custom-value' // Classe CSS pour les valeurs personnalisées
            },
            ajax: {                   // Options pour les requêtes AJAX
                enabled: false,
                url: '/api/search',
                method: 'GET',
                headers: {},
                minChars: 3,          // Nombre minimum de caractères pour déclencher la recherche
                debounceTime: 300,    // Délai avant d'envoyer la requête
                paramName: 'query',   // Nom du paramètre de recherche
                responseParser: null, // Fonction pour parser la réponse
                extraParams: {},      // Paramètres supplémentaires
                loadOnFocus: false,   // Charger les options au focus
                abortPrevious: true   // Annuler les requêtes précédentes
            },
            autoFill: {               // Options pour l'auto-remplissage
                enabled: false,
                mappings: {           // Mappings des champs source vers les colonnes cibles
                    'id': 'id_column',
                    'email': 'email_column'
                }
            }
        }
    }
}
```

## Formats de données

### Format des valeurs

Les valeurs peuvent être définies sous forme simple ou d'objets :

```javascript
// Format simple
values: ['Option 1', 'Option 2', 'Option 3']

// Format objet (recommandé)
values: [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3', readOnly: true, readOnlyClass: 'locked' }
]
```

### Format de réponse AJAX attendu

Le plugin attend une réponse JSON au format suivant :

```json
[
    {
        "value": "1",
        "label": "Option 1",
        "id": "123",
        "email": "option1@example.com"
    },
    {
        "value": "2",
        "label": "Option 2",
        "id": "456",
        "email": "option2@example.com"
    }
]
```

Les propriétés supplémentaires (comme `id` et `email` dans l'exemple) peuvent être utilisées pour l'auto-remplissage.

## Exemples d'utilisation

### Mode Toggle simple avec isReadOnly

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Choice'],
        choice: {
            columns: {
                'status': {
                    type: 'toggle',
                    values: [
                        { value: 'active', label: '<span class="status-active">Actif</span>' },
                        { value: 'inactive', label: '<span class="status-inactive">Inactif</span>' },
                        { value: 'pending', label: '<span class="status-pending">En attente</span>' }
                    ],
                    // Fonction pour déterminer dynamiquement si une cellule est en lecture seule
                    isReadOnly: (value, rowData) => {
                        // Exemple: les lignes avec role="admin" ne peuvent pas être modifiées
                        return rowData.role === 'admin';
                    }
                }
            }
        }
    }
});
```

### Mode Searchable avec options statiques

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Choice'],
        choice: {
            columns: {
                'country': {
                    type: 'searchable',
                    values: [
                        { value: 'fr', label: 'France' },
                        { value: 'de', label: 'Allemagne' },
                        { value: 'es', label: 'Espagne' },
                        { value: 'it', label: 'Italie' }
                    ],
                    searchable: {
                        placeholder: 'Rechercher un pays...',
                        noResultsText: 'Aucun pays trouvé'
                    }
                }
            }
        }
    }
});
```

### Mode Multiple avec tags

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Choice'],
        choice: {
            columns: {
                'competences': {
                    type: 'multiple',
                    values: [
                        { value: 'js', label: 'JavaScript' },
                        { value: 'php', label: 'PHP' },
                        { value: 'python', label: 'Python' },
                        { value: 'java', label: 'Java' },
                        { value: 'csharp', label: 'C#' }
                    ],
                    multiple: {
                        separator: ',',
                        maxTags: 5, // Limiter à 5 compétences maximum
                        allowCustomValues: true // Permettre d'ajouter des valeurs personnalisées
                    }
                }
            }
        }
    }
});
```

### Mode Multiple avec recherche AJAX

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Choice'],
        choice: {
            columns: {
                'permissions': {
                    type: 'multiple',
                    searchable: {
                        enabled: true,
                        placeholder: 'Rechercher des permissions...',
                        minWidth: '300px'
                    },
                    ajax: {
                        enabled: true,
                        url: '/api/permissions/search',
                        minChars: 2,
                        loadOnFocus: true
                    },
                    multiple: {
                        separator: ';',
                        tagClass: 'permission-tag',
                        removeTagClass: 'permission-remove'
                    }
                }
            }
        }
    }
});
```

### Mode Searchable avec AJAX et auto-remplissage

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Choice'],
        choice: {
            columns: {
                'nom': {
                    type: 'searchable',
                    ajax: {
                        enabled: true,
                        url: '/api/personnes/search',
                        minChars: 3,
                        paramName: 'nom',
                        debounceTime: 300,
                        abortPrevious: true, // Annuler les requêtes précédentes
                        loadOnFocus: true,   // Charger les options au focus
                        responseParser: function(data) {
                            // Transformer la réponse en format attendu
                            return data.map(item => ({
                                value: item.nom,
                                label: `${item.nom} ${item.prenom}`,
                                id: item.id,
                                email: item.email
                            }));
                        }
                    },
                    autoFill: {
                        enabled: true,
                        mappings: {
                            'id': 'id_personne',
                            'email': 'email'
                        }
                    },
                    // Fonction pour déterminer dynamiquement si une cellule est en lecture seule
                    isReadOnly: (value, rowData) => {
                        // Exemple: les utilisateurs avec super_admin=1 ne peuvent pas être modifiés
                        return rowData.super_admin === 1 || rowData.super_admin === '1';
                    }
                }
            }
        }
    }
});
```

### Configuration via attributs HTML

```html
<table id="monTableau">
    <thead>
        <tr>
            <th id="status" th-choice="toggle">Statut</th>
            <th id="pays" th-choice="searchable">Pays</th>
            <th id="competences" th-choice="multiple">Compétences</th>
            <th id="id_personne">ID</th>
            <th id="email">Email</th>
        </tr>
    </thead>
    <tbody>
        <!-- Données du tableau -->
    </tbody>
</table>
```

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `getColumnConfig(columnId)` | Récupère la configuration d'une colonne | `columnId` - ID de la colonne |
| `updateCellValue(cell, value, label, columnId, additionalData)` | Met à jour la valeur d'une cellule | `cell` - Cellule à mettre à jour<br>`value` - Nouvelle valeur<br>`label` - Texte à afficher<br>`columnId` - ID de la colonne<br>`additionalData` - Données supplémentaires |
| `updateMultipleCell(cell, values, columnId)` | Met à jour les valeurs d'une cellule multiple | `cell` - Cellule à mettre à jour<br>`values` - Tableau de valeurs<br>`columnId` - ID de la colonne |
| `getMultipleValues(cell)` | Récupère les valeurs d'une cellule multiple | `cell` - Cellule à analyser |
| `renderMultipleTags(container, values, columnId)` | Affiche les tags pour une cellule multiple | `container` - Conteneur pour les tags<br>`values` - Tableau de valeurs<br>`columnId` - ID de la colonne |
| `fetchOptionsFromAjax(query, columnId)` | Récupère les options via AJAX | `query` - Terme de recherche<br>`columnId` - ID de la colonne |
| `closeAllDropdowns()` | Ferme tous les menus déroulants | - |
| `refresh()` | Rafraîchit toutes les cellules | - |

## Événements

Le plugin déclenche et réagit aux événements suivants :

| Événement | Description | Détails |
|-----------|-------------|---------|
| `cell:change` | Déclenché lorsqu'une valeur change | `{ cell, value, columnId, rowId, source, tableId, isModified }` |
| `cell:saved` | Écouté pour mettre à jour les valeurs initiales | - |
| `row:saved` | Écouté pour mettre à jour les valeurs initiales | - |
| `row:added` | Écouté pour initialiser les nouvelles lignes | - |

## Styles CSS

Le plugin ajoute automatiquement les styles CSS suivants :

```css
.choice-cell {
    cursor: pointer;
    position: relative;
}
.choice-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    display: none;
    min-width: 200px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    overflow: auto;
    max-height: 200px;
}
.choice-dropdown.active {
    display: block;
}
.choice-search {
    width: 100%;
    padding: 8px;
    border: none;
    border-bottom: 1px solid #ddd;
    outline: none;
    box-sizing: border-box;
}
.choice-option {
    padding: 8px;
    cursor: pointer;
}
.choice-option:hover {
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
```

## Bonnes pratiques

1. **Utiliser le format objet pour les valeurs** : Le format objet (`{ value, label }`) est plus flexible et permet d'utiliser du HTML dans les labels.
2. **Limiter le nombre d'options** : Pour de grandes listes, utilisez le mode searchable avec AJAX.
3. **Configurer un debounceTime approprié** : Ajustez le délai en fonction de votre API et de l'expérience utilisateur souhaitée.
4. **Utiliser l'auto-remplissage** : Pour les données liées, utilisez l'auto-remplissage plutôt que de dupliquer les données.
5. **Parser les réponses AJAX** : Utilisez la fonction `responseParser` pour adapter les données de votre API au format attendu.

## Dépannage

| Problème | Solution |
|-------|----------|
| Les options ne s'affichent pas | Vérifiez que la colonne a bien l'attribut `th-choice` et que les valeurs sont correctement définies |
| Les requêtes AJAX échouent | Vérifiez l'URL et les paramètres dans la console du navigateur |
| L'auto-remplissage ne fonctionne pas | Assurez-vous que les IDs de colonne dans les mappings correspondent aux IDs des colonnes du tableau |
| Le dropdown ne se ferme pas | Vérifiez qu'il n'y a pas de conflit avec d'autres gestionnaires d'événements |
| Les valeurs en lecture seule sont modifiables | Vérifiez la configuration `readOnlyValues`, l'attribut `readOnly` dans les valeurs ou la fonction `isReadOnly` |
| Les requêtes AJAX s'accumulent | Activez l'option `abortPrevious: true` pour annuler les requêtes précédentes |
| Les URLs relatives ne fonctionnent pas | Assurez-vous que les URLs commencent par '/' ou utilisez des URLs absolues |
| Impossible d'ajouter des valeurs personnalisées | Vérifiez que l'option `allowCustomValues` est définie à `true` dans la configuration `multiple` |

## Utilisation avancée

### Utilisation de la fonction isReadOnly

```javascript
// Configuration avec isReadOnly dynamique
columns: {
    'status': {
        type: 'toggle',
        values: [
            { value: 'active', label: 'Actif' },
            { value: 'inactive', label: 'Inactif' }
        ],
        isReadOnly: (value, rowData) => {
            // Exemples de conditions pour rendre une cellule en lecture seule
            
            // 1. Basé sur une autre valeur dans la même ligne
            if (rowData.super_admin === 1 || rowData.super_admin === '1') {
                return true;
            }
            
            // 2. Basé sur la valeur actuelle de la cellule
            if (value === 'locked') {
                return true;
            }
            
            // 3. Combinaison de conditions
            if (rowData.role === 'guest' && value === 'active') {
                return true;
            }
            
            return false;
        }
    }
}
```

### Personnalisation du parser de réponse AJAX

```javascript
responseParser: function(data) {
    // Exemple avec une API qui renvoie { results: [...] }
    if (data.results && Array.isArray(data.results)) {
        return data.results.map(item => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
            // Données additionnelles pour l'auto-remplissage
            email: item.email,
            phone: item.phone,
            department: item.department
        }));
    }
    return [];
}
```

### Intégration avec des paramètres dynamiques

```javascript
// Fonction pour mettre à jour les paramètres AJAX en fonction du contexte
function updateExtraParams(columnId, extraParams) {
    const choicePlugin = table.getPlugin('choice');
    const columnConfig = choicePlugin.getColumnConfig(columnId);
    
    if (columnConfig && columnConfig.ajax) {
        columnConfig.ajax.extraParams = {
            ...columnConfig.ajax.extraParams,
            ...extraParams
        };
    }
}

// Exemple d'utilisation
document.getElementById('filterDepartment').addEventListener('change', function() {
    updateExtraParams('employee', { department: this.value });
});
```

### Auto-remplissage conditionnel

```javascript
// Configuration avancée pour l'auto-remplissage
autoFill: {
    enabled: true,
    mappings: {
        'id': 'person_id',
        'email': 'email',
        'department': (value, row) => {
            // Logique conditionnelle pour déterminer la colonne cible
            const departmentCell = row.querySelector('td[id^="department_"]');
            const roleCell = row.querySelector('td[id^="role_"]');
            
            // Mettre à jour plusieurs cellules
            if (departmentCell) {
                departmentCell.setAttribute('data-value', value);
                departmentCell.textContent = value;
            }
            
            // Logique conditionnelle
            if (roleCell && value === 'Management') {
                roleCell.setAttribute('data-value', 'Manager');
                roleCell.textContent = 'Manager';
            }
        }
    }
}
```
### Utilisation du mode multiple avec valeurs personnalisées

```javascript
// Configuration pour permettre aux utilisateurs d'ajouter leurs propres valeurs
columns: {
    'tags': {
        type: 'multiple',
        values: [
            { value: 'important', label: 'Important' },
            { value: 'urgent', label: 'Urgent' },
            { value: 'bug', label: 'Bug' }
        ],
        searchable: {
            enabled: true,
            placeholder: 'Rechercher ou ajouter un tag...'
        },
        multiple: {
            allowCustomValues: true,
            customValueClass: 'custom-tag',
            separator: ',',
            maxTags: 10
        }
    }
}
```

Cette configuration permet aux utilisateurs de :
1. Sélectionner parmi les valeurs prédéfinies
2. Rechercher dans les valeurs existantes
3. Ajouter de nouvelles valeurs qui ne sont pas dans la liste
4. Les valeurs personnalisées sont affichées avec un style différent (classe `custom-tag`)
## Valeurs manuelles et fonctions dans autoFill

Le plugin Choice permet désormais de définir des valeurs manuelles ou d'utiliser des fonctions dans les mappings autoFill.

### Valeurs manuelles

```javascript
autoFill: {
    enabled: true,
    mappings: {
        'id': 'user_id',       // Mapping standard: source -> target
        'status': '1',         // Valeur manuelle: toujours mettre '1' dans la colonne status
        'created_at': 'now()', // Valeur manuelle: chaîne de caractères
        'active': 0            // Valeur manuelle: nombre
    }
}
```

### Fonctions de mapping

```javascript
autoFill: {
    enabled: true,
    mappings: {
        'id': 'user_id',
        'role': function(data, row) {
            // Logique conditionnelle basée sur les données
            if (data.isAdmin) {
                return 'admin';
            } else if (data.permissions && data.permissions.includes('manage')) {
                return 'manager';
            } else {
                return 'user';
            }
        },
        'created_at': (data) => new Date().toISOString().split('T')[0]
    }
}
```

### Réapplication des plugins

Lorsqu'une cellule est mise à jour via autoFill, les plugins sont automatiquement réappliqués à cette cellule pour s'assurer que tous les comportements (toggle, searchable, etc.) fonctionnent correctement après le remplissage.