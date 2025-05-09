# Documentation du Plugin LineToggle

## Vue d'ensemble

Le plugin LineToggle permet de modifier dynamiquement l'apparence des lignes d'un tableau en fonction des valeurs contenues dans certaines cellules. Il applique ou retire des classes CSS aux lignes selon des règles définies, permettant ainsi de mettre en évidence visuellement des informations importantes ou des états particuliers.

## Version

Version actuelle : 1.1.0

## Fonctionnalités

- Application conditionnelle de classes CSS aux lignes du tableau
- Règles basées sur les valeurs des cellules
- Support de multiples types de conditions (égalité, comparaison, regex, etc.)
- Application des règles à l'initialisation et/ou lors des changements
- Configuration via attributs HTML ou options JavaScript
- Réaction automatique aux modifications des cellules

## HTML Attributes

| Attribut | Applied to | Description |
|-----------|------------|-------------|
| `th-linetoggle` | `<th>` | Active le plugin sur une colonne. Peut contenir des règles au format JSON |

## Options de configuration

```javascript
{
    // Attribut pour activer le plugin sur une colonne
    lineToggleAttribute: 'th-linetoggle',

    // Appliquer les classes à l'initialisation
    applyOnInit: true,

    // Appliquer les classes lors des changements
    applyOnChange: true,

    // Mode de debug
    debug: false,

    // Règles de changement de classe par colonne
    // Format: { 'columnId': [{ value: '1', addClass: 'highlight', removeClass: 'dim' }] }
    rules: {}
}
```

## Structure des règles

Les règles peuvent être définies de plusieurs façons :

### 1. Règle simple basée sur une valeur exacte

```javascript
{
    value: '1',                // Valeur à comparer
    addClass: 'highlight',     // Classe(s) à ajouter
    removeClass: 'dim'         // Classe(s) à retirer
}
```

### 2. Règle basée sur plusieurs valeurs

```javascript
{
    values: ['1', '2', '3'],   // Liste de valeurs possibles
    addClass: 'important'      // Classe(s) à ajouter
}
```

### 3. Règle basée sur une expression régulière

```javascript
{
    regex: '^[A-Z]',           // Expression régulière à tester
    addClass: 'uppercase'      // Classe(s) à ajouter
}
```

### 4. Règle basée sur une condition

```javascript
{
    condition: 'greater',      // Type de condition
    compareValue: 100,         // Valeur de comparaison
    addClass: 'high-value'     // Classe(s) à ajouter
}
```

### 5. Règle basée sur une fonction personnalisée

```javascript
{
    test: function(value) {    // Fonction de test personnalisée
        return value % 2 === 0;
    },
    addClass: 'even-number'    // Classe(s) à ajouter
}
```

## Types de conditions supportées

| Condition | Description |
|-----------|-------------|
| `equals` | La valeur est égale à la valeur de comparaison |
| `notEquals` | La valeur n'est pas égale à la valeur de comparaison |
| `contains` | La valeur contient la valeur de comparaison |
| `startsWith` | La valeur commence par la valeur de comparaison |
| `endsWith` | La valeur se termine par la valeur de comparaison |
| `greater` | La valeur est supérieure à la valeur de comparaison |
| `less` | La valeur est inférieure à la valeur de comparaison |
| `greaterOrEqual` | La valeur est supérieure ou égale à la valeur de comparaison |
| `lessOrEqual` | La valeur est inférieure ou égale à la valeur de comparaison |
| `empty` | La valeur est vide |
| `notEmpty` | La valeur n'est pas vide |

## Exemples d'utilisation

