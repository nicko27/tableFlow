# Plugin Color

Le plugin Color permet d'ajouter des sélecteurs de couleur interactifs aux cellules d'un tableau TableFlow. Il s'intègre avec la bibliothèque ColorFlow pour offrir une expérience utilisateur intuitive et visuelle pour la sélection de couleurs.

**Version actuelle :** 2.0.0  
**Type :** edit  
**Auteur :** TableFlow Team

## Fonctionnalités

- Sélection de couleur visuelle avec aperçu en temps réel
- Sélecteur basé sur un canvas (Teinte/Saturation/Luminosité)
- Palette de couleurs prédéfinies personnalisable
- Validation automatique du format de couleur
- Conversion automatique en format hexadécimal
- Intégration complète avec les événements de TableFlow
- Support pour les cellules en lecture seule

## Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ColorPlugin from 'path/to/tableFlow/plugins/color';

// Assurez-vous d'inclure également ColorFlow
// <script src="path/to/colorFlow.js"></script>
// <link rel="stylesheet" href="path/to/colorFlow.css">

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const colorPlugin = new ColorPlugin({
    // Configuration du plugin
});

table.registerPlugin(colorPlugin);
```

## Configuration

```javascript
const colorPlugin = new ColorPlugin({
    colorAttribute: 'th-color',       // Attribut pour marquer les colonnes de couleur
    cellClass: 'td-color',            // Classe CSS pour les cellules de couleur
    readOnlyClass: 'readonly',        // Classe CSS pour les cellules en lecture seule
    modifiedClass: 'modified',        // Classe CSS pour les lignes modifiées
    customClass: 'my-color-theme',    // Classe CSS personnalisée pour le sélecteur
    debug: false,                     // Mode debug
    
    // Options avancées pour ColorFlow
    presetColors: [                   // Couleurs prédéfinies personnalisées
        { color: '#FF0000', label: 'Rouge' },
        { color: '#00FF00', label: 'Vert' },
        { color: '#0000FF', label: 'Bleu' },
        { color: '#FFFF00', label: 'Jaune' },
        { color: '#FF00FF', label: 'Magenta' },
        { color: '#00FFFF', label: 'Cyan' },
        { color: '#000000', label: 'Noir' },
        { color: '#FFFFFF', label: 'Blanc' },
        { color: '#808080', label: 'Gris' },
        { color: '#FFA500', label: 'Orange' },
        { color: '#800080', label: 'Violet' },
        { color: '#008000', label: 'Vert foncé' }
    ],
    
    // Support pour la transparence (préparation future)
    alphaSupport: false,              // Support de la transparence (non implémenté)
    
    // Callbacks
    onColorChange: (details) => {     // Fonction appelée après changement de couleur
        console.log('Couleur modifiée:', details);
    }
});
```

## Utilisation dans le HTML

Pour activer le sélecteur de couleur sur une colonne, ajoutez l'attribut `th-color` à l'en-tête de la colonne :

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="color" th-color>Couleur</th>
            <th id="status">Statut</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Élément 1</td>
            <td>#FF0000</td>
            <td>Actif</td>
        </tr>
        <tr>
            <td>Élément 2</td>
            <td>#00FF00</td>
            <td>Inactif</td>
        </tr>
    </tbody>
</table>
```

## Fonctionnement

Le plugin Color transforme les cellules des colonnes marquées avec `th-color` en sélecteurs de couleur interactifs :

1. **Initialisation** : Lors de l'initialisation, le plugin crée une instance de ColorFlow et configure les cellules des colonnes marquées.

2. **Transformation des cellules** : Chaque cellule est transformée pour contenir :
   - Un aperçu visuel de la couleur actuelle
   - Un champ de saisie pour la valeur hexadécimale
   - Un sélecteur de couleur qui s'affiche au clic

3. **Sélection de couleur** : Lorsque l'utilisateur clique sur l'aperçu ou le champ, un popup s'affiche avec :
   - Un canvas pour sélectionner visuellement une couleur (teinte/saturation/luminosité)
   - Une grille de couleurs prédéfinies pour une sélection rapide

4. **Mise à jour des données** : Lorsqu'une couleur est sélectionnée :
   - La valeur de la cellule est mise à jour (`data-value`)
   - L'aperçu visuel est actualisé
   - Un événement `cell:change` est déclenché pour notifier TableFlow
   - La ligne est marquée comme modifiée si nécessaire

## Événements

Le plugin écoute et émet plusieurs événements :

### Événements écoutés

- `cell:saved` : Lorsqu'une cellule est sauvegardée, le plugin met à jour la valeur initiale.
- `row:saved` : Lorsqu'une ligne est sauvegardée, le plugin met à jour les valeurs initiales de toutes les cellules de couleur.
- `row:added` : Lorsqu'une nouvelle ligne est ajoutée, le plugin configure les nouvelles cellules de couleur.

