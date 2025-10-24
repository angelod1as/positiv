import type { ReactNode } from "react"

export const PROFILE_REQUIREMENTS = {
  requiredFields: ["race_color"] as string[],
  targetPath: "/conta/dados-basicos",
  message: (
    <div>
      <p>Precisamos que você atualize seus dados básicos.</p>
      <p className="mt-2">
        Estamos solicitando informações sobre raça ou cor para melhorar nossos
        dados demográficos.
      </p>
    </div>
  ) as ReactNode,
  exemptPaths: [
    "/",
    "/entrar",
    "/entrar/esqueci",
    "/registrar",
    "/registrar/callback",
    "/registrar/confirm",
    "/conta",
    "/conta/mudar-senha",
    "/conta/termos-e-condicoes",
    "/conta/dados-basicos",
    "/conta/dados-basicos-cont",
  ] as string[],
}

export const isExemptPath = (path: string): boolean => {
  return PROFILE_REQUIREMENTS.exemptPaths.includes(path)
}