### Configuration de base

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['LineToggle'],
        linetoggle: {
            debug: true,
            rules: {
                'status': [
                    { value: 'active', addClass: 'row-active', removeClass: 'row-inactive' },
                    { value: 'inactive', addClass: 'row-inactive', removeClass: 'row-active' }
                ]
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
            <th id="name">Nom</th>
            <th id="status" th-linetoggle='[
                {"value": "active", "addClass": "row-active"},
                {"value": "inactive", "addClass": "row-inactive"}
            ]'>Statut</th>
            <th id="priority" th-linetoggle>Priorité</th>
        </tr>
    </thead>
    <tbody>
        <!-- Données du tableau -->
    </tbody>
</table>
```

### Configuration mixte (HTML + JavaScript)

```html
<table id="monTableau">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="status" th-linetoggle>Statut</th>
            <th id="priority" th-linetoggle>Priorité</th>
        </tr>
    </thead>
    <tbody>
        <!-- Données du tableau -->
    </tbody>
</table>
```

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['LineToggle'],
        linetoggle: {
            rules: {
                'status': [
                    { value: 'active', addClass: 'row-active' },
                    { value: 'inactive', addClass: 'row-inactive' }
                ],
                'priority': [
                    { condition: 'greater', compareValue: 8, addClass: 'high-priority' },
                    { condition: 'lessOrEqual', compareValue: 3, addClass: 'low-priority' }
                ]
            }
        }
    }
});
```

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `refresh()` | Rafraîchit l'application des règles | - |
| `applyRulesToColumn(columnId, columnIndex, rules)` | Applique des règles à une colonne spécifique | `columnId` - ID de la colonne<br>`columnIndex` - Index de la colonne<br>`rules` - Règles à appliquer |
| `applyRulesToRow(row, columnId, columnIndex, rules)` | Applique des règles à une ligne spécifique | `row` - Ligne à modifier<br>`columnId` - ID de la colonne<br>`columnIndex` - Index de la colonne<br>`rules` - Règles à appliquer |
| `ruleApplies(rule, value)` | Vérifie si une règle s'applique à une valeur | `rule` - Règle à vérifier<br>`value` - Valeur à tester |

## Événements

Le plugin réagit aux événements suivants :

| Événement | Action |
|-----------|--------|
| `cell:change` | Applique les règles lorsqu'une cellule est modifiée (si `applyOnChange` est activé) |
| `row:added` | Applique les règles aux nouvelles lignes ajoutées (si `applyOnInit` est activé) |

## Styles CSS

Le plugin n'ajoute pas de styles CSS par défaut. Vous devez définir vos propres classes CSS pour obtenir l'effet visuel souhaité :

```css
/* Exemple de styles pour les classes ajoutées par LineToggle */
.row-active {
    background-color: rgba(0, 255, 0, 0.1);
}

.row-inactive {
    background-color: rgba(255, 0, 0, 0.1);
    color: #999;
}

.high-priority {
    font-weight: bold;
    border-left: 3px solid red;
}

.low-priority {
    color: #666;
}
```

## Bonnes pratiques

1. **Nommage cohérent des classes** : Utilisez un préfixe pour vos classes (ex: `row-*`) pour éviter les conflits avec d'autres styles.
2. **Règles simples** : Préférez des règles simples et claires pour faciliter la maintenance.
3. **Combinaison avec d'autres plugins** : LineToggle fonctionne bien avec les plugins Choice et Edit pour créer des tableaux interactifs.
4. **Performances** : Évitez d'ajouter trop de règles complexes sur des tableaux volumineux pour maintenir de bonnes performances.
5. **Styles subtils** : Utilisez des styles visuels subtils pour ne pas surcharger l'interface utilisateur.

## Dépannage

| Problème | Solution |
|-------|----------|
| Les règles ne s'appliquent pas | Vérifiez que la colonne a bien l'attribut `th-linetoggle` et que les règles sont correctement définies |
| Les règles ne s'appliquent pas aux nouvelles lignes | Assurez-vous que `applyOnInit` est à `true` |
| Les règles ne s'appliquent pas lors des modifications | Assurez-vous que `applyOnChange` est à `true` |
| Les règles basées sur des conditions numériques ne fonctionnent pas | Vérifiez que les valeurs peuvent être converties en nombres |
| Les expressions régulières ne fonctionnent pas | Vérifiez la syntaxe de vos expressions régulières |

## Utilisation avancée

### Règles dynamiques

```javascript
// Obtenir l'instance du plugin
const lineTogglePlugin = table.getPlugin('linetoggle');

// Appliquer des règles dynamiquement
const columnId = 'status';
const columnIndex = 2; // Index de la colonne dans le tableau
const dynamicRules = [
    { value: 'new', addClass: 'row-new' },
    { value: 'processing', addClass: 'row-processing' }
];

lineTogglePlugin.applyRulesToColumn(columnId, columnIndex, dynamicRules);
```

### Intégration avec le plugin Choice

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Choice', 'LineToggle'],
        choice: {
            columns: {
                'status': {
                    type: 'select',
                    options: [
                        { value: 'active', label: 'Actif' },
                        { value: 'inactive', label: 'Inactif' },
                        { value: 'pending', label: 'En attente' }
                    ]
                }
            }
        },
        linetoggle: {
            rules: {
                'status': [
                    { value: 'active', addClass: 'row-active' },
                    { value: 'inactive', addClass: 'row-inactive' },
                    { value: 'pending', addClass: 'row-pending' }
                ]
            }
        }
    }
});
```

### Règles complexes avec fonctions personnalisées

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['LineToggle'],
        linetoggle: {
            rules: {
                'date': [
                    {
                        // Règle pour mettre en évidence les dates d'aujourd'hui
                        test: function(value) {
                            const today = new Date();
                            const dateValue = new Date(value);
                            return dateValue.toDateString() === today.toDateString();
                        },
                        addClass: 'row-today'
                    },
                    {
                        // Règle pour mettre en évidence les dates passées
                        test: function(value) {
                            const today = new Date();
                            const dateValue = new Date(value);
                            return dateValue < today && dateValue.toDateString() !== today.toDateString();
                        },
                        addClass: 'row-past'
                    }
                ]
            }
        }
    }
});
```

### Combinaison de plusieurs colonnes

Pour appliquer des règles basées sur plusieurs colonnes, vous pouvez utiliser un événement personnalisé :

```javascript
// Après l'initialisation de TableFlow
const lineTogglePlugin = table.getPlugin('linetoggle');

// Fonction pour appliquer des règles basées sur plusieurs colonnes
function applyMultiColumnRules(row) {
    const statusCell = row.querySelector('td[id^="status_"]');
    const priorityCell = row.querySelector('td[id^="priority_"]');
    
    if (!statusCell || !priorityCell) return;
    
    const status = statusCell.getAttribute('data-value') || statusCell.textContent.trim();
    const priority = priorityCell.getAttribute('data-value') || priorityCell.textContent.trim();
    
    // Règle: Si status=active ET priority>7, ajouter la classe 'row-critical'
    if (status === 'active' && Number(priority) > 7) {
        row.classList.add('row-critical');
    } else {
        row.classList.remove('row-critical');
    }
}

// Appliquer à toutes les lignes existantes
table.getAllRows().forEach(applyMultiColumnRules);

// Écouter les changements pour mettre à jour les règles
table.table.addEventListener('cell:change', (event) => {
    const row = event.detail.cell.closest('tr');
    if (row) {
        applyMultiColumnRules(row);
    }
});
```