### Événements émis

- `cell:change` : Émis lorsque la couleur d'une cellule est modifiée.

### Structure des données d'événement

```javascript
// Pour cell:change
{
    detail: {
        cellId: 'color_1',        // ID de la cellule
        columnId: 'color',        // ID de la colonne
        rowId: 'row_1',           // ID de la ligne
        oldValue: '#FF0000',      // Ancienne valeur
        newValue: '#00FF00',      // Nouvelle valeur
        cell: HTMLTableCellElement, // Référence à la cellule
        source: 'color',          // Source de l'événement
        tableId: 'myTable',       // ID du tableau
        eventId: 'unique_id'      // ID unique de l'événement
    }
}
```

## Méthodes publiques

- `refresh()` : Rafraîchit le plugin et reconfigure les cellules de couleur.
- `isManagedCell(cell)` : Vérifie si une cellule est gérée par ce plugin.
- `toHexColor(color)` : Convertit une valeur de couleur en format hexadécimal.

## Exemples d'utilisation

### Configuration de base

```javascript
const colorPlugin = new ColorPlugin();
table.registerPlugin(colorPlugin);
```

### Configuration avec couleurs personnalisées

```javascript
const colorPlugin = new ColorPlugin({
    presetColors: [
        { color: '#E57373', label: 'R' },
        { color: '#81C784', label: 'G' },
        { color: '#64B5F6', label: 'B' },
        { color: '#FFD54F', label: 'Y' },
        { color: '#BA68C8', label: 'P' },
        { color: '#4DB6AC', label: 'T' },
        { color: '#616161', label: 'Gr' },
        { color: '#FFFFFF', label: 'W' }
    ],
    customClass: 'material-colors'
});
table.registerPlugin(colorPlugin);
```

### Réaction aux changements de couleur

```javascript
const colorPlugin = new ColorPlugin({
    onColorChange: (details) => {
        const { cell, oldValue, newValue, row } = details;
        
        // Exemple : Changer la couleur de fond de la ligne
        if (cell.id.startsWith('bgColor_')) {
            row.style.backgroundColor = newValue;
        }
        
        // Exemple : Enregistrer la modification via API
        fetch('/api/update-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                rowId: row.id, 
                columnId: cell.id.split('_')[0],
                color: newValue 
            })
        });
    }
});
table.registerPlugin(colorPlugin);
```

## Styles CSS recommandés

Le plugin Color utilise les styles CSS de ColorFlow, mais vous pouvez personnaliser l'apparence des cellules de couleur :

```css
/* Style pour les cellules de couleur */
.td-color {
    padding: 8px !important;
    cursor: pointer;
}

/* Style pour le wrapper de couleur */
.tf-color-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Style pour l'aperçu de couleur */
.color-preview {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid #ddd;
}

/* Style pour l'input de couleur */
.color-input {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 14px;
    width: 80px;
}

/* Style pour le sélecteur de couleur */
.nv-color-picker.my-color-theme {
    border: 2px solid #3498db;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

## Intégration avec d'autres plugins

Le plugin Color fonctionne bien avec d'autres plugins de TableFlow :

- **Edit** : Permet d'éditer d'autres types de données dans le même tableau.
- **Actions** : Permet d'ajouter des boutons d'action pour sauvegarder les modifications de couleur.
- **Validation** : Permet de valider les valeurs de couleur selon des règles spécifiques.

## Dépendances

- **ColorFlow** : Le plugin nécessite la bibliothèque ColorFlow pour fonctionner.
  - Fichier JS : `colorFlow.js`
  - Fichier CSS : `colorFlow.css`

## Bonnes pratiques

1. **Valeurs initiales** : Assurez-vous que les cellules contiennent des valeurs de couleur valides au format hexadécimal (#RRGGBB).

2. **Performance** : Pour les tableaux avec de nombreuses cellules de couleur, considérez l'utilisation de la délégation d'événements.

3. **Accessibilité** : Ajoutez des labels ou des tooltips pour aider les utilisateurs à comprendre la signification des couleurs.

4. **Validation** : Utilisez le plugin Validation en complément pour des règles de validation spécifiques aux couleurs.

5. **Sauvegarde** : Combinez avec le plugin Actions pour permettre aux utilisateurs de sauvegarder les modifications de couleur.

## Compatibilité

- Navigateurs modernes : Chrome, Firefox, Safari, Edge
- IE11 avec polyfills appropriés

## Changelog

### Version 2.0.0
- Intégration complète avec ColorFlow
- Support pour les couleurs prédéfinies personnalisables
- Amélioration de la gestion des événements
- Ajout du callback onColorChange
- Meilleure validation et conversion des couleurs

### Version 1.0.0
- Version initiale avec support basique pour la sélection de couleur