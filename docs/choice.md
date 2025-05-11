# Documentation du Plugin Choice

## Vue d'ensemble

Le plugin Choice permet de transformer des cellules de tableau en éléments de sélection interactifs. Il offre trois modes principaux : le mode "toggle" pour basculer entre des valeurs prédéfinies, le mode "searchable" pour rechercher et sélectionner des valeurs dans une liste déroulante, et le mode "multiple" pour sélectionner plusieurs valeurs dans une même cellule, tous avec support pour les requêtes AJAX.

## Version

Version actuelle : 3.4.0

## Fonctionnalités

- Trois modes de sélection : toggle, searchable et multiple
- Support des requêtes AJAX pour le chargement dynamique des options
- Autocomplétion avec recherche en temps réel
- Auto-remplissage d'autres cellules avec des valeurs associées
- Support pour les valeurs en lecture seule avec fonction de callback dynamique (isReadOnly)
- Gestion améliorée des URLs relatives et absolues pour les requêtes AJAX
- Annulation automatique des requêtes AJAX précédentes
- Sélection multiple avec tags visuels et cases à cocher
- Personnalisation complète de l'apparence et du comportement via des classes CSS configurables
- Intégration transparente avec les autres plugins TableFlow
- Tri des tags avec boutons haut/bas ou glisser-déposer (via Sortable.js)

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
            type: 'toggle',           // Type de sélection: 'toggle', 'searchable' ou 'multiple'
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
                noResultsClass: 'no-results',
                loadingClass: 'loading',
                errorClass: 'error',
                placeholder: 'Rechercher...',
                noResultsText: 'Aucun résultat',
                loadingText: 'Chargement...'
            },
            multiple: {               // Options pour le mode multiple
                separator: ',',       // Séparateur pour les valeurs multiples
                tagClass: 'choice-tag', // Classe CSS pour les tags
                tagContainerClass: 'choice-tags', // Classe CSS pour le conteneur de tags
                removeTagClass: 'choice-tag-remove', // Classe CSS pour le bouton de suppression
                tagOrderClass: 'tag-order', // Classe CSS pour le numéro d'ordre
                selectedClass: 'multiple-selected', // Classe CSS pour les options sélectionnées
                optionCheckboxClass: 'multiple-option-checkbox', // Classe CSS pour les cases à cocher
                placeholder: 'Sélectionner des options...', // Texte par défaut
                maxTags: null,        // Nombre maximum de tags (null = illimité)
                allowCustomValues: true, // Autoriser l'ajout de valeurs personnalisées
                customValueClass: 'custom-value', // Classe CSS pour les valeurs personnalisées
                showOrder: false,     // Afficher les numéros d'ordre devant les tags
                orderPrefix: '',      // Préfixe pour les numéros d'ordre (ex: "#")
                orderSuffix: '-',     // Suffixe pour les numéros d'ordre (ex: "-")
                upDownButtons: false, // Afficher les boutons haut/bas pour réordonner
                upButtonClass: 'choice-tag-up', // Classe CSS pour le bouton monter
                downButtonClass: 'choice-tag-down' // Classe CSS pour le bouton descendre
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
                },
                autoDetect: true,     // Détection automatique des champs
                cellIdFormat: '{column}_{rowId}' // Format pour les IDs de cellule
            }
        }
    }
}
```

## Personnalisation des classes CSS

Le plugin Choice permet une personnalisation complète de l'apparence via des classes CSS configurables. Toutes les classes utilisées dans le plugin peuvent être redéfinies dans la configuration :

### Classes pour le mode searchable

```javascript
searchable: {
    dropdownClass: 'ma-classe-dropdown',
    optionClass: 'ma-classe-option',
    searchClass: 'ma-classe-recherche',
    noResultsClass: 'ma-classe-aucun-resultat',
    loadingClass: 'ma-classe-chargement',
    errorClass: 'ma-classe-erreur'
}
```

### Classes pour le mode multiple

```javascript
multiple: {
    tagClass: 'ma-classe-tag',
    tagContainerClass: 'ma-classe-conteneur-tags',
    removeTagClass: 'ma-classe-supprimer-tag',
    tagOrderClass: 'ma-classe-ordre',
    selectedClass: 'ma-classe-selectionne',
    optionCheckboxClass: 'ma-classe-checkbox',
    customValueClass: 'ma-classe-valeur-personnalisee',
    upButtonClass: 'ma-classe-bouton-haut',
    downButtonClass: 'ma-classe-bouton-bas'
}
```

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

### Mode Searchable avec options statiques et classes personnalisées

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
                        dropdownClass: 'country-dropdown',
                        optionClass: 'country-option',
                        searchClass: 'country-search',
                        noResultsClass: 'country-no-results',
                        placeholder: 'Rechercher un pays...',
                        noResultsText: 'Aucun pays trouvé'
                    }
                }
            }
        }
    }
});
```

