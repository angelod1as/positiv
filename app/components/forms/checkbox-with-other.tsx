import {
  forwardRef,
  useEffect,
  useState,
  type ChangeEvent,
  type Ref,
} from "react"
import { useField } from "remix-forms"

export type Option = {
  name: string
  value: string | number
}

type CheckboxWithOtherProps = {
  defaultValue?: string[]
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  error?: string
  name: string
  value?: string
  ref?: Ref<HTMLInputElement>
}

// TODO: Not working — not passing props
export const CheckboxWithOther = forwardRef<
  HTMLInputElement,
  CheckboxWithOtherProps
>(
  (
    { defaultValue = [], onChange, onBlur, error, name, value, ...props },
    ref,
  ) => {
    const { options: originalOptions } = useField()
    if (!originalOptions) {
      return null
    }

    const options = originalOptions.map(({ name, value }) => ({
      name,
      value: value.toString(),
    }))

    // Parse the value if it comes from React Hook Form
    const parsedValue = value ? JSON.parse(value) : []
    const initialValue = parsedValue.length > 0 ? parsedValue : defaultValue
    const defaultArray = Array.isArray(initialValue) ? initialValue : []

    // State for checked options (excluding Others)
    const [checkedOptions, setCheckedOptions] = useState<string[]>([])

    // State for Other checkbox and its input value
    const [otherChecked, setOtherChecked] = useState(false)
    const [otherValue, setOtherValue] = useState("")

    // Setup initial state based on defaultValue
    useEffect(() => {
      // Find which options match the defaultValue
      const matchedOptions = options
        .filter((option) => defaultArray.includes(option.value))
        .map((option) => option.value)

      // Anything left in defaultArray that doesn't match an option goes to otherValue
      const otherValues = defaultArray.filter(
        (value) => !options.some((option) => option.value === value),
      )

      setCheckedOptions(matchedOptions)

      if (otherValues.length > 0) {
        setOtherChecked(true)
        setOtherValue(otherValues.join(", "))
      } else {
        setOtherChecked(false)
        setOtherValue("")
      }
    }, [JSON.stringify(defaultArray), JSON.stringify(options)])

    // Combine all values into a single array for the form
    const combineValues = () => {
      let result = [...checkedOptions]

      if (otherChecked && otherValue.trim()) {
        // Split by comma or semicolon and trim
        const otherValues = otherValue
          .split(/[,;]/)
          .map((value) => value.trim())
          .filter((value) => value !== "")

        result = [...result, ...otherValues]
      }

      return result
    }

    // Notify React Hook Form when values change
    useEffect(() => {
      if (onChange) {
        const combinedValues = combineValues()
        const stringifiedValue = JSON.stringify(combinedValues)

        // Create a synthetic event for React Hook Form
        const event = {
          target: {
            name,
            value: stringifiedValue,
          },
        } as ChangeEvent<HTMLInputElement>

        onChange(event)
      }
    }, [checkedOptions, otherChecked, otherValue, onChange, name])

    // Handle changing a regular checkbox
    const handleOptionChange = (optionValue: string, checked: boolean) => {
      setCheckedOptions((prev) => {
        const newValues = checked
          ? [...prev, optionValue]
          : prev.filter((value) => value !== optionValue)

        return newValues
      })
    }

    // Handle changing the Other checkbox
    const handleOtherChange = (checked: boolean) => {
      setOtherChecked(checked)
      if (!checked) {
        setOtherValue("")
      }
    }

    return (
      <div>
        {/* Regular options */}
        {options.map((option) => (
          <div key={option.value}>
            <input
              type="checkbox"
              id={`${name}-${option.value}`}
              checked={checkedOptions.includes(option.value)}
              onChange={(e) =>
                handleOptionChange(option.value, e.target.checked)
              }
            />
            <label htmlFor={`${name}-${option.value}`}>{option.name}</label>
          </div>
        ))}

        {/* Others option */}
        <div>
          <input
            type="checkbox"
            id={`${name}-other`}
            checked={otherChecked}
            onChange={(e) => handleOtherChange(e.target.checked)}
          />
          <label htmlFor={`${name}-other`}>Others</label>
        </div>

        {/* Input for Others value */}
        {otherChecked && (
          <div>
            <input
              type="text"
              value={otherValue}
              onChange={(e) => setOtherValue(e.target.value)}
              placeholder="Please specify"
              required={otherChecked}
            />
          </div>
        )}

        {/* Hidden input that React Hook Form will control */}
        <input
          type="hidden"
          name={name}
          value={JSON.stringify(combineValues())}
          ref={ref}
          onBlur={onBlur}
          {...props}
        />

        {/* Error display */}
        {error && <div>{error}</div>}
      </div>
    )
  },
)

CheckboxWithOther.displayName = "CheckboxWithOther"
