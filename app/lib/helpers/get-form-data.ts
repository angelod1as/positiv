type GetFormData = {
  request: Request
  values: string[]
}
export const getFormData = async <T = { intent?: string }>({
  request,
  values,
}: GetFormData) => {
  const formData = await request.clone().formData()
  return values.reduce(
    (prev, curr) => {
      prev[curr] = formData.get(curr)
      return prev
    },
    {} as Record<string, unknown>,
  ) as T
}
