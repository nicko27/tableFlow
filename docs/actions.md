# Plugin Actions

Le plugin Actions permet d'ajouter des boutons d'action interactifs dans les cellules d'un tableau TableFlow. Il est idéal pour implémenter des fonctionnalités comme l'édition, la suppression, la sauvegarde ou toute autre action personnalisée sur les lignes du tableau.

**Version actuelle :** 1.2.0  
**Type :** action  
**Auteur :** TableFlow Team

## Fonctionnalités

- Ajout de boutons d'action dans des colonnes dédiées
- Configuration flexible des actions via des attributs HTML
- Support pour les icônes et tooltips
- Affichage conditionnel des actions (ex: uniquement sur les lignes modifiées)
- Confirmation avant exécution des actions
- Support pour les actions asynchrones
- Désactivation conditionnelle des actions
- Auto-sauvegarde des modifications

## Installation

```javascript
import TableFlow from 'path/to/tableFlow';
import ActionsPlugin from 'path/to/tableFlow/plugins/actions';

const table = new TableFlow('#myTable', {
    // Options du tableau
});

const actionsPlugin = new ActionsPlugin({
    // Configuration du plugin
});

table.registerPlugin(actionsPlugin);
```

## Configuration

### Options de base

```javascript
const actionsPlugin = new ActionsPlugin({
    actionAttribute: 'th-actions',        // Attribut HTML pour marquer les colonnes d'actions
    sqlExcludeAttribute: 'th-sql-exclude', // Attribut pour exclure des colonnes de la collecte de données
    cellClass: 'td-actions',              // Classe CSS pour les cellules d'actions
    useIcons: true,                       // Utiliser des icônes pour les actions
    debug: false,                         // Mode debug
    modifiedClass: 'modified',            // Classe CSS pour les lignes modifiées
    autoSave: false,                      // Sauvegarder automatiquement après modification
    
    // Nouvelles options (v1.2.0)
    actionButtonClass: 'action-button',   // Classe pour les boutons d'action
    actionButtonActiveClass: 'active',    // Classe pour les boutons actifs
    actionButtonDisabledClass: 'disabled', // Classe pour les boutons désactivés
    tooltipAttribute: 'data-tooltip',     // Attribut pour les tooltips
    tooltipPosition: 'top',               // Position par défaut des tooltips
});
```

### Configuration des actions

```javascript
const actionsPlugin = new ActionsPlugin({
    // ...options de base
    
    // Configuration des actions disponibles
    actions: {
        save: {
            icon: '<i class="fas fa-save"></i>',
            handler: (context) => {
                // Code pour sauvegarder la ligne
                console.log('Saving row:', context.data);
                
                // Exemple d'utilisation des utilitaires
                context.utils.markRowAsSaved();
            },
            tooltip: 'Sauvegarder',       // Texte d'info-bulle
            showOnChange: true,           // Afficher uniquement quand la ligne est modifiée
            isDisabled: (data, row) => {  // Fonction pour désactiver conditionnellement
                return data.status === 'locked';
            }
        },
        delete: {
            icon: '<i class="fas fa-trash"></i>',
            handler: (context) => {
                // Code pour supprimer la ligne
                console.log('Deleting row:', context.data);
            },
            tooltip: 'Supprimer'
        },
        edit: {
            icon: '<i class="fas fa-edit"></i>',
            handler: (context) => {
                // Code pour éditer la ligne
                console.log('Editing row:', context.data);
            },
            tooltip: 'Éditer'
        }
    },
    
    // Actions à afficher uniquement quand la ligne est modifiée
    showOnChange: ['save', 'cancel'],
    
    // Messages de confirmation
    confirmMessages: {
        delete: 'Êtes-vous sûr de vouloir supprimer cette ligne ?'
    },
    
    // Icônes personnalisées (alternative à la définition dans actions)
    icons: {
        save: '<i class="fas fa-save"></i>',
        delete: '<i class="fas fa-trash"></i>',
        edit: '<i class="fas fa-edit"></i>'
    }
});
```

## Utilisation dans le HTML

