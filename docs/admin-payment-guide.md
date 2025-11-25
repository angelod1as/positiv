# Guia do Admin: Sistema de Pagamentos

## Visão Geral

O sistema de pagamentos da Positiv permite que você gere links de pagamento automaticamente para participantes de eventos, envie via WhatsApp, e acompanhe o status dos pagamentos em tempo real.

**Funcionalidades principais:**
- ✅ Geração automática de links de pagamento
- ✅ Envio facilitado via WhatsApp
- ✅ Duas opções de pagamento: Pix (R$ 220) e Cartão em até 21x (R$ 227)
- ✅ Confirmação automática por email
- ✅ Acompanhamento em tempo real
- ✅ Processamento de reembolsos

---

## Como Gerar Link de Pagamento

### Passo 1: Acessar a Lista de Participantes

1. Entre no painel admin
2. Navegue até **Eventos** > Selecione o evento > **Participantes**
3. Localize o participante que precisa pagar

### Passo 2: Gerar o Link

1. Na linha do participante, clique no ícone de **cartão de crédito** 💳
2. O sistema irá:
   - Gerar um link único de pagamento
   - Copiar o link para sua área de transferência
   - Abrir o WhatsApp com uma mensagem pré-pronta
   - Enviar um email para o participante com o link

### Passo 3: Enviar via WhatsApp

Após clicar no botão:

1. O WhatsApp abrirá automaticamente
2. A mensagem já estará preenchida com:
   - Saudação personalizada
   - Nome do evento
   - Link de pagamento
   - Opções de pagamento (Pix e Cartão)
   - Data de expiração (7 dias)

**Exemplo de mensagem:**
```
Olá! Aqui está o link para pagamento do evento Workshop de Dança:

https://positiv.com.br/payment/abc123xyz

O link expira em 01/12/2024 às 15:30. Escolha entre Pix (R$ 220) ou
Cartão de Crédito em até 21x (R$ 227).
```

3. Revise a mensagem (opcional)
4. Clique em **Enviar**

### Quando o botão NÃO aparece?

O botão de gerar link só aparece quando:
- ✅ O participante é do tipo **Regular** (não social ou staff)
- ✅ O participante ainda **não pagou**

**Participantes sociais e staff** não precisam de link de pagamento (vagas gratuitas).

---

## Como Verificar Status de Pagamento

### Na Tabela de Participantes

A coluna **Pagamento** mostra o status atual:

| Badge | Significado |
|-------|-------------|
| 🟦 **Gratuito** | Vaga social ou staff (não precisa pagar) |
| 🟨 **Pendente** | Link gerado mas pagamento ainda não confirmado |
| 🟩 **Pago** | Pagamento confirmado com sucesso |

### Detalhes do Pagamento

Para ver mais informações sobre um pagamento:

1. Clique na linha do participante para abrir os detalhes
2. Role até a seção **Pagamento**
3. Você verá:
   - Método de pagamento (Pix ou Cartão)
   - Valor pago
   - Número de parcelas (se aplicável)
   - Data e hora da confirmação
   - ID da transação (para rastreamento)

---

## Fluxo Completo do Pagamento

### 1. Link Gerado ✉️
- Admin clica em "Gerar Link de Pagamento"
- Sistema cria link único com validade de 7 dias
- Email é enviado automaticamente para o participante
- Link é copiado para área de transferência do admin
- WhatsApp abre com mensagem pré-pronta

### 2. Participante Acessa o Link 🔗
- Participante clica no link (por email ou WhatsApp)
- Vê página com as duas opções:
  - **Pix**: R$ 220 (pagamento instantâneo)
  - **Cartão**: R$ 227 (parcelamento em até 21x)

### 3. Participante Escolhe e Paga 💳
- Seleciona método de pagamento
- É redirecionado para página segura da Asaas
- Completa o pagamento

### 4. Confirmação Automática ✅
- Sistema recebe confirmação da Asaas
- Status do participante é atualizado automaticamente
- Participante recebe email de confirmação
- Admin vê badge "Pago" na tabela

**Tempo de confirmação:**
- **Pix**: Instantâneo (segundos)
- **Cartão**: 1-2 minutos após aprovação

---

## Como Processar Reembolsos

### Quando Reembolsar?

Reembolsos são apropriados em casos de:
- Cancelamento por motivo de força maior
- Desistência do participante com antecedência
- Erro no pagamento (valor duplicado, etc.)
- Transferência de vaga

### Passo a Passo

1. **Abra os detalhes do participante**
   - Navegue até Eventos > Evento > Participantes
   - Clique no participante que será reembolsado

2. **Clique em "Reembolsar"**
   - Botão vermelho no canto superior direito
   - Disponível apenas para participantes com status "Pago"

