# Gaia-X Module Documentation

### Overview

The module enables Carecentive users to register questionnaires and Withings data via Gaia-X-compliant processes. This allows data to be consumed by users outside of the Carecentive platform. The module includes several new API resources that accept tokens obtained through the Gaia-X contracting process.

### API Endpoints

Below is a list of the API endpoints implemented in the Carecentive app, including their HTTP methods, required authorization, and descriptions.

| **Endpoint**                                                  | **HTTP Method** | **Authorization**   | **Description**                                                 |
|---------------------------------------------------------------|-----------------|---------------------|-----------------------------------------------------------------|
| `/admin/gaia-x/participants`                                  | `GET`           | Authenticated Admin | Fetches all registered Gaia-X Participants                      |
| `/admin/gaia-x/participants/:participantId`                   | `GET`           | Authenticated Admin | Fetches a single Gaia-X Participant                             |
| `/admin/gaia-x/participants`                                  | `POST`          | Authenticated Admin | Registers a Gaia-X Participant and creates related credentials  |
| `/gaia-x/data-products`                                       | `GET`           | Unrestricted        | Fetches all registered data products                            |
| `/gaia-x/data-products/:dataProductId`                        | `GET`           | Unrestricted        | Fetches a single data product                                   |
| `/gaia-x/data-products`                                       | `POST`          | Authenticated Admin | Registers a data product and creates related Gaia-X credentials |
| `/gaia-x/data-products/:dataProductId/contracts`              | `POST`          | Unrestricted        | Creates a contract proposal for a data product                  |
| `/gaia-x/data-products/:dataProductId/contracts/:contractId`  | `PUT`           | Unrestricted        | Publishes a signed contract for the given data product          |
| `/gaia-x/data-products/:dataProductId/contracts/:contractId`  | `GET`           | Contract Signature  | Fetches the signed contract from both parties                   |
| `/admin/gaia-x/data-product-contracts`                        | `GET`           | Authenticated Admin | Fetches all data product contracts (proposals)                  |
| `/admin/gaia-x/data-product-contracts/:dataProductContractId` | `GET`           | Authenticated Admin | Fetches a data product contract (proposal)                      |
| `/admin/gaia-x/data-product-contracts/:dataProductContractId` | `PUT`           | Authenticated Admin | Signs a data product contract proposal                          |
| `/admin/gaia-x/data-product-contracts/:dataProductContractId` | `DELETE`        | Authenticated Admin | Rejects a data product contract proposal                        |
| `/gaia-x/authentication`                                      | `POST`          | Unrestricted        | Issues a temporary access token based on a valid contract       |

## Workflows

The following sections describe the workflows involved in the Gaia-X data exchange module.

### Participant Registration

Before a data product can be registered, the Carecentive admin must create a participant. This is done via a `POST` request to the `/api/admin/gaia-x/participants` endpoint, including details about the organization, such as VAT ID, organization name, and country code. Additionally, a certificate chain and corresponding private key are required to sign the Gaia-X Credentials and create a DID.

**Example Request:**

```http
POST /api/admin/gaia-x/participants HTTP/1.1
Content-Type: application/json

{
    "certificateChain": [
        "-----BEGIN CERTIFICATE-----...",
        "-----BEGIN CERTIFICATE-----..."
    ],
    "privateKey": "-----BEGIN PRIVATE KEY-----...",
    "vatId": "DE132507686",
    "organizationName": "Acme Corporation",
    "countryCode": "DE-BY",
    "participantSlug": "acme-corp"
}
```

A successful request results in the creation of a database record and the generation of a DID document, which is then used to create various Gaia-X credentials.

### Data Product Registration

Once a participant is created, they can register data products. This is done via a `POST` request to the `/api/gaia-x/data-products` endpoint. The request includes the participant ID, the route to be shared, and various fields necessary to create Gaia-X credentials, such as `title`, `description`, and `termsOfUsage`.

**Example Request:**

```http
POST /api/gaia-x/data-products HTTP/1.1
Content-Type: application/json

{
    "participantId": 1,
    "title": "Palliative Care Questionnaires",
    "description": "sample description",
    "termsAndConditions": "sample terms and conditions",
    "termsOfUsage": "sample terms of usage",
    "license": "sample license",
    "policy": "default: allow",
    "route": "/api/questionnaires",
    "dataCreatedAt": "2024-07-01 12:00:00",
    "dataExpiresAt": "2025-01-01 12:00:00",
    "dataLanguageCode": "en",
    "privateKey": "-----BEGIN PRIVATE KEY-----..."
}
```

This creates a database record for the data product and generates various Gaia-X credentials, such as `ServiceOffering` and `DataResource`.

### Data Contracting

The contracting process is initiated by the user through a `POST` request to the `/api/gaia-x/data-products/:dataProductId/contracts` endpoint. The backend validates the provided participant credential and creates a contract proposal. The user then signs the contract using a JWS2020 formatted signature and uploads it via a `PUT` request.

**Example Contracting Process:**

1. **User selects a data product**: Fetch data products using the `GET` method on `/api/gaia-x/data-products`.
2. **User signs the contract**: Sign the contract and submit it using a `PUT` request.
3. **Admin co-signs the contract**: Admin signs the contract using the `/api/admin/gaia-x/data-product-contracts/:dataProductContractId` endpoint.

### Data Consumption

After a valid and signed data product contract is in place, the data consumer can begin consuming data by following these steps:

1. **Access Token Issuance**: The user obtains a temporary access token by sending a `POST` request to the `/api/gaia-x/authentication` endpoint with the data contract.
2. **Data Consumption**: The user accesses the data by using the access token in the `Authorization` header when making requests to the appropriate endpoint (`/api/questionnaires` or `/api/measurements`).

**Example Access Token Request:**

```http
POST /api/gaia-x/authentication HTTP/1.1
Content-Type: application/json

{
    "contract": "signed_contract"
}
```

This process allows the secure and compliant exchange of data within the Gaia-X ecosystem, ensuring that only authorized users can access the data as per the contract terms.

## Code Organization

To improve code readability, the data exchange module introduces two new class types:

- **Helpers**: Handle a specific subset of the problem managed by one or more Services.
- **Validators**: Enforce validation of the request body.

### Service and Helper Classes

Below is an overview of the specific classes responsible for the application logic:

- **`ThirdPartyTokenService`**: Handles the issuance of access tokens to enable Carecentive access to users outside the platform.
- **`ParticipantStorage`**: A Helper that manages the storage of Gaia-X Credentials, DID documents, and other related files in the participant-specific storage space.
- **`DidService`**: Manages the creation and management of DIDs, supported by the `ParticipantStorage` helper.
- **`GaiaXService`**: Manages the creation, signing, and management of Gaia-X Credentials. It uses `DidService` to obtain a Participant's DID and `ParticipantStorage` to manage credential storage.
- **`ParticipantService`**: Handles the creation of new Participants, utilizing `DidService` for DID creation, `GaiaXService` for Gaia-X Credential creation, and `ParticipantStorage` for Participant data management.
- **`DataProductService`**: Manages the creation of new data products and associated Gaia-X Credentials, using `GaiaXService` to issue credentials and `ParticipantStorage` to store related non-credential data.
- **`DataProductContractService`**: Manages the creation and verification of data product contracts (proposals) and the issuance of temporary access tokens. It verifies contracts and user-supplied artifacts using `GaiaXService` for credential operations, `ThirdPartyTokenService` for token issuance, and `ParticipantStorage` for reading the participant's certificate for producer signature verification.
