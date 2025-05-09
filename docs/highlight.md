# Documentation du Plugin Highlight

## Vue d'ensemble

Le plugin Highlight ajoute des fonctionnalités de surlignage de texte aux tableaux TableFlow. Il permet de mettre en évidence des portions de texte dans les cellules en fonction de règles d'expression régulière définies par l'utilisateur, avec différentes couleurs et styles.

## Version

Version actuelle : 1.1.0

## Fonctionnalités

- Surlignage de texte basé sur des expressions régulières
- Groupes de surlignage avec couleurs et priorités personnalisables
- Surlignage en temps réel pendant l'édition
- Gestion des règles via une interface utilisateur
- Exclusions pour éviter le surlignage de certains motifs
- Sauvegarde et chargement des règles dans le stockage local
- Intégration avec le menu contextuel
- Import/export des configurations de surlignage

## Dépendances

Ce plugin nécessite :
- Plugin Edit (obligatoire)
- Plugin ContextMenu (optionnel, pour l'intégration des menus)

## Options de configuration

```javascript
{
    // Options générales
    highlightEnabled: true,           // Activer/désactiver le surlignage
    highlightDuringEdit: true,        // Surlignage en temps réel pendant l'édition
    highlightClass: 'tf-highlight',   // Classe CSS pour les éléments surlignés
    spanClass: 'tf-highlight-span',   // Classe CSS pour les spans de surlignage
    
    // Clé pour le stockage des règles
    storageKey: 'tableflow-highlight-rules',
    
    // Définition des groupes (entièrement configurable)
    groups: [
        {
            id: 'red',                // Identifiant unique du groupe
            name: 'Rouge',            // Nom affiché dans l'interface
            color: '#FF0000',         // Couleur du texte
            backgroundColor: 'transparent', // Couleur de fond
            priority: 0               // Priorité (plus petit = plus prioritaire)
        },
        {
            id: 'yellow',
            name: 'Jaune', 
            color: '#000000',
            backgroundColor: '#FFFF00',
            priority: 1
        },
        {
            id: 'ignored',
            name: 'Ignoré',
            isExclusion: true,        // Groupe spécial pour définir des exclusions
            priority: 10
        }
    ],
    
    // Règles par groupe (vide par défaut, rempli par l'utilisateur)
    rules: [],
    
    // Options pour le menu contextuel
    menuEnabled: true,                // Activer l'intégration avec le menu contextuel
    menuSection: 'Surlignage',        // Titre de la section dans le menu
    
    // Options pour la création de règles
    ruleCreation: {
        enabled: true,                // Autoriser la création de règles
        useAjax: false,               // Utiliser AJAX pour envoyer les règles au serveur
        ajaxUrl: '/api/rules',        // URL pour les requêtes AJAX
        ajaxMethod: 'POST',           // Méthode HTTP pour les requêtes AJAX
        ajaxHeaders: {},              // En-têtes HTTP supplémentaires
        ajaxCallback: null,           // Fonction de rappel après une requête AJAX
    },
    
    // Options pour l'interface utilisateur
    ui: {
        showGroupHeaders: true,       // Afficher les en-têtes de groupe
        groupByColor: true,           // Grouper les règles par couleur
        allowExport: true,            // Autoriser l'export des règles
        allowImport: true,            // Autoriser l'import des règles
        modalClass: 'tf-highlight-modal', // Classe CSS pour la modale
        buttonClass: 'tf-highlight-button', // Classe CSS pour les boutons
        formClass: 'tf-highlight-form', // Classe CSS pour les formulaires
        inputClass: 'tf-highlight-input' // Classe CSS pour les champs de saisie
    },
    
    debug: false                      // Mode débogage
}
```

## Structure des règles

Chaque règle de surlignage est définie comme suit :

```javascript
{
    id: 'rule_123',           // Identifiant unique (généré automatiquement si non fourni)
    group: 'red',             // ID du groupe de surlignage
    regex: 'motif',           // Expression régulière à rechercher
    exclusions: ['exception'], // Expressions régulières pour les exclusions
    enabled: true             // État d'activation de la règle
}
```

## Exemples d'utilisation

### Configuration de base

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'ContextMenu', 'Highlight'],
        highlight: {
            debug: true,
            groups: [
                {
                    id: 'important',
                    name: 'Important',
                    color: 'white',
                    backgroundColor: 'red',
                    priority: 0
                },
                {
                    id: 'note',
                    name: 'Note',
                    color: 'black',
                    backgroundColor: '#FFFF99',
                    priority: 1
                }
            ],
            rules: [
                {
                    id: 'rule1',
                    group: 'important',
                    regex: 'URGENT|IMPORTANT'
                },
                {
                    id: 'rule2',
                    group: 'note',
                    regex: 'NOTE|REMARQUE'
                }
            ]
        }
    }
});
```

### Utilisation avec exclusions

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'ContextMenu', 'Highlight'],
        highlight: {
            groups: [
                {
                    id: 'error',
                    name: 'Erreur',
                    color: 'white',
                    backgroundColor: 'red',
                    priority: 0
                },
                {
                    id: 'ignored',
                    name: 'Ignoré',
                    isExclusion: true,
                    priority: 10
                }
            ],
            rules: [
                {
                    id: 'rule_errors',
                    group: 'error',
                    regex: 'erreur|error|exception',
                    exclusions: ['erreur_connue']
                },
                {
                    id: 'rule_ignore',
                    group: 'ignored',
                    regex: 'ignore_this'
                }
            ]
        }
    }
});
```

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `highlightText(text)` | Surligne un texte selon les règles définies | `text` - Texte à surligner |
| `highlightAllCells()` | Applique le surlignage à toutes les cellules | - |
| `addRule(rule)` | Ajoute une nouvelle règle | `rule` - Objet règle à ajouter |
| `updateRule(ruleId, updates)` | Met à jour une règle existante | `ruleId` - ID de la règle<br>`updates` - Modifications à appliquer |
| `deleteRule(ruleId)` | Supprime une règle | `ruleId` - ID de la règle à supprimer |
| `toggleHighlighting(enabled)` | Active/désactive le surlignage | `enabled` - État d'activation (optionnel) |
| `loadRules()` | Charge les règles depuis le stockage local | - |
| `saveRules()` | Sauvegarde les règles dans le stockage local | - |
| `showRulesManager()` | Affiche l'interface de gestion des règles | - |
| `refresh()` | Rafraîchit le surlignage | - |

