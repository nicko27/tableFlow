# Documentation du Plugin Validation

## Vue d'ensemble

Le plugin Validation ajoute des fonctionnalités de validation des données aux tableaux TableFlow. Il permet de définir des règles de validation pour les cellules et empêche l'enregistrement de données invalides, tout en fournissant des retours visuels et des messages d'erreur explicites.

## Version

Version actuelle : 1.1.0

## Fonctionnalités

- Validation des données lors de l'édition des cellules
- Validation en temps réel pendant la saisie
- Messages d'erreur personnalisables
- Validateurs intégrés pour les types de données courants
- Support pour les validateurs personnalisés
- Intégration avec les attributs de validation HTML5
- Retour visuel pour les erreurs de validation

## HTML Attributes

| Attribut | Applied to | Description |
|-----------|------------|-------------|
| `th-validate` | `<th>` | Définit les règles de validation pour une colonne au format JSON |

## Options de configuration

```javascript
{
    validateAttribute: 'th-validate',  // Attribut pour définir les règles de validation
    validateClass: 'validate-cell',    // Classe CSS pour les cellules avec validation
    invalidClass: 'invalid',           // Classe CSS pour les cellules invalides
    errorClass: 'validation-error',    // Classe CSS pour les messages d'erreur
    
    // Validateurs intégrés (peuvent être étendus)
    validators: {
        // Validation de longueur, email, nombre, date, regex, etc.
        // Voir la section "Validateurs intégrés" ci-dessous
    },
    
    debug: false                       // Mode débogage
}
```

## Validateurs intégrés

Le plugin inclut plusieurs validateurs prêts à l'emploi :

### Validation de longueur

```javascript
{
    maxLength: 50,     // Longueur maximale
    minLength: 5       // Longueur minimale
}
```

### Validation numérique

```javascript
{
    number: {
        min: 0,        // Valeur minimale
        max: 100,      // Valeur maximale
        integer: true, // Doit être un entier
        step: 0.01     // Pas pour les incréments
    }
}
```

### Validation d'email

```javascript
{
    email: true        // Doit être un email valide
}
```

### Validation de date

```javascript
{
    date: {
        minDate: '2023-01-01', // Date minimale
        maxDate: '2023-12-31'  // Date maximale
    }
}
```

### Validation par expression régulière

```javascript
{
    regex: {
        pattern: '^[A-Z][a-z]+$',           // Expression régulière
        patternMessage: 'Format incorrect'   // Message d'erreur personnalisé
    }
}
```

### Champ obligatoire

```javascript
{
    required: true     // Le champ ne peut pas être vide
}
```

## Exemples d'utilisation

### Configuration de base

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'Validation'],
        validation: {
            debug: true
        }
    }
});
```

### Configuration via attributs HTML

```html
<table id="monTableau">
    <thead>
        <tr>
            <th id="name" th-edit th-validate='{"minLength": 2, "maxLength": 50}'>Nom</th>
            <th id="email" th-edit th-validate='{"email": true, "required": true}'>Email</th>
            <th id="age" th-edit th-validate='{"number": {"min": 18, "max": 120, "integer": true}}'>Âge</th>
            <th id="date" th-edit th-validate='{"date": {"minDate": "2023-01-01"}}'>Date</th>
            <th id="code" th-edit th-validate='{"regex": {"pattern": "^[A-Z]{3}[0-9]{3}$", "patternMessage": "Format: 3 lettres majuscules suivies de 3 chiffres"}}'>Code</th>
        </tr>
    </thead>
    <tbody>
        <!-- Données du tableau -->
    </tbody>
</table>
```

### Ajout d'un validateur personnalisé

```javascript
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'Validation']
    }
});

// Récupérer l'instance du plugin
const validationPlugin = table.getPlugin('validation');

// Ajouter un validateur personnalisé
validationPlugin.registerValidator('frenchPhoneNumber', (value) => {
    if (!value) return true;
    
    // Valider un numéro de téléphone français
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    
    if (!phoneRegex.test(value)) {
        return 'Numéro de téléphone français invalide';
    }
    
    return true;
});
```

## Méthodes

| Méthode | Description | Paramètres |
|--------|-------------|------------|
| `validateValue(cell, value, config)` | Valide une valeur selon une configuration | `cell` - Cellule à valider<br>`value` - Valeur à valider<br>`config` - Configuration de validation |
| `showValidationError(cell, errorMessage)` | Affiche un message d'erreur | `cell` - Cellule concernée<br>`errorMessage` - Message d'erreur |
| `clearValidationError(cell)` | Efface un message d'erreur | `cell` - Cellule concernée |
| `registerValidator(name, validatorFn)` | Enregistre un validateur personnalisé | `name` - Nom du validateur<br>`validatorFn` - Fonction de validation |
| `refresh()` | Rafraîchit la détection des colonnes avec validation | - |

## Événements

Le plugin réagit aux événements suivants du plugin Edit :

| Hook | Action |
|------|--------|
| `beforeSave` | Valide la valeur avant l'enregistrement et empêche la sauvegarde si invalide |
| `afterEdit` | Configure l'input pour la validation en temps réel |

## Styles CSS

Le plugin ajoute plusieurs classes CSS qui peuvent être personnalisées :

```css
/* Cellule avec validation */
.validate-cell {
    /* Styles pour les cellules avec validation */
}

