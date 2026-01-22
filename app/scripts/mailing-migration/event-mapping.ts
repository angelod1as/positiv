export const EVENT_COLUMN_TO_ID: Record<string, string> = {
  "04/02/23": "d953e0d3-7a5e-4ff3-a161-0b855cf4c164",
  "01/07/23": "6dfbb35c-6e2a-4bf7-a995-578e0e6dc82f",
  "26/08/23": "31fd751e-0696-45d7-8811-c3572ff2e33e",
  "11/11/23": "24b052cb-8e05-4fbc-9195-ef498b03d9d2",
  "27/01/24": "d62174a2-2b23-442b-b43a-9d9d709eea8f",
  "Sáfica (24/02/24)": "19096473-a786-4d29-acf8-11276ed86495",
  "Águas de março (16/03/24)": "1b3a5cdb-cffe-4242-9f2c-de49fb6c2fb7",
  "Amarradona (18/05/24)": "3da9caf4-fd08-4192-9d66-fc636342ae83",
  "Julina (20/07/24)": "0b7ef0a3-200d-42a1-b8e6-7ae11dd65c41",
  "Fim de ânus": "a6912346-dbd0-480a-b05b-e51c85375bef",
  "Renovadah": "e88c71c3-2431-4e1e-ac42-6ae94e89c744",
  "Carnavrau": "c08ad562-8559-429f-b5cb-8aae0972707b",
  "Segurando Velas 19/04/25": "ad7994c6-2ba3-4024-9b4c-9f06d66cce04",
  "Rapa do Tacho": "d14286cb-ac70-4caf-83c1-191d59f75a55",
  "MaiOral 17/05/25": "8415cfbe-c916-4b7a-bf48-abfb3a219f64",
  "Corpus peladus": "b4ab77d5-ef4d-4cdd-a3af-79c2cfe31274",
}

export function mapEventsToIds(
  events: Record<string, boolean | null>,
): Record<string, boolean | null> {
  const mapped: Record<string, boolean | null> = {}
  for (const [column, attended] of Object.entries(events)) {
    const eventId = EVENT_COLUMN_TO_ID[column]
    if (eventId) {
      mapped[eventId] = attended
    }
  }
  return mapped
}
