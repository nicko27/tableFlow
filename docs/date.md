# Plugin Date

Le plugin Date permet d'ajouter des sélecteurs de date et d'heure interactifs aux cellules d'un tableau TableFlow. Il s'intègre avec la bibliothèque DateFlow pour offrir une expérience utilisateur intuitive et complète pour la sélection de dates et d'heures.

**Version actuelle :** 1.0.0  
**Type :** edit  
**Auteur :** TableFlow Team

## Fonctionnalités

- Sélection de date avec calendrier interactif
- Sélection d'heure avec intervalles configurables
- Mode date et heure combiné
- Mode heure uniquement
- Définition de dates minimum et maximum
- Formats de date et d'heure personnalisables
- Localisation (jours, mois, premier jour de la semaine)
- Boutons "Aujourd'hui" et "Effacer" optionnels
- Intégration complète avec les événements de TableFlow

## Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import DatePlugin from 'path/to/tableFlow/plugins/date';

// Assurez-vous d'inclure également DateFlow
// <script src="path/to/dateFlow.js"></script>
// <link rel="stylesheet" href="path/to/dateFlow.css">

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const datePlugin = new DatePlugin({
    // Configuration du plugin
});

table.registerPlugin(datePlugin);
```

## Configuration

```javascript
const datePlugin = new DatePlugin({
    dateAttribute: 'th-date',        // Attribut pour marquer les colonnes de date
    cellClass: 'td-date',            // Classe CSS pour les cellules de date
    readOnlyClass: 'readonly',       // Classe CSS pour les cellules en lecture seule
    modifiedClass: 'modified',       // Classe CSS pour les lignes modifiées
    customClass: 'my-date-theme',    // Classe CSS personnalisée pour le sélecteur
    debug: false,                    // Mode debug
    
    // Options avancées pour DateFlow
    timeInterval: 15,                // Intervalle en minutes pour le sélecteur d'heure
    firstDayOfWeek: 'monday',        // Premier jour de la semaine ('monday' ou 'sunday')
    lang: 'fr',                      // Langue pour les labels
    format: 'DD.MM.YYYY',            // Format de date par défaut
    timeFormat: 'HH:mm',             // Format d'heure par défaut
    
    // Configuration spécifique par colonne
    columns: {
        'date_column': {             // ID de la colonne
            time: true,              // Inclure la sélection de l'heure
            timeOnly: false,         // Sélection d'heure uniquement
            timeInterval: 30,        // Intervalle en minutes pour cette colonne
            format: 'YYYY-MM-DD',    // Format de date personnalisé
            min: '2023-01-01',       // Date minimum (YYYY-MM-DD)
            max: '2025-12-31',       // Date maximum (YYYY-MM-DD)
            showButtons: true,       // Afficher les boutons "Aujourd'hui" et "Effacer"
        },
        'time_column': {
            timeOnly: true,          // Sélection d'heure uniquement
            timeInterval: 5,         // Intervalle de 5 minutes
            format: 'HH:mm',         // Format d'heure
        }
    },
    
    // Callbacks
    onDateChange: (details) => {     // Fonction appelée après changement de date
        console.log('Date modifiée:', details);
    }
});
```

## Utilisation dans le HTML

Pour activer le sélecteur de date sur une colonne, ajoutez l'attribut `th-date` à l'en-tête de la colonne :

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="date_column" th-date>Date</th>
            <th id="time_column" th-date>Heure</th>
            <th id="status">Statut</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Réunion</td>
            <td>01.01.2024</td>
            <td>14:30</td>
            <td>Planifié</td>
        </tr>
        <tr>
            <td>Livraison</td>
            <td>15.02.2024</td>
            <td>09:00</td>
            <td>En attente</td>
        </tr>
    </tbody>
</table>
```

## Fonctionnement

Le plugin Date transforme les cellules des colonnes marquées avec `th-date` en sélecteurs de date et/ou d'heure interactifs :

1. **Initialisation** : Lors de l'initialisation, le plugin crée une instance de DateFlow et configure les cellules des colonnes marquées.

2. **Transformation des cellules** : Chaque cellule est transformée pour contenir un champ de saisie avec les attributs DateFlow appropriés.