```html
<table id="myTable">
    <thead>
        <tr>
            <th id="name">Nom</th>
            <th id="email">Email</th>
            <!-- Colonne d'actions avec plusieurs actions -->
            <th id="actions" th-actions="edit,delete,save">Actions</th>
            <!-- Colonne avec une seule action -->
            <th id="view" th-actions="view">Voir</th>
        </tr>
    </thead>
    <tbody>
        <!-- Les cellules d'action seront automatiquement configurées -->
    </tbody>
</table>
```

## Contexte d'action

Lorsqu'une action est exécutée, un objet contexte est passé au handler avec les propriétés suivantes :

```javascript
{
    row,            // Élément DOM de la ligne
    cell,           // Élément DOM de la cellule d'action
    tableHandler,   // Instance de TableFlow
    data,           // Données de la ligne sous forme d'objet
    source,         // Source de l'action ('manual', 'autoSave', etc.)
    utils: {        // Méthodes utilitaires (v1.2.0+)
        markRowAsSaved: (options) => {},  // Marque la ligne comme sauvegardée
        updateActionButtons: (options) => {}, // Met à jour les boutons d'action
        refreshRow: () => {}              // Rafraîchit la ligne
    }
}
```

## Méthodes publiques

### markRowAsSaved(row, options)

Marque une ligne comme sauvegardée, met à jour les valeurs initiales et déclenche les événements appropriés.

```javascript
// Exemple d'utilisation
actionsPlugin.markRowAsSaved(rowElement, {
    actions: {
        hideAction: 'save' // Masquer le bouton de sauvegarde après l'opération
    }
});
```

### updateActionButtons(row, options)

Met à jour la visibilité et l'état des boutons d'action d'une ligne.

```javascript
// Exemple d'utilisation
actionsPlugin.updateActionButtons(rowElement, {
    showOnModified: true,      // Afficher les boutons conditionnels
    hideSpecificAction: 'save' // Masquer une action spécifique
});
```

### refreshRow(row)

Rafraîchit une ligne et ses boutons d'action (ajouté en v1.2.0).

```javascript
// Exemple d'utilisation
actionsPlugin.refreshRow(rowElement);
```

### executeAction(actionName, cell, options)

Exécute une action spécifique programmatiquement.

```javascript
// Exemple d'utilisation
actionsPlugin.executeAction('save', cellElement, {
    skipConfirm: true,  // Ignorer la confirmation
    source: 'api'       // Source personnalisée
});
```

## Événements

Le plugin écoute et émet plusieurs événements :

### Événements écoutés

- `cell:change` : Déclenché lorsqu'une cellule est modifiée
- `row:saved` : Déclenché lorsqu'une ligne est sauvegardée
- `row:added` : Déclenché lorsqu'une nouvelle ligne est ajoutée

### Événements émis

- `cell:saved` : Émis lorsqu'une cellule est marquée comme sauvegardée
- `row:saved` : Émis lorsqu'une ligne est marquée comme sauvegardée
- `row:refresh` : Émis lorsqu'une ligne est rafraîchie (v1.2.0+)

## Exemples d'utilisation

### Configuration de base

```javascript
const actionsPlugin = new ActionsPlugin({
    actions: {
        save: {
            icon: '<i class="fas fa-save"></i>',
            handler: async (context) => {
                const { data, row, utils } = context;
                
                try {
                    // Appel API pour sauvegarder les données
                    const response = await fetch('/api/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) throw new Error('Erreur de sauvegarde');
                    
                    // Marquer la ligne comme sauvegardée
                    utils.markRowAsSaved();
                    
                    // Afficher un message de succès
                    showNotification('Données sauvegardées avec succès');
                } catch (error) {
                    console.error('Erreur:', error);
                    showNotification('Erreur lors de la sauvegarde', 'error');
                }
            },
            showOnChange: true
        },
        delete: {
            icon: '<i class="fas fa-trash"></i>',
            handler: async (context) => {
                const { data, row, tableHandler } = context;
                
                try {
                    // Appel API pour supprimer l'enregistrement
                    const response = await fetch(`/api/delete/${data.id}`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) throw new Error('Erreur de suppression');
                    
                    // Supprimer la ligne du tableau
                    row.remove();
                    
                    // Afficher un message de succès
                    showNotification('Enregistrement supprimé avec succès');
                } catch (error) {
                    console.error('Erreur:', error);
                    showNotification('Erreur lors de la suppression', 'error');
                }
            }
        }
    },
    confirmMessages: {
        delete: 'Êtes-vous sûr de vouloir supprimer cet enregistrement ?'
    }
});
```

