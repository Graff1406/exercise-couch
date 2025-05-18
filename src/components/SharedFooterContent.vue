<script setup lang="ts">
import { computed } from 'vue'
import { VBtn, VDivider } from 'vuetify/components'

interface Exercise {
  id: number
  exerciseName: string
  repetitions: number
  repetitionDuration: number
  sets: number
  completedSets: number
  pause: number
  countdownBeforeStart: number
  gifUrl: string
  backgroundMelodyLink: string
  audioStart: boolean
  audioEnd: boolean
  announcePauseDuration: boolean
  announceCountdown: boolean
  announcePauseEnd: boolean
  selectedForPlayer: boolean
}

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
  inProgressPoint: {
    type: String,
    default: '0:00'
  },
  totalSelectedExercises: {
    type: Number,
    default: 0
  },
  totalExercisesDuration: {
    type: String,
    default: '0:00'
  },
  isStartButtonDisabled: {
    type: Boolean,
    default: true
  }
})

// Define emits
const emit = defineEmits([
  'startPlayer',
  'pausePlayer',
  'countinuePlayer',
  'resetPlayer'
])

// Computed properties
const isPlayerStarted = computed(() => props.playerState === 'playing')
const isPlayerPaused = computed(() => props.playerState === 'paused')

// Methods
const startPlayer = () => emit('startPlayer')
const pausePlayer = () => emit('pausePlayer')
const countinuePlayer = () => emit('countinuePlayer')
const resetPlayer = () => emit('resetPlayer')
</script>

<template>
  <div class="pb-1 w-100">
    <div v-show="isPlayerStarted || isPlayerPaused" class="pb-2">
      <div class="d-flex justify-space-between align-center">
        <p class="text-h5 mb-2 d-flex justify-space-between align-center gap-2">
          <span>{{
            isInProgressPause && exerciseInProgress
              ? 'Пауза'
              : exerciseInProgress?.exerciseName
          }}</span>
        </p>

        <p class="text-h5">{{ inProgressPoint }}</p>
      </div>

      <v-divider></v-divider>
    </div>
    <div v-if="playerState === 'idle' || playerState === 'reset'">
      <v-btn
        icon
        large
        color="indigo"
        variant="plain"
        density="comfortable"
        class="mx-2"
        @click="startPlayer"
        :disabled="isStartButtonDisabled"
      >
        <v-icon>mdi-play</v-icon>
      </v-btn>
    </div>
    <div v-if="isPlayerStarted">
      <v-btn
        icon
        large
        variant="plain"
        density="comfortable"
        class="mx-2"
        @click="pausePlayer"
      >
        <v-icon>mdi-pause</v-icon>
      </v-btn>
      <v-btn
        icon
        large
        variant="plain"
        density="comfortable"
        class="mx-2"
        @click="resetPlayer"
      >
        <v-icon>mdi-stop</v-icon>
      </v-btn>
    </div>
    <div v-if="isPlayerPaused">
      <v-btn
        icon
        large
        variant="plain"
        density="comfortable"
        class="mx-2"
        @click="countinuePlayer"
      >
        <v-icon>mdi-play</v-icon>
      </v-btn>
      <v-btn
        icon
        large
        variant="plain"
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
