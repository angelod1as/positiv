export const HiddenInput = ({
  value,
  name,
}: {
  name: string
  value: unknown
}) => {
  const stringValue = JSON.stringify(value)
  return (
    <input name={name} hidden value={stringValue} defaultValue={stringValue} />
  )
}