3. **Sélection de date/heure** : Lorsque l'utilisateur clique sur le champ, un popup s'affiche avec :
   - Un calendrier pour sélectionner la date (sauf en mode heure uniquement)
   - Des sélecteurs pour l'heure et les minutes (si l'option `time` est activée)
   - Des boutons "Aujourd'hui" et "Effacer" (si l'option `showButtons` est activée)

4. **Mise à jour des données** : Lorsqu'une date/heure est sélectionnée :
   - La valeur de la cellule est mise à jour (`data-value`)
   - Un événement `cell:change` est déclenché pour notifier TableFlow
   - La ligne est marquée comme modifiée si nécessaire

## Événements

Le plugin écoute et émet plusieurs événements :

### Événements écoutés

- `cell:saved` : Lorsqu'une cellule est sauvegardée, le plugin met à jour la valeur initiale.
- `row:saved` : Lorsqu'une ligne est sauvegardée, le plugin met à jour les valeurs initiales de toutes les cellules de date.
- `row:added` : Lorsqu'une nouvelle ligne est ajoutée, le plugin configure les nouvelles cellules de date.

### Événements émis

- `cell:change` : Émis lorsque la date/heure d'une cellule est modifiée.

### Structure des données d'événement

```javascript
// Pour cell:change
{
    detail: {
        cellId: 'date_column_1',  // ID de la cellule
        columnId: 'date_column',  // ID de la colonne
        rowId: 'row_1',           // ID de la ligne
        oldValue: '01.01.2024',   // Ancienne valeur
        newValue: '02.01.2024',   // Nouvelle valeur
        cell: HTMLTableCellElement, // Référence à la cellule
        source: 'date',           // Source de l'événement
        tableId: 'myTable',       // ID du tableau
        eventId: 'unique_id'      // ID unique de l'événement
    }
}
```

## Méthodes publiques

- `refresh()` : Rafraîchit le plugin et reconfigure les cellules de date.
- `isManagedCell(cell)` : Vérifie si une cellule est gérée par ce plugin.

## Exemples d'utilisation

### Configuration de base

```javascript
const datePlugin = new DatePlugin();
table.registerPlugin(datePlugin);
```

### Configuration avec formats personnalisés

```javascript
const datePlugin = new DatePlugin({
    format: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    columns: {
        'date_debut': {
            time: true,
            format: 'DD/MM/YYYY HH:mm'
        },
        'date_fin': {
            time: true,
            format: 'DD/MM/YYYY HH:mm'
        },
        'heure_rappel': {
            timeOnly: true,
            timeInterval: 10
        }
    }
});
table.registerPlugin(datePlugin);
```

### Réaction aux changements de date

```javascript
const datePlugin = new DatePlugin({
    onDateChange: (details) => {
        const { cell, oldValue, newValue, row } = details;
        
        // Exemple : Vérifier si la date de fin est après la date de début
        if (cell.id.startsWith('date_fin_')) {
            const rowId = row.id;
            const dateDebutCell = document.getElementById(`date_debut_${rowId.split('_')[1]}`);
            if (dateDebutCell) {
                const dateDebut = dateDebutCell.getAttribute('data-value');
                const dateFin = newValue;
                
                if (new Date(dateFin) < new Date(dateDebut)) {
                    alert('La date de fin doit être après la date de début');
                }
            }
        }
        
        // Exemple : Enregistrer la modification via API
        fetch('/api/update-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                rowId: row.id, 
                columnId: cell.id.split('_')[0],
                date: newValue 
            })
        });
    }
});
table.registerPlugin(datePlugin);
```

## Styles CSS recommandés

Le plugin Date utilise les styles CSS de DateFlow, mais vous pouvez personnaliser l'apparence des cellules de date :

```css
/* Style pour les cellules de date */
.td-date {
    padding: 8px !important;
    cursor: pointer;
}

/* Style pour le wrapper de date */
.tf-date-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
}

/* Style pour l'input de date */
.date-input {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 14px;
    width: 100%;
    cursor: pointer;
}

/* Style personnalisé pour le sélecteur de date */
.date-flow-picker.my-date-theme {
    border: 2px solid #16a34a;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Style pour le jour sélectionné */
.date-flow-day.date-flow-selected {
    background-color: #16a34a;
    color: white;
}
```

## Intégration avec d'autres plugins

Le plugin Date fonctionne bien avec d'autres plugins de TableFlow :

- **Edit** : Permet d'éditer d'autres types de données dans le même tableau.
- **Actions** : Permet d'ajouter des boutons d'action pour sauvegarder les modifications de date.
- **Validation** : Permet de valider les valeurs de date selon des règles spécifiques.

## Dépendances

- **DateFlow** : Le plugin nécessite la bibliothèque DateFlow pour fonctionner.
  - Fichier JS : `dateFlow.js`
  - Fichier CSS : `dateFlow.css`

## Bonnes pratiques

1. **Formats cohérents** : Utilisez des formats de date cohérents dans toute votre application.

2. **Validation** : Utilisez les options `min` et `max` pour limiter les dates sélectionnables.

3. **Intervalles appropriés** : Choisissez des intervalles de temps adaptés à votre cas d'utilisation (15 minutes pour des rendez-vous, 1 minute pour des horaires précis).

4. **Localisation** : Configurez la langue et le premier jour de la semaine selon les préférences de vos utilisateurs.

5. **Accessibilité** : Assurez-vous que les champs de date ont des labels explicites pour les utilisateurs de lecteurs d'écran.

## Compatibilité

- Navigateurs modernes : Chrome, Firefox, Safari, Edge
- IE11 avec polyfills appropriés

## Limitations connues

- Les formats de date doivent correspondre à ceux supportés par DateFlow.
- La bibliothèque DateFlow doit être chargée avant l'initialisation du plugin.

## Changelog

### Version 1.0.0
- Version initiale avec support pour la sélection de date et d'heure
- Intégration avec DateFlow
- Configuration par colonne
- Support pour les événements TableFlow