<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  VCard,
  VCardText,
  VCardTitle,
  VCol,
  VBtn,
  VMenu,
  VList,
  VListItem
} from 'vuetify/components'
import draggable from 'vuedraggable'

import ExerciseForm from './components/ExerciseForm.vue'
import SharedFooterContent from './components/SharedFooterContent.vue'

import { type Exercise } from './types/Exercise'
import { type PlayerState } from './types/PlayerState'
import { type Group } from './types/Group'

const backgroundAudio = ref<HTMLAudioElement | null>(null)

const showForm = ref(false)
const exercises = ref<Exercise[]>([])
const isInProgressPause = ref(false)
const isInProgressExercise = ref(false)
const isTrainingStarted = ref(false)

const playerState = ref<PlayerState>('idle')
const editMode = ref(false)
const exerciseInProgress = ref<Exercise | null>(null)
const nextExerciseInCurrentSet = ref<Exercise | null>(null)
const editExercise = ref<Exercise | null>(null)
const countdown = ref(0)
const currentIndex = ref(0)
const exerciseRepetitionCount = ref(0)
const countdownInterval = ref<ReturnType<typeof setInterval> | null>(null)
const selectedExercises = ref<Exercise[]>([])

const utterance = new SpeechSynthesisUtterance()

const loadExercises = () => {
  const storedExercises = localStorage.getItem('exercises')
  exercises.value = storedExercises ? JSON.parse(storedExercises) : []
}

const speak = (text: string, { rate = 1 } = { rate: 1 }): Promise<void> => {
  return new Promise((resolve) => {
    utterance.rate = rate
    utterance.text = text
    utterance.onend = () => resolve()
    speechSynthesis.speak(utterance)
  })
}

const calculateSpeechRate = (exerciseSpeed: number): number => {
  // Нормализуем к диапазону 500-3000 мс (0.5-3 сек)
  const minSpeed = 500
  const maxSpeed = 3000

  // Ограничиваем входное значение
  const speed = Math.max(minSpeed, Math.min(maxSpeed, exerciseSpeed))

  // Формула обратной зависимости (чем быстрее упражнение, тем быстрее речь)
  const normalized = (speed - minSpeed) / (maxSpeed - minSpeed) // 0-1
  const rate = 2.5 - normalized * 2 // 2.5 → 0.5

  // Округляем до десятых и возвращаем
  return Math.round(rate * 10) / 10
}

const startCountRepetition = (interval: number = 1000, repetitions: number) => {
  let count = 0
  let countRepetitionInterval: ReturnType<typeof setInterval> | null = null

  return {
    counter: (callbackProcessing?: (count: number) => void) => {
      return new Promise((resolve) => {
        count++
        if (callbackProcessing) callbackProcessing(count)

        countRepetitionInterval = setInterval(() => {
          count++
          if (count <= repetitions) {
            if (callbackProcessing) callbackProcessing(count)
          } else {
            clearInterval(countRepetitionInterval!)
            countRepetitionInterval = null
            resolve(true)
          }
        }, interval)
      })
    }
  }
}

const pauseCountRepetition = (
  duration: number,
  callback?: (timeLeft: number) => void
): Promise<void> => {
  return new Promise((resolve) => {
    let timeLeft = duration

    const intervalId = setInterval(() => {
      if (callback) callback(timeLeft)
      timeLeft--

      if (timeLeft < 0) {
        clearInterval(intervalId)
        resolve()
      }
    }, 1000)
  })
}

const toggleForm = () => {
  showForm.value = !showForm.value
}
const closeForm = () => {
  showForm.value = false
  editMode.value = false
  editExercise.value = null
}

const startCountdown = (
  time: number,
  callbackProcessing?: (countdown: number) => void,
  interval: number = 1000
) => {
  let countdown = time / 1000

  return new Promise((resolve) => {
    if (callbackProcessing) callbackProcessing(countdown) // вызов сразу

    countdownInterval.value = setInterval(() => {
      countdown -= 1
      if (countdown >= 0) {
        if (callbackProcessing) callbackProcessing(countdown)
      } else {
        clearInterval(countdownInterval.value!)
        countdownInterval.value = null
        resolve(true)
      }
    }, interval)
  })
}

const pauseCountdown = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
}

const resetCountdown = () => {
  pauseCountdown()
  countdown.value = 0
}

const startPlayer = (exercises: Exercise[]) => {
  playerState.value = 'playing'
  isTrainingStarted.value = true
  selectedExercises.value = exercises
  runExercises()
}

