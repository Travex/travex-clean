export const API_BASE_URL = "https://travex-clean.onrender.com";
export async function createTicket(routeId: string, seats: string) {
  const res = await fetch(`${API_BASE_URL}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route_id: routeId,
      seats,
    }),
  });

  const data = await res.json();
  return data;
}
