import { useQuery } from '@tanstack/vue-query'

export const fetchGeo = () => {
  return fetch('https://api2.orders.exchange/api/geo').then((res) => res.json())
}