const countinuePlayer = () => {
  playerState.value = 'playing'

  if (backgroundAudio.value) backgroundAudio.value.play()
  speechSynthesis.resume()
}

const pausePlayer = () => {
  playerState.value = 'paused'
  // Pause background audio
  if (backgroundAudio.value) {
    backgroundAudio.value.pause()
    speechSynthesis.pause()
  }
  pauseCountdown()
}

const resetPlayer = () => {
  playerState.value = 'idle'
  // Stop background audio and clear vocalizations
  if (backgroundAudio.value) {
    backgroundAudio.value.load()
  }
  speechSynthesis.cancel()
  exerciseInProgress.value = null
  currentIndex.value = 0
  isInProgressPause.value = false
  isInProgressExercise.value = false
  isTrainingStarted.value = false
  resetCountdown()
}

const playBackgroundAudio = () => {
  return {
    play: (src: string, { volume = 0.3 } = {}) => {
      if (!backgroundAudio.value) return
      backgroundAudio.value.volume = volume
      backgroundAudio.value.src = src
      backgroundAudio.value.load()
      backgroundAudio.value.play()
    },
    stop: () => {
      if (!backgroundAudio.value) return
      backgroundAudio.value.pause()
    }
  }
}

const onDrop = (dropResult: any) => {
  if (dropResult.removedIndex !== null && dropResult.addedIndex !== null) {
    exercises.value.splice(
      dropResult.addedIndex,
      0,
      exercises.value.splice(dropResult.removedIndex, 1)[0]
    )
  }
}

const handleEdit = (exercise: Exercise) => {
  editMode.value = showForm.value = true
  editExercise.value = exercise
}

const handleDelete = (exercise: Exercise) => {
  const storedExercises = localStorage.getItem('exercises')
  if (storedExercises) {
    const parsedExercises = JSON.parse(storedExercises) as Exercise[]
    const index = parsedExercises.findIndex(
      (item) => item.exerciseName === exercise.exerciseName
    )
    if (index > -1) {
      parsedExercises.splice(index, 1)
      localStorage.setItem('exercises', JSON.stringify(parsedExercises))
      exercises.value = parsedExercises
    }
  }
}

const handleClearGroup = (group: Group) => {
  const storedExercises = localStorage.getItem('exercises')
  if (storedExercises) {
    const parsedExercises = JSON.parse(storedExercises) as Exercise[]
    const filteredExercises = parsedExercises.filter(
      (exercise: Exercise) => exercise.group.id !== group.id
    )
    localStorage.setItem('exercises', JSON.stringify(filteredExercises))
    exercises.value = filteredExercises
  }
}