3. **Preencha o motivo**
   - Uma janela aparecerá solicitando o motivo do reembolso
   - Exemplo: "Desistência com 30 dias de antecedência"
   - Este motivo fica registrado no sistema

4. **Confirme o reembolso**
   - Clique em "Confirmar Reembolso"
   - O sistema processará o reembolso na Asaas
   - Status do participante volta para "Pendente"

### O que acontece após o reembolso?

- ✅ Valor é devolvido para conta/cartão do participante
- ✅ Status do pagamento é atualizado no sistema
- ✅ Histórico do reembolso fica registrado
- ✅ Asaas envia email de confirmação do reembolso ao participante

### Prazos de Reembolso

| Método Original | Prazo de Reembolso |
|-----------------|-------------------|
| **Pix** | Até 1 dia útil |
| **Cartão à vista** | 5-10 dias úteis |
| **Cartão parcelado** | Cancelamento da fatura (se não processada) ou 5-10 dias úteis |

**Importante:** Prazos são gerenciados pela Asaas e instituições financeiras. A Positiv não controla o tempo de processamento.

---

## Perguntas Frequentes

### 1. O link de pagamento expira?
**Sim, após 7 dias.** Se o participante não pagar dentro deste prazo, você precisará gerar um novo link.

### 2. Posso gerar um novo link se o anterior expirou?
**Sim.** Basta clicar novamente no botão de gerar link. O link antigo será automaticamente invalidado.

### 3. O participante recebe email?
**Sim, sempre.** São 3 emails automáticos:
- Email com link de pagamento (quando gerado)
- Email de confirmação (quando pagamento é aprovado)
- Email de falha (se pagamento for recusado ou expirar)

### 4. Posso ver quem ainda não pagou?
**Sim.** Filtre a tabela pela coluna "Pagamento" > Status "Pendente".

### 5. Como sei se o pagamento foi com Pix ou Cartão?
Abra os detalhes do participante e veja a seção "Pagamento". O método usado estará especificado.

### 6. Participante pagou mas ainda aparece como "Pendente"?
**Aguarde 2-3 minutos.** O sistema recebe confirmação automática da Asaas, mas pode haver um pequeno delay. Se após 5 minutos ainda não atualizar, verifique:
- Se o pagamento foi aprovado no Asaas
- Se há erros nos logs do sistema
- Contate o suporte técnico

### 7. Posso fazer reembolso parcial?
**Não na versão atual.** Reembolsos são sempre do valor total. Para casos especiais, entre em contato com o time técnico.

### 8. Qual a diferença de preço entre Pix e Cartão?
- **Pix**: R$ 220 (preço base do evento)
- **Cartão**: R$ 227 (R$ 7 a mais para cobrir taxas de processamento)

### 9. Quantas parcelas são permitidas?
**Até 21x sem juros** no cartão de crédito. O participante escolhe o número de parcelas na página de pagamento da Asaas.

### 10. Posso cancelar um link gerado?
**Não diretamente.** Mas você pode:
- Aguardar 7 dias para o link expirar automaticamente
- Ou gerar um novo link (isso invalida o anterior)

---

## Troubleshooting (Resolução de Problemas)

### Problema: Botão "Gerar Link" não aparece

**Causas possíveis:**
1. Participante já tem pagamento confirmado
2. Participante é social ou staff (vaga gratuita)
3. Sistema de pagamento está desabilitado (ENABLE_PAYMENT_SYSTEM=false)

**Solução:**
- Verifique o tipo de vaga na coluna "Tipo"
- Verifique o status na coluna "Pagamento"
- Se o problema persistir, contate o suporte técnico

---

### Problema: WhatsApp não abre automaticamente

**Causas possíveis:**
1. Participante não tem telefone cadastrado
2. Número de telefone está em formato inválido
3. Bloqueador de popup no navegador

**Solução:**
1. Verifique se o campo "Telefone" está preenchido
2. Formato esperado: (11) 98765-4321 ou 11987654321
3. Permita popups para o domínio positiv.com.br no seu navegador
4. O link já está copiado - você pode colar manualmente no WhatsApp

---

### Problema: Email de pagamento não foi recebido

**Causas possíveis:**
1. Email está na caixa de spam
2. Email cadastrado está incorreto
3. Limite de envio da AWS SES atingido (raro)

**Solução:**
1. Peça ao participante verificar a pasta de spam/lixo eletrônico
2. Verifique se o email cadastrado está correto
3. Gere um novo link - um novo email será enviado
4. Como alternativa, envie o link copiado via WhatsApp

---

### Problema: Pagamento foi feito mas status não atualizou

**Causas possíveis:**
1. Pagamento ainda está sendo processado (normal para cartão)
2. Webhook da Asaas falhou
3. Participante usou link errado/expirado

