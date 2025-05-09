# Documentation du Plugin TextEditor

## Vue d'ensemble

Le plugin TextEditor étend le plugin Edit pour fournir des fonctionnalités avancées d'édition de texte pour les cellules de tableau. Il ajoute des fonctions spécialisées de manipulation de texte accessibles via des menus contextuels et des raccourcis clavier, facilitant ainsi le travail avec du contenu textuel dans les tableaux.

## Version

Version actuelle : 1.0.0

## Fonctionnalités

- Actions de manipulation de texte (suppression de phrases, suppression basée sur des expressions régulières, mise en majuscules)
- Intégration avec le système de menu contextuel
- Raccourcis clavier pour les opérations textuelles courantes
- Manipulation de texte au niveau des phrases
- Opérations textuelles basées sur les expressions régulières

## Dépendances

Ce plugin nécessite :
- Plugin Edit (obligatoire)
- Plugin ContextMenu (optionnel, pour l'intégration des menus)

## Options de configuration

```javascript
{
    // Actions prédéfinies de manipulation de texte
    actions: {
        deleteSentence: {
            label: 'Supprimer cette phrase',
            icon: '✂️',
            handler: this.deleteSentence.bind(this)
        },
        deleteRegexMatch: {
            label: 'Supprimer texte contenant...',
            icon: '🔍',
            handler: this.deleteRegexMatch.bind(this)
        },
        capitalizeSentence: {
            label: 'Mettre en majuscules',
            icon: 'Aa',
            handler: this.capitalizeSentence.bind(this)
        }
    },
    
    // Raccourcis clavier
    shortcutsEnabled: true,
    shortcuts: {
        'Ctrl+Delete': 'deleteSentence'
    },
    
    // Titre de la section dans le menu contextuel
    menuSection: 'Texte',
    
    // Mode débogage
    debug: false
}
```

## Exemples d'utilisation

### Configuration de base

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'ContextMenu', 'TextEditor'],
        texteditor: {
            debug: true
        }
    }
});
```

### Actions personnalisées et raccourcis

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'ContextMenu', 'TextEditor'],
        texteditor: {
            actions: {
                // Conserver les actions par défaut
                deleteSentence: {
                    label: 'Supprimer la phrase',
                    icon: '✂️',
                    handler: function(cell, text) {
                        // Le gestionnaire par défaut sera utilisé
                    }
                },
                // Ajouter une action personnalisée
                convertToLowercase: {
                    label: 'Convertir en minuscules',
                    icon: 'aA',
                    handler: function(cell, text) {
                        if (!text) return;
                        const newText = text.toLowerCase();
                        this.updateCellValue(cell, newText);
                    }
                }
            },
            shortcuts: {
                'Ctrl+Delete': 'deleteSentence',
                'Ctrl+L': 'convertToLowercase'
            },
            menuSection: 'Opérations de texte'
        }
    }
});
```

## Actions intégrées

### deleteSentence

Permet à l'utilisateur de sélectionner et supprimer une phrase spécifique du texte. Le plugin va :
1. Diviser le texte en phrases
2. Présenter une liste des phrases à l'utilisateur
3. Supprimer la phrase sélectionnée
4. Mettre à jour la cellule avec le texte modifié

### deleteRegexMatch

Supprime le texte correspondant à un modèle d'expression régulière :
1. Demande à l'utilisateur de saisir un modèle de recherche
2. Crée une expression régulière insensible à la casse
3. Supprime toutes les correspondances du texte
4. Met à jour la cellule avec le texte filtré

### capitalizeSentence

Convertit la première phrase du texte en majuscules.

## Intégration avec le menu contextuel

Lorsque le plugin ContextMenu est disponible, TextEditor ajoute ses actions au menu contextuel :

1. Un en-tête de section (configurable via `menuSection`)
2. Des éléments de menu pour chaque action configurée
3. Des icônes pour l'identification visuelle

## Raccourcis clavier

Le plugin prend en charge les raccourcis clavier pour un accès rapide aux opérations textuelles :

