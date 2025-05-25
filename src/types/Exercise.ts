export interface Exercise {
  id: number
  exerciseName: string
  repetitionsPerSet: number[]
  repetitionDuration: number
  sets: number
  completedSets: number
  pause: number
  countdownBeforeStart: number
  gifUrl: string
  backgroundMelodyLink: string
  audioQuantityExercise: boolean
  audioStart: boolean
  audioMiddle: boolean
  audioBeforeEnd: boolean
  audioEnd: boolean
  announcePauseDuration: boolean
  announceCountdown: boolean
  announcePauseEnd: boolean
  selectedForPlayer: boolean
  repetitions?: number
  group: {
    id: number
    name: string
  }
}