**Solução:**
1. **Cartão**: Aguarde 2-3 minutos e recarregue a página
2. **Pix**: Deve ser instantâneo. Se não atualizar em 1 minuto, há um problema
3. Verifique no painel da Asaas se o pagamento foi confirmado lá
4. Contate o suporte técnico com o ID da transação

---

### Problema: Erro ao processar reembolso

**Causas possíveis:**
1. Pagamento ainda não foi confirmado pela operadora
2. Reembolso já foi processado anteriormente
3. Problema de comunicação com API da Asaas

**Solução:**
1. Aguarde 24h após o pagamento antes de reembolsar
2. Verifique se o status do pagamento é realmente "Confirmado"
3. Tente novamente após alguns minutos
4. Se persistir, registre o caso e processe o reembolso manualmente na Asaas

---

### Problema: Link expirou e preciso gerar um novo

**Isso não é um problema!** É o comportamento esperado.

**Solução:**
1. Clique novamente em "Gerar Link de Pagamento"
2. Um novo link será criado com validade de mais 7 dias
3. O link antigo é automaticamente invalidado
4. Envie o novo link para o participante

---

## Boas Práticas

### ✅ Faça

1. **Gere o link próximo à data do evento** (não muito antecipado)
2. **Acompanhe os pagamentos pendentes regularmente**
3. **Envie lembretes 2-3 dias antes da expiração do link**
4. **Documente o motivo de reembolsos** (para histórico)
5. **Verifique o número de telefone antes de gerar link**

### ❌ Evite

1. **Gerar múltiplos links para o mesmo participante** (confunde o sistema)
2. **Processar reembolso antes de 24h do pagamento** (pode dar erro)
3. **Ignorar emails de falha** (participante pode não saber que pagamento falhou)
4. **Reembolsar sem documentar o motivo** (perde rastreabilidade)
5. **Forçar participantes a pagar via transferência manual** (sempre use o sistema)

---

## Dicas de Produtividade

### Gerar Links em Lote
1. Abra a lista de participantes
2. Filtre por Status "Pendente"
3. Gere links um por um (futuras versões terão geração em massa)
4. Use as abas do WhatsApp para enviar múltiplas mensagens rapidamente

### Acompanhamento de Pagamentos
1. Use filtros da tabela para ver apenas participantes pendentes
2. Configure um lembrete 2 dias antes do evento para checar pagamentos
3. Mantenha contato com participantes que não pagaram

### Organização
1. Sempre documente motivos de reembolso
2. Use a coluna de "Notas" para observações sobre pagamentos especiais
3. Exporte a lista de participantes com status de pagamento para relatórios

---

## Suporte Técnico

### Quando Contatar o Suporte?

Entre em contato se:
- ❌ Sistema não está gerando links
- ❌ Webhooks não estão atualizando status (após 5 minutos)
- ❌ Reembolsos estão falhando sistematicamente
- ❌ Emails não estão sendo enviados
- ❌ Dados de pagamento estão inconsistentes

### Informações para Fornecer

Ao reportar um problema, inclua:
1. ID do participante
2. ID do evento
3. Descrição do problema
4. Horário que o problema ocorreu
5. Print da tela (se aplicável)
6. Mensagem de erro (se houver)

---

## Glossário

| Termo | Significado |
|-------|-------------|
| **Link de Pagamento** | URL única que direciona para página de pagamento do participante |
| **Token** | Código único de 21 caracteres que identifica um link de pagamento |
| **Asaas** | Plataforma de pagamentos utilizada pela Positiv |
| **Webhook** | Sistema de notificação automática da Asaas para nosso sistema |
| **Regular** | Tipo de vaga que requer pagamento (não é social/staff) |
| **Social** | Vaga gratuita para participantes com desconto social |
| **Staff** | Vaga gratuita para organizadores e staff do evento |
| **Pix** | Sistema de pagamento instantâneo do Banco Central |
| **Parcelamento** | Divisão do pagamento em múltiplas parcelas no cartão de crédito |

---

## Checklist: Configurando Pagamentos para um Novo Evento

Antes de abrir inscrições com pagamento:

- [ ] Sistema de pagamento está habilitado (ENABLE_PAYMENT_SYSTEM=true)
- [ ] Preço do evento está configurado corretamente
- [ ] Vagas sociais/staff estão marcadas corretamente
- [ ] Credenciais da Asaas estão configuradas (produção, não sandbox)
- [ ] Webhooks da Asaas estão apontando para URL correta
- [ ] Emails de notificação estão funcionando
- [ ] Teste completo foi realizado (gerar link, pagar, confirmar)

---

**Dúvidas?** Entre em contato com o time técnico da Positiv.

*Última atualização: 24/11/2024*
