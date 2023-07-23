export const raise = (err: string): never => {
  throw new Error(err)
}