### Actions conditionnelles

```javascript
const actionsPlugin = new ActionsPlugin({
    actions: {
        approve: {
            icon: '<i class="fas fa-check"></i>',
            tooltip: 'Approuver',
            isDisabled: (data) => data.status !== 'pending',
            handler: (context) => {
                // Code pour approuver
            }
        },
        reject: {
            icon: '<i class="fas fa-times"></i>',
            tooltip: 'Rejeter',
            isDisabled: (data) => data.status !== 'pending',
            handler: (context) => {
                // Code pour rejeter
            }
        },
        edit: {
            icon: '<i class="fas fa-edit"></i>',
            tooltip: 'Éditer',
            isDisabled: (data) => ['approved', 'rejected'].includes(data.status),
            handler: (context) => {
                // Code pour éditer
            }
        }
    }
});
```

## Styles CSS recommandés

```css
/* Style de base pour les cellules d'actions */
.td-actions {
    text-align: center;
    white-space: nowrap;
}

/* Style pour les boutons d'action */
.action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin: 0 2px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

/* Style pour les boutons actifs */
.action-button.active {
    opacity: 0.7;
    pointer-events: none;
}

/* Style pour les boutons désactivés */
.action-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

/* Styles pour les différents types d'actions */
.action-button[data-action="save"] {
    color: #4caf50;
}

.action-button[data-action="delete"] {
    color: #f44336;
}

.action-button[data-action="edit"] {
    color: #2196f3;
}

/* Style pour les lignes modifiées */
tr.modified {
    background-color: rgba(255, 235, 59, 0.1);
}

/* Tooltips */
[data-tooltip] {
    position: relative;
}

[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10;
}

[data-tooltip-position="right"]:hover::after {
    left: 100%;
    bottom: 50%;
    transform: translateY(50%);
}

[data-tooltip-position="left"]:hover::after {
    right: 100%;
    left: auto;
    bottom: 50%;
    transform: translateY(50%);
}

[data-tooltip-position="bottom"]:hover::after {
    bottom: auto;
    top: 100%;
}
```

## Bonnes pratiques

1. **Nommage cohérent** : Utilisez des noms d'actions clairs et cohérents.

2. **Gestion des erreurs** : Implémentez une gestion robuste des erreurs dans vos handlers d'action.

3. **Actions asynchrones** : Pour les actions qui impliquent des appels API, utilisez des fonctions asynchrones et gérez correctement les états de chargement.

4. **Feedback visuel** : Utilisez les classes CSS fournies pour donner un retour visuel à l'utilisateur.

5. **Confirmations** : Utilisez les messages de confirmation pour les actions destructives ou importantes.

6. **Désactivation conditionnelle** : Utilisez la fonction `isDisabled` pour désactiver les actions qui ne sont pas applicables dans certains contextes.

7. **Tooltips** : Ajoutez des tooltips pour améliorer l'expérience utilisateur et clarifier la fonction de chaque action.

8. **Utilisation des utilitaires** : Profitez des méthodes utilitaires fournies dans le contexte pour simplifier votre code.

## Compatibilité

- Navigateurs modernes : Chrome, Firefox, Safari, Edge
- IE11 avec polyfills appropriés

## Changelog

### Version 1.2.0
- Ajout de classes pour les boutons d'action
- Support pour les tooltips
- Désactivation conditionnelle des actions
- Support pour les actions asynchrones
- Nouvelle méthode `refreshRow()`
- Ajout d'utilitaires dans le contexte d'action

### Version 1.1.0
- Amélioration de la gestion des événements
- Support pour l'auto-sauvegarde
- Optimisation des performances

### Version 1.0.0
- Version initiale