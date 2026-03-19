# Payment System Flow Diagram

## Overview

```mermaid
graph TB
    subgraph "Sources of Truth"
        PR[(payment_requests)]
    end

    subgraph "External"
        ASAAS[Asaas API]
        EMAIL[AWS SES Email]
    end

    subgraph "Admin Actions"
        A1[Change status to<br/>sent_payment_data]
        A2[Resend payment link]
        A3[Mark manual as paid]
        A4[Update manual amount]
        A5[Refund automatic]
        A6[Mark manual as refunded]
    end

    subgraph "Participant Actions"
        P1[Open payment page]
        P2[Select payment method]
        P3[Pay on Asaas]
    end

    subgraph "Webhook Events"
        W1[PAYMENT_RECEIVED]
        W2[PAYMENT_CONFIRMED]
        W3[PAYMENT_OVERDUE]
    end

    A1 -->|creates row| PR
    A2 -->|updates amount| PR
    A3 -->|status → paid| PR
    A4 -->|updates amount| PR
    A5 -->|status → refunded| PR
    A6 -->|status → refunded| PR

    A1 -->|if automatic| EMAIL
    A2 -->|always| EMAIL
    A5 -->|refund call| ASAAS

    P2 -->|creates customer + payment| ASAAS
    P2 -->|status → awaiting_payment| PR

    W1 -->|status → paid| PR
    W2 -->|status → paid| PR
    W3 -->|status → expired| PR
```

---

## Admin Flow: Triggering a Payment

```mermaid
flowchart TD
    START([Admin opens participant detail])
    MODE{Tipo de Pagamento<br/>dropdown}
    CUSTOM{Valor customizado<br/>checked?}
    STATUS[Change application_status<br/>to sent_payment_data]

    MODE -->|Automático| CUSTOM
    MODE -->|Manual| CUSTOM
    CUSTOM -->|Yes| AMOUNT[Enter custom amount]
    CUSTOM -->|No| STATUS
    AMOUNT --> STATUS

    STATUS --> CREATE_PR[createPaymentRequest]

    CREATE_PR --> IS_AUTO{payment_mode?}

    IS_AUTO -->|automatic| CHECK_CPF{Profile has CPF?}
    IS_AUTO -->|manual| MANUAL_DONE[PR created with<br/>status: pending<br/>mode: manual]

    CHECK_CPF -->|No| ERROR_CPF[Error toast:<br/>CPF required]
    CHECK_CPF -->|Yes| SEND_EMAIL[sendPaymentLinkEmail]

    SEND_EMAIL -->|success| AUTO_DONE[PR created with<br/>status: pending<br/>mode: automatic<br/>Email sent]
    SEND_EMAIL -->|failure| EMAIL_FAIL[Error toast:<br/>Status saved but<br/>email failed]

    MANUAL_DONE --> ADMIN_MANUAL_CONTROLS
    AUTO_DONE --> ADMIN_AUTO_CONTROLS

    subgraph ADMIN_MANUAL_CONTROLS[Manual Payment Controls]
        M1[Edit amount + Save]
        M2[Marcar como pago]
        M3[Marcar como reembolsado]
    end

    subgraph ADMIN_AUTO_CONTROLS[Automatic Payment Controls]
        R1[Reenviar link]
        R2[Reembolsar via Asaas]
    end

    style ERROR_CPF fill:#f66
    style EMAIL_FAIL fill:#f96
    style MANUAL_DONE fill:#9f9
    style AUTO_DONE fill:#9f9
```

---

## Participant Flow: Paying

```mermaid
flowchart TD
    EMAIL_LINK([Participant receives email<br/>with payment link])
    OPEN[Opens /pagamento/:eventParticipantId]

    EMAIL_LINK --> OPEN

    OPEN --> AUTH{Logged in?}
    AUTH -->|No| LOGIN[Redirect to login]
    AUTH -->|Yes| OWNER{Owns this<br/>participant?}
    OWNER -->|No| DENIED[Redirect home:<br/>Sem permissão]
    OWNER -->|Yes| CHECK_PR{Active payment<br/>request?}

    CHECK_PR -->|None found| EXPIRED_PAGE[Show: Link expirado]
    CHECK_PR -->|status = paid| PAID_PAGE[Show: Pagamento<br/>já realizado]
    CHECK_PR -->|active| SHOW_OPTIONS[Show payment options:<br/>PIX, CC 1x, 2x, 3x, 4x]

    SHOW_OPTIONS --> SELECT[Participant selects<br/>payment method]
    SELECT --> CONFIRM[confirmPaymentChoice]

    CONFIRM --> ASAAS_CUSTOMER[createAsaasCustomer<br/>name, CPF, email, phone]
    ASAAS_CUSTOMER --> ASAAS_PAYMENT[createAsaasPayment<br/>billingType, value, dueDate]
    ASAAS_PAYMENT --> UPDATE_PR[Update payment_request:<br/>status → awaiting_payment<br/>asaas_payment_id<br/>invoice_url]
    UPDATE_PR --> REDIRECT[Redirect to<br/>Asaas invoice URL]

    REDIRECT --> ASAAS_PAGE([Participant pays<br/>on Asaas hosted page])

    ASAAS_PAGE -->|PIX| PIX_PAYS[Scans QR code /<br/>copies code]
    ASAAS_PAGE -->|CC| CC_PAYS[Enters card details]

    PIX_PAYS --> WEBHOOK_RECEIVED[Webhook: PAYMENT_RECEIVED]
    CC_PAYS --> WEBHOOK_CONFIRMED[Webhook: PAYMENT_CONFIRMED]

    style DENIED fill:#f66
    style EXPIRED_PAGE fill:#f96
    style PAID_PAGE fill:#9f9
    style REDIRECT fill:#69f
```