### Mode Multiple avec tags et classes personnalisées

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
                        tagClass: 'skill-tag',
                        tagContainerClass: 'skills-container',
                        removeTagClass: 'skill-remove',
                        maxTags: 5, // Limiter à 5 compétences maximum
                        allowCustomValues: true, // Permettre d'ajouter des valeurs personnalisées
                        customValueClass: 'custom-skill',
                        showOrder: true, // Afficher les numéros d'ordre
                        orderPrefix: '#',
                        upDownButtons: true // Activer les boutons de réorganisation
                    }
                }
            }
        }
    }
});
```

### Mode Multiple avec recherche AJAX et classes personnalisées

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
                        dropdownClass: 'perm-dropdown',
                        searchClass: 'perm-search',
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
                        tagContainerClass: 'permissions-container',
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
                    }
                }
            }
        }
    }
});
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

Le plugin ajoute automatiquement des styles CSS pour tous les éléments. Ces styles peuvent être personnalisés en définissant des classes CSS personnalisées dans la configuration. Voici un exemple des styles par défaut :

```css
/* Styles pour les cellules */
.choice-cell {
    cursor: pointer;
    position: relative;
}
.choice-cell.readonly {
    cursor: not-allowed;
    opacity: 0.8;
    background-color: #f8f8f8;
}

/* Styles pour le dropdown */
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

/* Styles pour la recherche */
.choice-search {
    width: 100%;
    padding: 8px;
    border: none;
    border-bottom: 1px solid #ddd;
    outline: none;
    box-sizing: border-box;
}

/* Styles pour les options */
.choice-option {
    padding: 8px;
    cursor: pointer;
}
.choice-option:hover {
    background-color: #f5f5f5;
}

/* Styles pour les messages */
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
.choice-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px;
}
.choice-tag {
    display: inline-flex;
    align-items: center;
    background-color: #e9f5fe;
    border: 1px solid #c5e2fa;
    border-radius: 3px;
    padding: 2px 6px;
    margin: 2px;
    font-size: 0.9em;
    user-select: none;
    cursor: default;
}
.choice-tag .tag-order {
    font-weight: bold;
    margin-right: 3px;
    opacity: 0.7;
}
.choice-tag-remove {
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
```

## Bonnes pratiques

1. **Utiliser le format objet pour les valeurs** : Le format objet (`{ value, label }`) est plus flexible et permet d'utiliser du HTML dans les labels.
2. **Personnaliser les classes CSS** : Définir des classes CSS personnalisées pour adapter l'apparence à votre design.
3. **Limiter le nombre d'options** : Pour de grandes listes, utilisez le mode searchable avec AJAX.
4. **Configurer un debounceTime approprié** : Ajustez le délai en fonction de votre API et de l'expérience utilisateur souhaitée.
5. **Utiliser l'auto-remplissage** : Pour les données liées, utilisez l'auto-remplissage plutôt que de dupliquer les données.
6. **Parser les réponses AJAX** : Utilisez la fonction `responseParser` pour adapter les données de votre API au format attendu.

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
| Les classes CSS personnalisées ne sont pas appliquées | Vérifiez que les noms de classes sont correctement définis dans la configuration |

## Utilisation avancée

### Personnalisation complète des styles

```javascript
// Configuration avec styles personnalisés
columns: {
    'status': {
        type: 'toggle',
        values: [
            { value: 'active', label: 'Actif' },
            { value: 'inactive', label: 'Inactif' }
        ],
        searchable: {
            dropdownClass: 'status-dropdown',
            optionClass: 'status-option',
            searchClass: 'status-search',
            noResultsClass: 'status-no-results',
            loadingClass: 'status-loading',
            errorClass: 'status-error'
        }
    }
}
```

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

### Utilisation du mode multiple avec valeurs personnalisées et classes CSS personnalisées

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
            dropdownClass: 'tags-dropdown',
            searchClass: 'tags-search',
            placeholder: 'Rechercher ou ajouter un tag...'
        },
        multiple: {
            allowCustomValues: true,
            tagClass: 'tag-item',
            tagContainerClass: 'tags-container',
            removeTagClass: 'tag-remove',
            customValueClass: 'custom-tag',
            separator: ',',
            maxTags: 10,
            showOrder: true,
            orderPrefix: '#',
            upDownButtons: true,
            upButtonClass: 'tag-up',
            downButtonClass: 'tag-down'
        }
    }
}
```