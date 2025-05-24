import type { Exercise } from './Exercise'

export interface Group {
  name: string
  id: number
  exercises?: Exercise[]
}