- Format : `'Modificateur+Touche': 'idAction'`
- Modificateurs pris en charge : `Ctrl`, `Alt`, `Shift`
- Exemple : `'Ctrl+Delete': 'deleteSentence'`

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `executeAction(actionId, cell)` | Exécute une action textuelle | `actionId` - ID de l'action à exécuter<br>`cell` - Cellule cible |
| `splitIntoSentences(text)` | Divise le texte en phrases | `text` - Texte à diviser |
| `updateCellValue(cell, newValue)` | Met à jour la valeur de la cellule | `cell` - Cellule à mettre à jour<br>`newValue` - Nouvelle valeur textuelle |

## Événements

Le plugin déclenche les événements standard de TableFlow :

| Événement | Description | Objet de détail |
|-------|-------------|---------------|
| `cell:change` | Déclenché lorsque le contenu de la cellule change | `{ cellId, columnId, rowId, value, oldValue, cell, source: 'textEditor', tableId }` |

## Bonnes pratiques

1. **Combiner avec le plugin Edit** : TextEditor améliore les fonctionnalités du plugin Edit, utilisez-les donc toujours ensemble.
2. **Ajouter ContextMenu pour une meilleure expérience utilisateur** : Bien qu'optionnel, le plugin ContextMenu offre une meilleure expérience utilisateur.
3. **Définir des raccourcis intuitifs** : Choisissez des raccourcis clavier faciles à mémoriser et qui n'entrent pas en conflit avec les raccourcis par défaut du navigateur.
4. **Personnaliser les actions** : Ajoutez des opérations textuelles spécifiques à votre domaine qui ont du sens pour vos données.
5. **Fournir des libellés et des icônes clairs** : Assurez-vous que les utilisateurs comprennent ce que fait chaque action.

## Dépannage

| Problème | Solution |
|-------|----------|
| Les actions n'apparaissent pas dans le menu contextuel | Assurez-vous que le plugin ContextMenu est chargé et correctement configuré |
| Les raccourcis clavier ne fonctionnent pas | Vérifiez que `shortcutsEnabled` est à true et que les raccourcis sont correctement définis |
| Les opérations textuelles ne fonctionnent pas correctement | Vérifiez que la cellule contient du texte et est éditable |
| Erreurs d'expression régulière | Assurez-vous que les utilisateurs saisissent des modèles d'expression régulière valides |

## Utilisation avancée

### Action de traitement de texte personnalisée

```javascript
// Obtenir l'instance du plugin
const textEditorPlugin = table.getPlugin('texteditor');

// Ajouter une action personnalisée
textEditorPlugin.config.actions.formatPhoneNumber = {
    label: 'Formater comme numéro de téléphone',
    icon: '📞',
    handler: function(cell, text) {
        if (!text) return;
        
        // Supprimer les caractères non numériques
        const digits = text.replace(/\D/g, '');
        
        // Formater comme XX XX XX XX XX (format français)
        if (digits.length === 10) {
            const formatted = `${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 6)} ${digits.substring(6, 8)} ${digits.substring(8)}`;
            this.updateCellValue(cell, formatted);
        } else {
            alert('Format de numéro de téléphone invalide');
        }
    }
};

// Ajouter un raccourci pour la nouvelle action
textEditorPlugin.config.shortcuts['Ctrl+P'] = 'formatPhoneNumber';
```

### Intégration avec la validation

```javascript
// Obtenir les plugins
const textEditorPlugin = table.getPlugin('texteditor');
const validationPlugin = table.getPlugin('validation');

// Ajouter une validation pour le texte après édition
textEditorPlugin.originalUpdateCellValue = textEditorPlugin.updateCellValue;
textEditorPlugin.updateCellValue = function(cell, newValue) {
    // Valider avant la mise à jour
    if (validationPlugin && typeof validationPlugin.validateValue === 'function') {
        const columnId = cell.id.split('_')[0];
        const isValid = validationPlugin.validateValue(columnId, newValue);
        
        if (!isValid) {
            alert('Valeur invalide');
            return;
        }
    }
    
    // Appeler la méthode originale
    this.originalUpdateCellValue(cell, newValue);
};
```