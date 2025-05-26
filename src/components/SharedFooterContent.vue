<script setup lang="ts">
import { computed } from 'vue'
import { VBtn, VDivider } from 'vuetify/components'
import { type Exercise } from '../types/Exercise'

// Define props
const props = defineProps({
  playerState: {
    type: String,
    required: true
  },
  isInProgressPause: {
    type: Boolean,
    default: false
  },
  exerciseInProgress: {
    type: Object as () => Exercise | null,
    default: null
  },
  nextExerciseInCurrentSet: {
    type: Object as () => Exercise | null,
    default: null
  },
  inProgressPoint: {
    type: String,
    default: '0:00'
  },
  totalSelectedExercises: {
    type: Number,
    default: 0
  },
  exerciseRepetitionCount: {
    type: Number,
    default: 0
  },
  totalExercisesDuration: {
    type: String,
    default: '0:00'
  }
})

// Define emits
const emit = defineEmits([
  'startPlayer',
  'pausePlayer',
  'countinuePlayer',
  'resetPlayer',
  'nextExercise'
])

// Methods
const resetPlayer = () => emit('resetPlayer')
// const startPlayer = () => emit('startPlayer')
const pausePlayer = () => emit('pausePlayer')
const countinuePlayer = () => emit('countinuePlayer')
// const nextExercise = () => emit('nextExercise')

function timeStringToMilliseconds(timeStr: string): number {
  const [min, sec] = timeStr.split(':').map(Number)
  return ((min || 0) * 60 + (sec || 0)) * 1000
}

// Computed properties
const isPlayerStarted = computed(() => props.playerState === 'playing')
const isPlayerPaused = computed(() => props.playerState === 'paused')

const duractionCurrentPoint = computed(() => {
  const repetitions = props.exerciseInProgress?.repetitions || 0
  const repetitionDuration = props.exerciseInProgress?.repetitionDuration || 0
  const pause = props.exerciseInProgress?.pause || 0

  if (props.isInProgressPause) {
    return pause
  }
  return repetitions * repetitionDuration
})
const percentRemaining = computed(() => {
  const total = duractionCurrentPoint.value
  const current = timeStringToMilliseconds(props.inProgressPoint)

  if (!total || total === 0) return 0

  return (current / total) * 100
})
</script>

<template>
  <div class="pb-1 w-100">
    <div v-show="isPlayerStarted || isPlayerPaused" class="pb-1">
      <div class="d-flex align-center justify-space-between mb-2">
        <div>
          <p :title="exerciseInProgress?.exerciseName">
            <span class="text-h5 text-uppercase">
              {{
                isInProgressPause && exerciseInProgress
                  ? 'Пауза'
                  : exerciseInProgress?.exerciseName
              }}
            </span>
            <strong
              ><p>
                <span>{{ exerciseRepetitionCount }}</span>
                <span>/</span>
                <span>{{ exerciseInProgress?.repetitions }}</span>
              </p></strong
            >
          </p>

          <v-divider class="my-4"></v-divider>

          <div>
            <p
              v-if="nextExerciseInCurrentSet?.id"
              class="text-h5 text-uppercase"
            >
              {{ nextExerciseInCurrentSet?.exerciseName }}
            </p>

            <p v-else class="text-h5 text-uppercase">Конец Сета</p>
          </div>
        </div>

        <div>
          <v-progress-circular
            :model-value="percentRemaining"
            :rotate="360"
            :size="80"
            :width="10"
            :color="isInProgressPause ? 'warning' : 'indigo'"
            class="ml-4 flex-shrink-0"
          >
            {{ inProgressPoint }}
          </v-progress-circular>
        </div>
      </div>

      <v-divider></v-divider>
    </div>
    <!-- <div v-if="playerState === 'idle' || playerState === 'reset'">
      <v-btn
        icon
        size="x-large"
        color="indigo"
        variant="tonal"
        density="comfortable"
        class="mx-2"
        @click="startPlayer"
      >
        <v-icon>mdi-play</v-icon>
      </v-btn>
    </div> -->
    <div class="d-flex justify-center w-full" v-if="isPlayerStarted">
      <v-btn
        icon
        color="warning"
        size="x-large"
        variant="tonal"
        density="comfortable"
        class="mx-2"
        @click="pausePlayer"
      >
        <v-icon>mdi-pause</v-icon>
      </v-btn>
      <v-btn
        icon
        color="error"
        size="x-large"
        variant="tonal"
        density="comfortable"
        class="mx-2"
        @click="resetPlayer"
      >
        <v-icon>mdi-stop</v-icon>
      </v-btn>
      <!-- <v-btn
        @click="nextExercise"
        icon
        color="indigo"
        size="x-large"
        variant="tonal"
        density="comfortable"
      >
        <v-icon>mdi-skip-next</v-icon>
      </v-btn> -->
    </div>
    <div v-if="isPlayerPaused">
      <v-btn
        icon
        color="indigo"
        size="x-large"
        variant="tonal"
        density="comfortable"
        class="mx-2"
        @click="countinuePlayer"
      >
        <v-icon>mdi-play</v-icon>
      </v-btn>
      <v-btn
        icon
        color="error"
        size="x-large"
        variant="tonal"
        density="comfortable"
        class="mx-2"
        @click="resetPlayer"
      >
        <v-icon>mdi-stop</v-icon>
      </v-btn>
    </div>
  </div>
  <div class="w-100"><v-divider></v-divider></div>
  <div class="pt-2 text-caption w-100 d-flex justify-space-between">
    <p>Всего упражнений: {{ totalSelectedExercises }}</p>
    <v-divider vertical class="mx-1"></v-divider>
    <p>Общее время тренировки: {{ totalExercisesDuration }}</p>
  </div>
</template>
