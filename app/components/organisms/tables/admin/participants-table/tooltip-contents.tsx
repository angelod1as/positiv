import { participantApplicationStatusPropMap } from "~/lib/helpers/propMaps"

export const generalTooltipContent = (
  <p>Total de todas as inscrições registradas para este evento, independente de status.</p>
)

export const acceptedInProcessTooltipContent = (
  <div className="space-y-2">
    <p>Pessoas que atendem simultaneamente aos seguintes critérios:</p>

    <div>
      <p className="font-semibold">Status de Processo (application_status):</p>
      <ul className="list-disc list-inside pl-2">
        <li>{participantApplicationStatusPropMap("sent_payment_data")}</li>
        <li>{participantApplicationStatusPropMap("sent_rules")}</li>
        <li>{participantApplicationStatusPropMap("talking")}</li>
        <li>{participantApplicationStatusPropMap("finalised")}</li>
      </ul>
    </div>

    <div>
      <p className="font-semibold">Status de Presença (attendance_status):</p>
      <ul className="list-disc list-inside pl-2">
        <li>Compareceu</li>
        <li>Pendente</li>
      </ul>
    </div>

    <div>
      <p className="font-semibold">Status de Aprovação (approved_to_attend):</p>
      <ul className="list-disc list-inside pl-2">
        <li>Aprovade</li>
        <li>Aprovade com Ressalvas</li>
        <li>Pendente</li>
      </ul>
    </div>
  </div>
)
