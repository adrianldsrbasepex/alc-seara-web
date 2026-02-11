# Script para Adicionar Veículos

Para adicionar as 12 placas oficiais ao Supabase, execute no console do navegador (F12):

```javascript
// Abra o console do navegador em http://localhost:3000 e cole este código:

import {servicoFrota} from './services/fleetService';

await servicoFrota.adicionarVeiculosOficiais()
  .then(veiculos => {
    console.log('✅ Veículos adicionados com sucesso!', veiculos);
  })
  .catch(error => {
    console.error('❌ Erro ao adicionar veículos:', error);
  });
```

## Alternativa: Usando o App.tsx

Você também pode executar a função temporariamente adicionando este useEffect no App.tsx:

```typescript
useEffect(() => {
  // Executar apenas uma vez para adicionar veículos
  servicoFrota.adicionarVeiculosOficiais()
    .then(veiculos => console.log('✅ Veículos adicionados:', veiculos))
    .catch(error => console.error('❌ Erro:', error));
}, []);
```

Depois de executar e confirmar que os veículos foram adicionados, remova o useEffect.

## Placas que serão adicionadas

- SEZ-8J71
- FRI-3B21
- SWQ-7I71
- SMS-EY19
- SJR-8D34
- RIP-1E18
- RIU-1I98
- TKE-4A87
- TJD-3L99
- TJJ-9C53
- TLN-9A77
- TMH-8B95

Todos com modelo "VUC FRIGORIFICO" e status "Disponível".