## Intégration avec le menu contextuel

Lorsque le plugin ContextMenu est disponible, Highlight ajoute les options suivantes au menu contextuel :

1. **Activer/désactiver le surlignage** : Permet d'activer ou de désactiver rapidement le surlignage
2. **Ajouter une règle** (lorsqu'un texte est sélectionné) : Permet de créer une règle à partir du texte sélectionné
3. **Gérer les règles** : Ouvre l'interface de gestion des règles

## Interface de gestion des règles

Le plugin fournit une interface utilisateur complète pour gérer les règles de surlignage :

1. **Liste des règles** : Affiche toutes les règles existantes, groupées par couleur
2. **Ajout de règle** : Formulaire pour créer une nouvelle règle
3. **Modification de règle** : Formulaire pour modifier une règle existante
4. **Suppression de règle** : Possibilité de supprimer des règles
5. **Import/Export** : Fonctionnalités pour sauvegarder et restaurer des configurations

## Styles CSS

Le plugin ajoute plusieurs classes CSS qui peuvent être personnalisées :

```css
/* Span de surlignage */
.tf-highlight-span {
    /* Les styles sont définis dynamiquement via l'attribut style */
}

/* Conteneur d'édition avec surlignage */
.tf-highlight-edit-container {
    position: relative;
    width: 100%;
}

/* Input transparent pour l'édition avec surlignage */
.tf-highlight-edit-input {
    position: relative;
    background: transparent;
    color: transparent;
    caret-color: black;
    width: 100%;
}

/* Overlay de surlignage pendant l'édition */
.tf-highlight-edit-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    white-space: pre-wrap;
    overflow: hidden;
}

/* Modale de gestion des règles */
.tf-highlight-modal {
    /* Styles définis dynamiquement */
}

/* Boutons dans l'interface */
.tf-highlight-button {
    /* Styles définis dynamiquement */
}
```

## Bonnes pratiques

1. **Définir des groupes clairs** : Créez des groupes avec des couleurs distinctes et des noms explicites
2. **Utiliser des priorités** : Définissez des priorités pour gérer les chevauchements de règles
3. **Expressions régulières précises** : Utilisez des expressions régulières spécifiques pour éviter les faux positifs
4. **Utiliser les exclusions** : Définissez des exclusions pour les cas particuliers
5. **Sauvegarder les configurations** : Utilisez les fonctionnalités d'import/export pour sauvegarder vos configurations

## Dépannage

| Problème | Solution |
|-------|----------|
| Le surlignage ne s'applique pas | Vérifiez que `highlightEnabled` est à `true` et que les cellules sont éditables |
| Les règles ne sont pas sauvegardées | Assurez-vous que `storageKey` est défini et que le stockage local est disponible |
| Certains motifs ne sont pas surlignés | Vérifiez les priorités des groupes et les règles d'exclusion |
| Le surlignage pendant l'édition ne fonctionne pas | Vérifiez que `highlightDuringEdit` est à `true` |
| Les expressions régulières ne fonctionnent pas | Testez vos expressions régulières avec un outil comme regex101.com |

## Utilisation avancée

### Création dynamique de règles

```javascript
const highlightPlugin = table.getPlugin('highlight');

// Ajouter une règle dynamiquement
highlightPlugin.addRule({
    group: 'important',
    regex: 'CRITIQUE|BLOQUANT',
    exclusions: ['CRITIQUE_RESOLU']
});

// Mettre à jour une règle existante
highlightPlugin.updateRule('rule1', {
    regex: 'URGENT|IMPORTANT|PRIORITAIRE'
});

// Supprimer une règle
highlightPlugin.deleteRule('rule2');
```

### Intégration avec d'autres plugins

```javascript
// Intégration avec le plugin Validation
const highlightPlugin = table.getPlugin('highlight');
const validationPlugin = table.getPlugin('validation');

// Ajouter une règle de surlignage pour les valeurs invalides
validationPlugin.addValidator('email', (value) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    
    if (!isValid) {
        // Ajouter une règle de surlignage temporaire pour cette valeur
        highlightPlugin.addRule({
            id: `invalid_email_${Date.now()}`,
            group: 'error',
            regex: value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        });
    }
    
    return isValid;
});
```

### Personnalisation de l'interface utilisateur

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'ContextMenu', 'Highlight'],
        highlight: {
            ui: {
                modalClass: 'ma-modale-personnalisee',
                buttonClass: 'mon-bouton-personnalise',
                showGroupHeaders: true,
                groupByColor: true,
                allowExport: true,
                allowImport: true
            }
        }
    }
});
```