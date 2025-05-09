# Documentation du Plugin ContextMenu

## Vue d'ensemble

Le plugin ContextMenu ajoute un menu contextuel personnalisé aux tableaux TableFlow. Il permet d'afficher un menu contextuel lorsque l'utilisateur fait un clic droit sur une cellule du tableau, offrant ainsi un accès rapide à diverses actions et fonctionnalités.

## Version

Version actuelle : 1.1.0

## Fonctionnalités

- Menu contextuel personnalisé sur clic droit
- Architecture extensible basée sur des fournisseurs (providers)
- Support pour les en-têtes de section, séparateurs et éléments de menu
- Positionnement intelligent pour éviter les débordements d'écran
- Support pour les icônes dans les éléments de menu
- Gestion des éléments désactivés
- Fermeture automatique du menu lors d'un clic ailleurs ou avec la touche Échap

## Options de configuration

```javascript
{
    menuClass: 'tf-context-menu',         // Classe CSS pour le menu
    menuItemClass: 'tf-menu-item',        // Classe CSS pour les éléments de menu
    menuSeparatorClass: 'tf-menu-separator', // Classe CSS pour les séparateurs
    menuHeaderClass: 'tf-menu-header',    // Classe CSS pour les en-têtes de section
    debug: false                          // Mode débogage
}
```

## Architecture des fournisseurs (providers)

Le plugin ContextMenu utilise une architecture basée sur des fournisseurs. Chaque fournisseur est responsable de fournir des éléments de menu pour des contextes spécifiques. Un fournisseur doit implémenter :

1. Une méthode `getMenuItems(cell)` qui retourne un tableau d'éléments de menu
2. Une méthode `executeAction(actionId, cell)` qui exécute une action lorsqu'un élément de menu est cliqué

## Structure des éléments de menu

Les éléments de menu peuvent être de trois types :

### Élément standard
```javascript
{
    id: 'actionId',           // Identifiant unique de l'action
    label: 'Texte du menu',   // Texte affiché dans le menu
    icon: '✏️',               // Icône optionnelle (HTML ou emoji)
    disabled: false           // État désactivé optionnel
}
```

### En-tête de section
```javascript
{
    type: 'header',
    label: 'Nom de la section'
}
```

### Séparateur
```javascript
{
    type: 'separator'
}
```

## Exemples d'utilisation

### Configuration de base

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['ContextMenu'],
        contextmenu: {
            debug: true
        }
    }
});
```

### Création d'un fournisseur de menu personnalisé

```javascript
class MonFournisseurMenu {
    constructor() {
        this.name = 'monFournisseur';
    }
    
    // Méthode requise pour fournir des éléments de menu
    getMenuItems(cell) {
        return [
            { type: 'header', label: 'Actions personnalisées' },
            { id: 'action1', label: 'Action 1', icon: '🔍' },
            { id: 'action2', label: 'Action 2', icon: '📝' },
            { id: 'action3', label: 'Action désactivée', icon: '❌', disabled: true }
        ];
    }
    
    // Méthode requise pour exécuter les actions
    executeAction(actionId, cell) {
        switch (actionId) {
            case 'action1':
                alert('Action 1 exécutée sur la cellule ' + cell.id);
                break;
            case 'action2':
                alert('Action 2 exécutée sur la cellule ' + cell.id);
                break;
        }
    }
}

// Enregistrer le fournisseur
const contextMenuPlugin = table.getPlugin('contextmenu');
contextMenuPlugin.registerProvider(new MonFournisseurMenu());
```

### Intégration avec d'autres plugins

Le plugin ContextMenu est conçu pour s'intégrer facilement avec d'autres plugins. Par exemple, avec le plugin TextEditor :

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'ContextMenu', 'TextEditor'],
        contextmenu: {
            debug: true
        },
        texteditor: {
            menuSection: 'Édition de texte'
        }
    }
});
```

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `registerProvider(provider)` | Enregistre un fournisseur de menu | `provider` - Objet fournisseur avec les méthodes requises |
| `unregisterProvider(provider)` | Désenregistre un fournisseur de menu | `provider` - Objet fournisseur précédemment enregistré |
| `showMenu(x, y, items)` | Affiche le menu à une position spécifique | `x`, `y` - Coordonnées<br>`items` - Éléments de menu |
| `hideMenu()` | Masque le menu contextuel | - |
| `refresh()` | Rafraîchit le plugin | - |
| `destroy()` | Nettoie les ressources du plugin | - |

## Création d'un fournisseur de menu

Pour créer un fournisseur de menu compatible, vous devez implémenter deux méthodes principales :

### getMenuItems(cell)

Cette méthode doit retourner un tableau d'éléments de menu à afficher pour une cellule donnée.