---

## Webhook Flow

```mermaid
flowchart TD
    WEBHOOK([Asaas sends POST<br/>/api/asaas-webhook])

    WEBHOOK --> SYS_CHECK{Payment system<br/>online?}
    SYS_CHECK -->|No| R404[Return 404]

    SYS_CHECK -->|Yes| TOKEN{Token valid?}
    TOKEN -->|No| R401[Return 401]
    TOKEN -->|No token configured| SKIP_AUTH[Skip auth check<br/>⚠️ Dev only]

    TOKEN -->|Yes| PARSE[Parse body]
    SKIP_AUTH --> PARSE

    PARSE -->|Invalid JSON| R400_BODY[Return 400:<br/>Invalid JSON body]
    PARSE -->|No payment.id| R400_ID[Return 400:<br/>Missing payment.id]

    PARSE -->|Valid| LOOKUP[Find payment_request<br/>by asaas_payment_id]

    LOOKUP -->|Not found| R200_WARN[Return 200:<br/>No payment_request found<br/>⚠️ Log warning]

    LOOKUP -->|Found| EVENT{Webhook event?}

    EVENT -->|PAYMENT_RECEIVED<br/>PAYMENT_CONFIRMED| PAID_CHECK{Already paid?}
    PAID_CHECK -->|Yes| R200_SKIP[Return 200:<br/>skipped: already_paid]
    PAID_CHECK -->|No| MARK_PAID[Update payment_request:<br/>status → paid<br/>paid_at → now]
    MARK_PAID --> R200_PAID[Return 200:<br/>action: marked_paid]

    EVENT -->|PAYMENT_OVERDUE| MARK_EXPIRED[Update payment_request:<br/>status → expired]
    MARK_EXPIRED --> R200_EXP[Return 200:<br/>action: marked_expired]

    EVENT -->|Other| R200_UNHANDLED[Return 200:<br/>action: unhandled_event]

    style R404 fill:#f66
    style R401 fill:#f66
    style R400_BODY fill:#f96
    style R400_ID fill:#f96
    style R200_WARN fill:#ff9
    style R200_SKIP fill:#9f9
    style R200_PAID fill:#9f9
    style R200_EXP fill:#f96
```

---

## Payment Request Status Transitions

```mermaid
stateDiagram-v2
    [*] --> pending: createPaymentRequest

    pending --> awaiting_payment: confirmPaymentChoice<br/>(user selects method)
    pending --> paid: markManualPaymentPaid<br/>(admin manual)
    pending --> expired: PAYMENT_OVERDUE webhook<br/>OR expires_at passed

    awaiting_payment --> paid: PAYMENT_RECEIVED<br/>PAYMENT_CONFIRMED webhook
    awaiting_payment --> expired: PAYMENT_OVERDUE webhook

    paid --> refunded: processRefund (Asaas)<br/>markManualPaymentRefunded

    expired --> [*]: Dead end<br/>(admin must create new)
    refunded --> [*]: Dead end
    cancelled --> [*]: Dead end
```

---

## Data Table Flow (Spreadsheet View)

```mermaid
flowchart TD
    TABLE([Admin views event<br/>participants table])
    TABLE --> COLS[Columns show:<br/>Status Pgto / Valor Pgto / Modo Pgto<br/>from payment_requests subquery]

    TABLE --> CHANGE_STATUS{Admin changes<br/>application_status<br/>in table cell?}

    CHANGE_STATUS -->|sent_payment_data| TRIGGER[handlePaymentStatusChange<br/>via view-event-page action]
    TRIGGER --> SAME_FLOW[Same flow as<br/>participant detail page]

    SAME_FLOW --> TOAST_SUCCESS[Toast: Link de pagamento<br/>enviado com sucesso]
    SAME_FLOW --> TOAST_ERROR[Toast: Erro ao enviar<br/>link de pagamento]

    TABLE --> FILTER[Filter by Status Pgto:<br/>Pendente / Aguardando /<br/>Pago / Expirado /<br/>Reembolsado / Cancelado]
```

---

## Payment Modes Comparison

| Feature | Automatic (Asaas) | Manual |
|---------|-------------------|--------|
| **Triggered by** | Admin + PAYMENT_SYSTEM_ONLINE=true | Admin chooses Manual OR PAYMENT_SYSTEM_ONLINE=false |
| **Email sent** | Yes (with payment link) | No |
| **Payment page** | Participant uses it | Not used |
| **Asaas integration** | Customer + Payment created | None |
| **Webhook updates** | Yes (PAYMENT_RECEIVED, etc.) | No |
| **Admin can edit amount** | No (Asaas manages) | Yes |
| **Admin marks paid** | No (webhook does it) | Yes (button) |
| **Admin refund** | Via Asaas API | Manual status change |
| **CPF required** | Yes | No |

---

## Known Limitations

1. **Custom amount only works from participant detail page** — the data table view doesn't have a custom amount input, so changing status to sent_payment_data from the table always uses event's ticket_price.
