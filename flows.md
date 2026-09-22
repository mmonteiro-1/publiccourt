# Campo Livre — App Flows

## Player booking flow

```mermaid
flowchart TD
    A[player looking for court] --> B[walk in]
    A --> C[bookable]

    C --> D{has login on\nCampo Livre?}
    D -- NO --> F[redirects to login]
    D -- YES --> E{is registered\nfor that court?}

    E -- YES --> G[see calendar\nwith availability]
    G --> H[book a game]

    E -- NO --> I[applies to registration]
    I --> J{does the owner\nknow that person?\nie: is associate}

    J -- YES --> K[player can book a game]
    K --> G

    J -- NO --> L[respond with invite\nto register in person]
```