/* Cellule avec valeur invalide */
.invalid {
    border: 1px solid red;
    background-color: rgba(255, 0, 0, 0.05);
}

/* Conteneur de message d'erreur */
.validation-error {
    color: red;
    font-size: 0.8em;
    margin-top: 2px;
    display: block;
}
```

## Bonnes pratiques

1. **Messages d'erreur clairs** : Utilisez des messages d'erreur explicites qui guident l'utilisateur vers la correction.
2. **Validation en temps réel** : Activez la validation pendant la saisie pour un retour immédiat.
3. **Combinaison de validateurs** : Combinez plusieurs validateurs pour des règles complexes.
4. **Validateurs personnalisés** : Créez des validateurs spécifiques à votre domaine métier.
5. **Styles visuels** : Utilisez des styles CSS distincts pour les erreurs de validation.

## Dépannage

| Problème | Solution |
|-------|----------|
| La validation ne fonctionne pas | Vérifiez que l'attribut `th-validate` est correctement configuré avec un JSON valide |
| Les messages d'erreur ne s'affichent pas | Assurez-vous que les styles CSS pour `.validation-error` sont correctement définis |
| La validation bloque l'enregistrement sans message | Vérifiez la console pour des erreurs JavaScript dans vos validateurs |
| Les validateurs personnalisés ne sont pas appelés | Assurez-vous que le validateur est correctement enregistré avant l'édition |
| La validation HTML5 ne fonctionne pas | Vérifiez que le type d'input est correctement défini (email, number, date, etc.) |

## Utilisation avancée

### Validation conditionnelle

```javascript
// Ajouter un validateur qui dépend d'autres valeurs dans la ligne
validationPlugin.registerValidator('conditionalRequired', (value, config, cell) => {
    // Si la cellule est vide
    if (!value || value.trim() === '') {
        // Récupérer la ligne
        const row = cell.closest('tr');
        
        // Récupérer la valeur d'une autre cellule dans la même ligne
        const otherCell = row.querySelector('td[id^="status_"]');
        if (otherCell) {
            const otherValue = otherCell.getAttribute('data-value') || otherCell.textContent.trim();
            
            // Si l'autre cellule a une certaine valeur, ce champ est obligatoire
            if (otherValue === 'active') {
                return 'Ce champ est obligatoire pour les éléments actifs';
            }
        }
    }
    
    return true;
});
```

### Validation asynchrone

```javascript
// Ajouter un validateur asynchrone (par exemple pour vérifier l'unicité)
validationPlugin.registerValidator('uniqueEmail', async (value, config, cell) => {
    if (!value) return true;
    
    try {
        // Appel à une API pour vérifier l'unicité
        const response = await fetch(`/api/check-email?email=${encodeURIComponent(value)}`);
        const data = await response.json();
        
        if (!data.isUnique) {
            return 'Cet email est déjà utilisé';
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'unicité:', error);
        return 'Impossible de vérifier l\'unicité de l\'email';
    }
});
```

### Validation avec dépendances externes

```javascript
// Utiliser une bibliothèque externe pour la validation
import * as yup from 'yup';

// Créer un schéma de validation
const userSchema = yup.object().shape({
    name: yup.string().required('Le nom est obligatoire').min(2, 'Le nom doit avoir au moins 2 caractères'),
    email: yup.string().email('Email invalide').required('L\'email est obligatoire'),
    age: yup.number().integer('L\'âge doit être un entier').min(18, 'Âge minimum: 18 ans')
});

// Enregistrer un validateur qui utilise Yup
validationPlugin.registerValidator('yupSchema', (value, config, cell) => {
    const fieldName = cell.id.split('_')[0]; // Extraire le nom du champ de l'ID de la cellule
    
    try {
        // Valider le champ avec Yup
        yup.reach(userSchema, fieldName).validateSync(value);
        return true;
    } catch (error) {
        return error.message;
    }
});
```

### Intégration avec d'autres plugins

```javascript
// Intégration avec le plugin LineToggle pour mettre en évidence les lignes avec erreurs
const table = new TableFlow({
    tableId: 'monTableau',
    plugins: {
        names: ['Edit', 'Validation', 'LineToggle'],
        validation: {
            invalidClass: 'invalid'
        },
        linetoggle: {
            applyOnChange: true,
            rules: {
                // Règle qui s'applique aux lignes contenant des cellules invalides
                '_any': [
                    {
                        test: function(row) {
                            return row.querySelector('.invalid') !== null;
                        },
                        addClass: 'row-with-errors'
                    }
                ]
            }
        }
    }
});
```