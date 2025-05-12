# Dixa API Client for Node.js

## Installation

Install using your choice of package manager from npm:

```bash
npm install @ChemicalLuck/dixa-api-node
```

## Usage

```typescript
import { Dixa } from "@ChemicalLuck/dixa-api-node";

const dixa = new Dixa("your-access-token");

const tags = await dixa.v1.tags.list();

console.log(tags);
```

## Resources Available

### v1

- [x] Agents
- [x] Analytics
- [] BusinessHours
- [] ChatBots
- [x] ContactEndpoints
- [x] Conversations
- [x] CustomAttributes
- [x] EndUsers
- [] Knowledge
- [x] Queues
- [] Ratings
- [x] Tags
- [x] Teams
- [] Templates
- [x] Webhooks
