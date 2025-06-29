import { type ColumnEditorOptions } from "primereact/column"
import {
  InputNumber,
  type InputNumberValueChangeEvent,
} from "primereact/inputnumber"

type TableInputMoneyProps = {
  value: ColumnEditorOptions["value"]
  editorCallback?: ColumnEditorOptions["editorCallback"]
}
export const TableInputMoney = ({
  value,
  editorCallback,
}: TableInputMoneyProps) => {
  return (
    <InputNumber
      value={value}
      onValueChange={(e: InputNumberValueChangeEvent) =>
        editorCallback?.(e.value)
      }
      mode="currency"
      currency="BRL"
      locale="pt-BR"
    />
  )
}
