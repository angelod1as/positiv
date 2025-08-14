import { redirectWithToast } from "remix-toast"

export type SafeExecuteResult<T> = 
  | { success: true; data: T }
  | { success: false; error: Error | unknown }

export async function safeExecute<T>(
  fn: () => Promise<T>
): Promise<SafeExecuteResult<T>> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    return { success: false, error }
  }
}

export async function withErrorRedirect<T>(
  fn: () => Promise<T>,
  options: {
    redirectPath: string
    successMessage?: string | ((data: T) => string)
    errorMessage?: string
  }
): Promise<Response> {
  try {
    const result = await fn()
    
    const message = typeof options.successMessage === 'function' 
      ? options.successMessage(result)
      : options.successMessage || "Operation completed successfully"
    
    throw await redirectWithToast(
      options.redirectPath,
      { message, type: "success" }
    )
  } catch (error) {
    if (error instanceof Response) {
      throw error // Re-throw redirect responses
    }
    
    const message = options.errorMessage || "An error occurred"
    throw await redirectWithToast(
      options.redirectPath,
      { message, type: "error" }
    )
  }
}

export function handleApiError(error: unknown): Response {
  console.error("API Error:", error)
  
  if (error instanceof Response) {
    return error
  }
  
  const message = error instanceof Error 
    ? error.message 
    : "Unknown error occurred"
  
  return Response.json(
    { 
      error: message,
      success: false,
    },
    { status: 500 }
  )
}