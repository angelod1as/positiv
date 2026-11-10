const FORM_MEDIA_TYPES = [
  "application/x-www-form-urlencoded",
  "multipart/form-data",
]

// request.formData() throws a TypeError on any other body, which would reach
// handleError as a 500 and an alert. A body that is not a form is the client's
// mistake, so it is answered as one.
export async function readFormData(request: Request): Promise<FormData> {
  const mediaType = request.headers
    .get("Content-Type")
    ?.split(";")[0]
    .trim()
    .toLowerCase()

  if (!mediaType || !FORM_MEDIA_TYPES.includes(mediaType)) {
    throw new Response(null, { status: 415 })
  }

  try {
    return await request.formData()
  } catch {
    throw new Response(null, { status: 400 })
  }
}
