export const formatTimeAgo = (timestamp: number | null): string => {
  if (!timestamp) {
    return "Nenhuma alteração salva ainda."
  }

  const now = Date.now()
  const seconds = Math.floor((now - timestamp) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(seconds / 3600)
  const days = Math.floor(seconds / 86400)

  if (seconds < 5) {
    return "Salvo com sucesso!"
  } else if (seconds < 60) {
    return `Salvo há ${seconds} segundo${seconds === 1 ? "" : "s"} atrás.`
  } else if (minutes < 60) {
    return `Salvo há ${minutes} minuto${minutes === 1 ? "" : "s"} atrás.`
  } else if (hours < 24) {
    return `Salvo há ${hours} hora${hours === 1 ? "" : "s"} atrás.`
  } else {
    return `Salvo há ${days} dia${days === 1 ? "" : "s"} atrás.`
  }
}
