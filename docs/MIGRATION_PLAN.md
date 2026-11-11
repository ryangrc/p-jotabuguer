# Arquitetura compartilhada e migração dos dados

O plano anterior foi substituído pela implementação descrita em `README.md` na raiz. A nova API está em `cloud/` e a interface usa `services/cloud-client.js`. Não use os antigos comandos de inicialização do backend isolado.

Antes de ativar a nova versão para a operação, importe e confira o backup do navegador original. O banco remoto não lê automaticamente dados guardados em outros dispositivos.