const formatTime = (totalTime: number): string => {
  const totalSeconds = Math.floor(totalTime / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const totalSelectedExercises = computed(() => {
  return selectedExercises.value.length
})

const totalExercisesDuration = computed(() => {
  let totalTime = 0
  selectedExercises.value.forEach((ex: Exercise) => {
    const sets = ex?.sets || 0
    const repetitions = ex?.repetitionsPerSet?.reduce(
      (sum: number, current: number) => sum + current,
      0
    )
    const repetitionDuration = ex?.repetitionDuration || 0
    const pause = ex?.pause || 0

    const exercise = repetitionDuration * repetitions * sets
    const totalPause = pause * sets
    const exerciseTime = exercise + totalPause

    totalTime += exerciseTime
  })

  return formatTime(totalTime)
})

const inProgressPoint = computed(() => {
  const repetitions = exerciseInProgress.value?.repetitions || 0
  const repetitionDuration = exerciseInProgress.value?.repetitionDuration || 0
  const pause = exerciseInProgress.value?.pause || 0

  let value = 0

  if (countdown.value > 0) {
    value = countdown.value
  } else if (isInProgressExercise.value) {
    value = repetitions * repetitionDuration
  } else if (isInProgressPause.value) {
    value = pause
  }

  return formatTime(value)
})

const groups = computed(() => {
  const groupMap = new Map<number, Group>()

  for (const exercise of exercises.value) {
    const { id, name } = exercise.group

    if (!groupMap.has(id)) {
      groupMap.set(id, {
        id,
        name,
        exercises: [exercise]
      })
    } else {
      groupMap.get(id)?.exercises?.push(exercise)
    }
  }

  return Array.from(groupMap.values())
})

async function runExercise(
  exercise: Exercise | null,
  isPause: boolean,
  isLastExerciseInCurrentSet: boolean,
  nextExercise: Exercise | null
) {
  if (!exercise || !isTrainingStarted.value) return

  const exerciseName = exercise.exerciseName
  const repetitions = exercise?.repetitions || 0
  const pause = exercise.pause
  const countdownBeforeStart = exercise.countdownBeforeStart
  const audioStart = exercise.audioStart
  const audioEnd = exercise.audioEnd
  const announcePauseDuration = exercise.announcePauseDuration
  const announcePauseEnd = exercise.announcePauseEnd
  const repetitionDuration = exercise.repetitionDuration

  const audio = playBackgroundAudio()

  try {
    isInProgressExercise.value = true
    if (audioStart) {
      await speak('Упражнение ' + exerciseName + ' начинается ')
    }

    if (countdownBeforeStart) {
      let countdownBeforeStartInSeconds = 3

      while (countdownBeforeStartInSeconds > 0) {
        await speak(countdownBeforeStartInSeconds.toString())
        await new Promise((resolve) => setTimeout(resolve, 1000))
        countdownBeforeStartInSeconds--
      }
      await speak('Старт')
    }

    // Start exercise

    startCountdown(repetitionDuration * repetitions, (time: number) => {
      countdown.value = time * 1000
    })

    audio.play('melodies/melody_1.mp3')

    const repetition = startCountRepetition(repetitionDuration, repetitions)

    await repetition.counter(async (count: number) => {
      exerciseRepetitionCount.value = count
      const rate = calculateSpeechRate(repetitionDuration)

      if (repetitions > 8 && repetitions - 1 === count) {
        speak('Еще раз', {
          rate
        })
      } else if (repetitions > 8 && Math.ceil(repetitions / 2) === count) {
        speak('Половина', { rate })
      } else {
        speak(`${count}`, { rate })
      }
    })

    audio.stop()

    isInProgressExercise.value = false

    // End exercise

    // Start pause

    if (isPause) {
      isInProgressPause.value = true

      if (audioEnd) {
        await speak('Конец упражнения')
      }

      if (isLastExerciseInCurrentSet) await speak('Конец текущего сета')

      const puseInsecond = pause / 1000

      if (announcePauseDuration) await speak(`Пауза ${puseInsecond} секунд`)

      startCountdown(pause, (time: number) => {
        countdown.value = time * 1000
      })

      audio.play('melodies/timer-tiking.mp3', { volume: 1 })

      if (pause > 5000 && nextExercise?.exerciseName) {
        setTimeout(() => {
          speak('Следующее упражнение ' + nextExercise.exerciseName)
        }, Math.round(nextExercise?.pause / 2))
      }

      await pauseCountRepetition(puseInsecond)

      audio.stop()
      isInProgressPause.value = false

      if (announcePauseEnd) {
        await speak('Конец паузы')
      }
    }
  } catch (e) {
    console.log(e)
  }
}

async function runExercises() {
  const currentExercises = selectedExercises.value
  if (!currentExercises.length || !isTrainingStarted.value) return

  const totalSets = Math.max(
    ...currentExercises.map((exercise: Exercise) => exercise.sets)
  )

  for (let setIndex = 0; setIndex < totalSets; setIndex++) {
    if (!isTrainingStarted.value) break

    for (let i = 0; i < currentExercises.length; i++) {
      if (!isTrainingStarted.value) break

      const currentExercise = currentExercises[i]
      exerciseInProgress.value = {
        ...currentExercise,
        repetitions: currentExercise.repetitionsPerSet[setIndex] || 0
      }

      nextExerciseInCurrentSet.value = currentExercises[i + 1]
        ? {
            ...currentExercises[i + 1],
            repetitions: currentExercise.repetitionsPerSet[setIndex] || 0
          }
        : null

      if (currentExercise.completedSets >= currentExercise.sets) continue

      const isLastExerciseInSet = i === currentExercises.length - 1
      const isLastSet = setIndex === totalSets - 1

      // Determine the next exercise

      // let nextExercise: typeof currentExercise | null = null
      // if (!isLastExerciseInSet) {
      //   nextExercise = currentExercises[i + 1]
      // } else if (!isLastSet) {
      //   // The next exercise in a new set is the first one
      //   nextExercise = currentExercises[0]
      // }

      // Pause and set end logic
      let isPauseNeeded = true
      let announceSetEnd = false

      if (isLastExerciseInSet) {
        if (isLastSet) {
          isPauseNeeded = false
          announceSetEnd = true
        } else {
          isPauseNeeded = true
          announceSetEnd = true
        }
      }

      await runExercise(
        exerciseInProgress.value,
        isPauseNeeded,
        announceSetEnd,
        nextExerciseInCurrentSet.value
      )

      // Обновляем completedSets
      const index = exercises.value.findIndex(
        (exercise: Exercise) => exercise.id === currentExercise.id
      )
      if (index !== -1) {
        exercises.value[index] = {
          ...exercises.value[index],
          completedSets: exercises.value[index].completedSets + 1
        }
      }
    }
  }

  await speak('Тренировка завершена')
  resetPlayer()
}

onMounted(() => {
  const storedExercises = localStorage.getItem('exercises')
  if (storedExercises) {
    exercises.value = JSON.parse(storedExercises)
  } else {
    exercises.value = []
  }
})

watch([isInProgressExercise, isInProgressPause], () => {
  countdown.value = 0
})
</script>

<template>
  <v-responsive>
    <v-app>
      <v-app-bar class="px-2" elevation="0">
        <v-btn
          color="indigo"
          @click="$emit('toggleDrawer')"
          icon="mdi-weight-lifter"
          variant="tonal"
        ></v-btn>

        <v-spacer></v-spacer>

        <v-btn
          color="indigo"
          @click="toggleForm"
          class="my-6"
          size="large"
          variant="tonal"
          prepend-icon="mdi-plus"
        >
          Упражнение
        </v-btn>
      </v-app-bar>
      <v-main class="bg-indigo-lighten-5">
        <v-container fluid class="pa-0">
          <ExerciseForm
            v-model="showForm"
            @close="closeForm"
            :editMode="editMode"
            :editExercise="editExercise"
            :groups="groups"
            @save="loadExercises"
          />

          <draggable
            v-if="groups.length"
            v-model="groups"
            item-key="id"
            :animation="200"
            :delay="200"
            :delay-on-touch-only="true"
            ghost-class="ghost"
            chosen-class="chosen"
            @end="onDrop"
          >
            <template #item="{ element }">
              <v-row
                no-gutters
                class="drag-handle d-flex flex-column pa-3 pb-0"
              >
                <v-col cols="12" class="pt-0">
                  <v-card variant="tonal" color="indigo">
                    <v-card-title
                      class="d-flex align-center"
                      style="overflow: hidden"
                    >
                      <span class="ml-2 text-truncate">
                        {{ element.name }}
                      </span>

                      <v-spacer></v-spacer>

                      <v-menu>
                        <template v-slot:activator="{ props }">
                          <v-btn
                            icon
                            density="compact"
                            variant="plain"
                            v-bind="props"
                            class="flex-shrink-0"
                          >
                            <v-icon>mdi-dots-vertical</v-icon>
                          </v-btn>
                        </template>
                        <v-list>
                          <v-list-item @click="handleClearGroup(element)"
                            >Очистить</v-list-item
                          >
                        </v-list>
                      </v-menu>
                    </v-card-title>

                    <v-divider></v-divider>

                    <v-card-text class="pa-0 pb-3">
                      <draggable
                        v-model="element.exercises"
                        item-key="id"
                        :animation="200"
                        :delay="200"
                        :delay-on-touch-only="true"
                        ghost-class="ghost"
                        chosen-class="chosen"
                        @end="onDrop"
                      >
                        <template #item="{ element }">
                          <v-row
                            no-gutters
                            class="drag-handle d-flex flex-column pa-3 pb-0"
                          >
                            <v-col cols="12" class="pt-0">
                              <v-expansion-panels elevation="0">
                                <v-expansion-panel
                                  :title="element.exerciseName"
                                  bg-color="#edeefa"
                                >
                                  <v-expansion-panel-text>
                                    <div>
                                      <div
                                        v-for="(
                                          item, index
                                        ) in element.repetitionsPerSet"
                                        :key="Math.random()"
                                      >
                                        <p
                                          class="w-100 d-flex justify-space-between font-weight-bold"
                                        >
                                          {{ `Сет ${index + 1}:` }}
                                        </p>
                                        <p
                                          class="w-100 d-flex justify-space-between pl-3"
                                        >
                                          <span>Повторений:</span
                                          ><span>{{ item }}</span>
                                        </p>
                                        <p
                                          class="w-100 d-flex justify-space-between pl-3"
                                        >
                                          <span>Продолжительность:</span>
                                          <span>
                                            {{
                                              formatTime(
                                                item *
                                                  element.repetitionDuration +
                                                  element.pause
                                              )
                                            }}
                                          </span>
                                        </p>
                                      </div>

                                      <v-divider class="my-4"></v-divider>

                                      <p
                                        class="w-100 d-flex justify-space-between"
                                      >
                                        <span class="font-weight-bold">
                                          Пауза:</span
                                        ><span>{{
                                          formatTime(element.pause)
                                        }}</span>
                                      </p>

                                      <p
                                        class="w-100 d-flex justify-space-between"
                                      >
                                        <span class="font-weight-bold">
                                          Общее время:</span
                                        ><span>{{
                                          formatTime(
                                            element.pause * element.sets +
                                              element.repetitionDuration *
                                                element.repetitionsPerSet.reduce(
                                                  (
                                                    sum: number,
                                                    current: number
                                                  ) => sum + current,
                                                  0
                                                ) *
                                                element.sets
                                          )
                                        }}</span>
                                      </p>
                                    </div>
                                    <v-divider class="my-4"></v-divider>
                                    <div class="d-flex justify-space-between">
                                      <v-btn
                                        color="indigo"
                                        text="Редактировать"
                                        variant="tonal"
                                        @click="handleEdit(element)"
                                      ></v-btn>
                                      <v-btn
                                        color="error"
                                        text="Удалить"
                                        variant="tonal"
                                        @click="handleDelete(element)"
                                      ></v-btn>
                                    </div>
                                  </v-expansion-panel-text>
                                </v-expansion-panel>
                              </v-expansion-panels>
                              <!-- <v-card variant="tonal" color="indigo">
                                <v-card-title
                                  class="d-flex align-center"
                                  style="overflow: hidden"
                                >

                                  <span class="ml-2 text-truncate">
                                    {{ element.exerciseName }}
                                  </span>

                                  <v-spacer></v-spacer>

                                  <v-menu>
                                    <template v-slot:activator="{ props }">
                                      <v-btn
                                        icon
                                        density="compact"
                                        variant="plain"
                                        v-bind="props"
                                        class="flex-shrink-0"
                                      >
                                        <v-icon>mdi-dots-vertical</v-icon>
                                      </v-btn>
                                    </template>
                                    <v-list>
                                      <v-list-item @click="handleEdit(element)"
                                        >Редактировать</v-list-item
                                      >
                                      <v-list-item
                                        @click="handleDelete(element)"
                                        >Удалить</v-list-item
                                      >
                                    </v-list>
                                  </v-menu>
                                </v-card-title>

                                <v-divider></v-divider>

                                <v-card-text>
                                  
                                </v-card-text>
                              </v-card> -->
                            </v-col>
                          </v-row>
                        </template>
                      </draggable>
                    </v-card-text>

                    <v-divider></v-divider>

                    <template v-slot:actions>
                      <v-btn
                        color="indigo"
                        text="Начать тренировку"
                        variant="tonal"
                        block
                        @click="startPlayer(element.exercises)"
                      ></v-btn>
                    </template>
                  </v-card>
                </v-col>
              </v-row>
            </template>
          </draggable>
          <div v-else class="mt-16">
            <p class="text-center text-indigo px-6">
              Вы еще не добавили ни одного упражнения.
            </p>
            <pre class="text-error">
              <span>exercises</span>
              {{ exercises }}
            </pre>
            <pre class="text-worning">
              <span>groups</span>
              {{ groups }}
            </pre>
            <pre class="text-success">
              <span>selectedExercises</span>
              {{ selectedExercises }}
            </pre>
          </div>
        </v-container>
      </v-main>
      <audio ref="backgroundAudio" loop></audio>
      <v-bottom-sheet
        v-model="isTrainingStarted"
        @update:model-value="resetPlayer"
      >
        <v-card
          class="text-center"
          height="200"
          style="border-radius: 16px 16px 0 0"
        >
          <v-card-text>
            <SharedFooterContent
              :playerState="playerState"
              :isInProgressPause="isInProgressPause"
              :exerciseInProgress="exerciseInProgress"
              :inProgressPoint="inProgressPoint"
              :totalSelectedExercises="totalSelectedExercises"
              :totalExercisesDuration="totalExercisesDuration"
              :exerciseRepetitionCount="exerciseRepetitionCount"
              :nextExerciseInCurrentSet="nextExerciseInCurrentSet"
              @startPlayer="startPlayer"
              @pausePlayer="pausePlayer"
              @countinuePlayer="countinuePlayer"
              @resetPlayer="resetPlayer"
            />
          </v-card-text>
        </v-card>
      </v-bottom-sheet>
    </v-app>
  </v-responsive>
</template>

<style>
.item {
  padding: 10px;
  margin-bottom: 5px;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  cursor: move;
  transition: transform 0.2s ease;
}

.ghost {
  opacity: 0.4;
}

.chosen {
  background-color: #c5cae9;
}
</style>