```javascript
getMenuItems(cell) {
    // Vous pouvez analyser la cellule pour déterminer quels éléments afficher
    const columnId = cell.id.split('_')[0];
    
    // Retourner différents éléments selon le contexte
    if (columnId === 'description') {
        return [
            { type: 'header', label: 'Actions de texte' },
            { id: 'format', label: 'Formater le texte', icon: '✨' },
            { id: 'clear', label: 'Effacer', icon: '🗑️' }
        ];
    }
    
    return [];
}
```

### executeAction(actionId, cell)

Cette méthode est appelée lorsqu'un élément de menu est cliqué.

```javascript
executeAction(actionId, cell) {
    switch (actionId) {
        case 'format':
            // Logique pour formater le texte
            const text = cell.textContent;
            const formatted = text.trim().replace(/\s+/g, ' ');
            // Mettre à jour la cellule...
            break;
        case 'clear':
            // Logique pour effacer le contenu
            // Mettre à jour la cellule...
            break;
    }
}
```

## Styles CSS personnalisés

Vous pouvez personnaliser l'apparence du menu contextuel en définissant des styles CSS pour les classes configurées :

```css
.tf-context-menu {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    padding: 5px 0;
    min-width: 180px;
}

.tf-menu-item {
    padding: 8px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.tf-menu-item:hover {
    background-color: #f0f0f0;
}

.tf-menu-separator {
    height: 1px;
    background: #ddd;
    margin: 5px 0;
}

.tf-menu-header {
    padding: 5px 10px;
    font-weight: bold;
    color: #666;
    font-size: 0.9em;
}

.tf-menu-item .menu-icon {
    margin-right: 8px;
    width: 20px;
    text-align: center;
}

.tf-menu-item[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
}
```

## Bonnes pratiques

1. **Organiser les éléments de menu** : Utilisez des en-têtes de section et des séparateurs pour regrouper logiquement les actions.
2. **Fournir des icônes** : Les icônes aident les utilisateurs à identifier rapidement les actions.
3. **Contexte spécifique** : Adaptez les éléments de menu au contexte de la cellule (type de colonne, contenu, etc.).
4. **Désactiver plutôt que cacher** : Pour les actions qui ne sont pas applicables dans certains contextes, préférez les désactiver plutôt que les masquer.
5. **Limiter le nombre d'éléments** : Évitez de surcharger le menu avec trop d'options.

## Dépannage

| Problème | Solution |
|-------|----------|
| Le menu ne s'affiche pas | Vérifiez que vous avez au moins un fournisseur enregistré qui retourne des éléments de menu |
| Les actions ne s'exécutent pas | Assurez-vous que la méthode `executeAction` est correctement implémentée dans votre fournisseur |
| Le menu s'affiche au mauvais endroit | Vérifiez s'il y a des conflits de positionnement CSS avec d'autres éléments |
| Le menu ne se ferme pas | Vérifiez que les écouteurs d'événements pour `click` et `keydown` fonctionnent correctement |

## Utilisation avancée

### Menu dynamique basé sur le contenu de la cellule

```javascript
getMenuItems(cell) {
    const content = cell.textContent.trim();
    const items = [];
    
    // En-tête commun
    items.push({ type: 'header', label: 'Actions' });
    
    // Actions de base
    items.push({ id: 'copy', label: 'Copier', icon: '📋' });
    
    // Actions conditionnelles
    if (content.includes('@')) {
        // C'est probablement un email
        items.push({ id: 'email', label: 'Envoyer un email', icon: '✉️' });
    }
    
    if (/^\d+$/.test(content)) {
        // C'est un nombre
        items.push({ id: 'calculate', label: 'Calculer', icon: '🧮' });
    }
    
    if (content.length > 100) {
        // Texte long
        items.push({ id: 'summarize', label: 'Résumer', icon: '📝' });
    }
    
    return items;
}
```

### Intégration avec des bibliothèques externes

```javascript
class ExternalLibraryProvider {
    constructor() {
        this.name = 'externalProvider';
        this.externalLib = new ExternalLibrary();
    }
    
    getMenuItems(cell) {
        return [
            { type: 'header', label: 'Bibliothèque externe' },
            { id: 'analyze', label: 'Analyser', icon: '🔍' },
            { id: 'process', label: 'Traiter', icon: '⚙️' }
        ];
    }
    
    executeAction(actionId, cell) {
        const content = cell.textContent;
        
        switch (actionId) {
            case 'analyze':
                const result = this.externalLib.analyze(content);
                alert(`Résultat de l'analyse: ${result}`);
                break;
            case 'process':
                this.externalLib.process(content, processedResult => {
                    // Mettre à jour la cellule avec le résultat traité
                    cell.textContent = processedResult;
                });
                break;
        }
    }
}
```