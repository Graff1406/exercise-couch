<template>
  <v-dialog v-model="dialog" fullscreen transition="v-bottom-sheet-transition">
    <v-card>
      <v-toolbar>
        <v-toolbar-title>Добавить упражнение</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="mb-12">
        <!-- <pre>
          {{ formValues }}
        </pre> -->
        <v-form ref="form" @submit.prevent="save">
          <v-text-field
            v-model="formValues.exerciseName"
            label="Название упражнения"
            required
            hint="Название упражнения для тренировки"
            :rules="[exerciseNameRules.required, exerciseNameRules.minLength]"
          ></v-text-field>

          <v-select
            v-model.number="formValues.sets"
            label="Подходы"
            :items="setsOptions"
            :rules="[rules.required]"
            hint="Количество подходов за упражнение"
          ></v-select>

          <div
            v-for="(_, index) in formValues.sets"
            :key="`rep-set-${index}`"
            class="mb-1"
          >
            <v-text-field
              v-model.number="formValues.repetitionsPerSet[index]"
              :label="`Повторения для подхода ${index + 1}`"
              type="number"
              min="3"
              :rules="[rules.required, rules.min]"
              :hint="`Количество повторений для подхода ${
                index + 1
              }, должно быть больше 3`"
            ></v-text-field>
          </div>

          <v-expansion-panels>
            <v-expansion-panel title="Общие настройки">
              <v-expansion-panel-text>
                <v-select
                  v-model="formValues.repetitionDuration"
                  :items="speedOptions"
                  item-title="label"
                  item-value="value"
                  label="Тайминг повторения"
                  hint="Скорость выполнения упражнения"
                  :rules="[rules.required]"
                ></v-select>
                <v-select
                  v-model="formValues.countdownBeforeStart"
                  :items="[
                    { value: 3000, label: 'За 3 секунды' },
                    { value: 5000, label: 'За 5 секунд' }
                  ]"
                  item-title="label"
                  item-value="value"
                  label="Объявить тренировку"
                  hint="Время обратного отсчета перед началом упражнения"
                  :rules="[rules.required]"
                >
                </v-select>
                <v-checkbox
                  class="mr-2"
                  v-model="formValues.audioStart"
                  label="Озвучка начала"
                  hide-details
                ></v-checkbox>
                <v-checkbox
                  v-model="formValues.audioEnd"
                  label="Озвучка конца"
                  hide-details
                ></v-checkbox>

                <v-text-field
                  v-model="formValues.gifUrl"
                  label="Ссылка на GIF упражнение"
                  hint="Ссылка на GIF изображение для показа упражнения"
                >
                </v-text-field>
                <v-select
                  v-model="formValues.backgroundMelodyLink"
                  :items="backgroundMelodyOptions"
                  label="Фоновая мелодия"
                  item-title="label"
                  item-value="link"
                  hint="Фон для упражнения"
                >
                </v-select>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel title="Настройка паузы">
              <v-expansion-panel-text class="d-flex flex-column">
                <v-select
                  v-model="formValues.pause"
                  :items="pauseDurationOptions"
                  :item-title="'label'"
                  item-value="value"
                  label="Длительность паузы"
                  hint="Длительность длинной паузы в минутах и секундах"
                  :rules="[rules.required]"
                >
                </v-select>
                <div>
                  <v-card-title>Оповещения во время паузы</v-card-title>
                  <v-checkbox
                    v-model="formValues.announcePauseDuration"
                    label="Озвучить длительность паузы"
                    hide-details
                  ></v-checkbox>
                  <v-checkbox
                    v-model="formValues.announceCountdown"
                    label="Озвучить 3-секундный до конца паузы"
                    hide-details
                  ></v-checkbox>
                  <v-checkbox
                    v-model="formValues.announcePauseEnd"
                    label="Озвучить конец паузы"
                    hide-details
                  ></v-checkbox>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-alert variant="tonal" border="start" color="indigo" class="my-6">
            <p>
              Продолжительность одного подхода:
              {{ formattedTotalExerciseTime }}
            </p>
            <p class="text-caption">(Сгибание + расгибание * на повторение)</p>
          </v-alert>
        </v-form>
      </v-card-text>
      <v-footer app fixed class="d-flex flex-column py-2">
        <v-btn
          color="primary"
          variant="tonal"
          size="large"
          :disabled="!isValid"
          @click="validate"
          >Сохранить</v-btn
        >
      </v-footer>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, defineEmits, computed, watch } from 'vue'
import { type Exercise } from '../types/Exercise'

const props = defineProps<{
  editMode: boolean
  editExercise: Exercise | null
}>()

const form = ref<any>(null)

const totalExerciseTime = computed(() => {
  // Отображаем длительность первого подхода как пример
  const firstSetRepetitions =
    formValues.value.repetitionsPerSet &&
    formValues.value.repetitionsPerSet.length > 0
      ? formValues.value.repetitionsPerSet[0]
      : 0
  return formValues.value.repetitionDuration * (firstSetRepetitions || 0)
})
const formattedTotalExerciseTime = computed(() => {
  return formatMillisecondsToMinutesSeconds(totalExerciseTime.value || 0)
})

const emit = defineEmits(['close', 'save'])
const dialog = ref(true)

const rules = ref({
  required: (value: any) => !!value || 'Обязательное поле',
  min: (value: number) => value >= 3 || 'Минимальное количество повторений 3',
  minSets: (value: number) => value >= 1 || 'Минимальное количество подходов 1',
  maxSets: (value: number) =>
    value <= 10 || 'Максимальное количество подходов 10'
})
const speedOptions = [
  { value: 1000, label: '1 сек.' },
  { value: 1200, label: '1.2 сек.' },
  { value: 1400, label: '1.4 сек.' },
  { value: 1600, label: '1.6 сек.' },
  { value: 1800, label: '1.8 сек.' },
  { value: 2000, label: '2 сек.' },
  { value: 2200, label: '2.2 сек.' },
  { value: 2400, label: '2.4 сек.' },
  { value: 2600, label: '2.6 сек.' },
  { value: 2800, label: '2.8 сек.' },
  { value: 3000, label: '3 сек.' },
  { value: 3500, label: '3.5 сек.' },
  { value: 4000, label: '4 сек.' },
  { value: 4500, label: '4.5 сек.' },
  { value: 5000, label: '5 сек.' },

  { value: 6000, label: '6 сек.' }
]
const backgroundMelodyOptions = [
  {
    label: 'Melody 1',
    link: 'https://soundcloud.com/block-zone-585441623/calming-meditation-1-hour-handpan-music-malte-marten?si=4fb550533c994c8dbc1015caedf76de4&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing'
  },
  { label: 'Melody 2', link: '/path/to/melody2.mp3' },
  { label: 'Melody 3', link: '/path/to/melody3.mp3' }
]

const exerciseNameRules = ref({
  required: (value: string) => !!value || 'Обязательное поле',
  minLength: (value: string) =>
    value.length >= 3 || 'Минимальная длина 3 символа'
})

const isValid = ref<boolean>(false)

const setsOptions = Array.from({ length: 10 }, (_, i) => i + 1)

const formatMillisecondsToMinutesSeconds = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const formattedSeconds = seconds.toString().padStart(2, '0')
  return `${minutes}:${formattedSeconds}`
}

// Generate pause duration options
const pauseDurationOptions = computed(() => {
  const options = []
  for (let i = 5; i <= 300; i += 5) {
    const value = i * 1000 // in milliseconds
    const minutes = Math.floor(i / 60)
    const seconds = i % 60
    const label = `${minutes}:${seconds.toString().padStart(2, '0')}`
    options.push({ value, label })
  }
  return options
})

const _defaultSets = 3
const _defaultRepetitionsValue = 14

const defaultFormValues = {
  id: Math.floor(Math.random() * 1000000),
  gifUrl: '',
  exerciseName: '',
  sets: _defaultSets,
  completedSets: 0,
  repetitionsPerSet: Array(_defaultSets).fill(_defaultRepetitionsValue),
  countdownBeforeStart: 3000,
  audioEnd: true,
  audioStart: true,
  announcePauseEnd: true,
  announceCountdown: true,
  announcePauseDuration: true,
  selectedForPlayer: true,
  repetitionDuration: speedOptions[2]?.value,
  pause: pauseDurationOptions.value[3]?.value,
  backgroundMelodyLink: backgroundMelodyOptions[0]?.link || ''
}

const formValues = ref<Exercise>({
  ...defaultFormValues,
  repetitionsPerSet: [...defaultFormValues.repetitionsPerSet] // Ensure a new array instance
})

const validate = async () => {
  if (isValid.value) {
    save()
  }
}

const close = () => {
  emit('close')
  dialog.value = false
  setTimeout(() => {
    formValues.value = {
      ...defaultFormValues,
      id: Math.floor(Math.random() * 1000000), // Generate new ID for potential new entry
      repetitionsPerSet: [...defaultFormValues.repetitionsPerSet] // Ensure fresh array
    }
  }, 300) // Reduced timeout
}

const save = async () => {
  const exercises = JSON.parse(localStorage.getItem('exercises') || '[]')
  if (props.editMode) {
    const exerciseIndex = exercises.findIndex(
      (item: any) => item.exerciseName === props?.editExercise?.exerciseName
    )
    if (exerciseIndex > -1) {
      exercises.splice(exerciseIndex, 1, formValues.value)
      localStorage.setItem('exercises', JSON.stringify(exercises))
    }
  } else {
    exercises.push(formValues.value)
    localStorage.setItem('exercises', JSON.stringify(exercises))
  }
  emit('save')
  close()
}

watch(
  () => props.editExercise,
  (exerciseToEdit?: Exercise | null) => {
    // Allow old 'repetitions' property for migration
    if (
      props.editMode &&
      exerciseToEdit &&
      Object.keys(exerciseToEdit).length > 0
    ) {
      // Start with a deep clone of defaults, then overlay with exerciseToEdit data
      const newFormState = JSON.parse(
        JSON.stringify(defaultFormValues)
      ) as Exercise

      // Merge all properties from exerciseToEdit
      for (const key in exerciseToEdit) {
        if (Object.prototype.hasOwnProperty.call(exerciseToEdit, key)) {
          if (key === 'repetitions' && !exerciseToEdit.repetitionsPerSet) {
            // Skip old 'repetitions' if we're about to migrate it, it's handled below
            continue
          }
          ;(newFormState as any)[key] = (exerciseToEdit as any)[key]
        }
      }
      // Ensure ID from exerciseToEdit is used
      newFormState.id = exerciseToEdit.id || newFormState.id

      // Handle repetitions migration or setting
      if (
        exerciseToEdit.hasOwnProperty('repetitions') &&
        !exerciseToEdit.repetitionsPerSet
      ) {
        const numSets = exerciseToEdit.sets || newFormState.sets
        const repValue =
          typeof (exerciseToEdit as any).repetitions === 'number'
            ? (exerciseToEdit as any).repetitions
            : defaultFormValues.repetitionsPerSet[0] || 10
        newFormState.repetitionsPerSet = Array(numSets).fill(repValue)
      } else if (exerciseToEdit.repetitionsPerSet) {
        newFormState.repetitionsPerSet = [...exerciseToEdit.repetitionsPerSet]
      } else {
        // Neither old nor new rep data, initialize based on sets
        const numSets = exerciseToEdit.sets || newFormState.sets
        newFormState.repetitionsPerSet = Array(numSets).fill(
          defaultFormValues.repetitionsPerSet[0] || 10
        )
      }

      // Final consistency check for repetitionsPerSet length vs sets
      if (newFormState.repetitionsPerSet.length !== newFormState.sets) {
        const currentReps = [...newFormState.repetitionsPerSet]
        const numSets = newFormState.sets
        const defaultRep = defaultFormValues.repetitionsPerSet[0] || 10
        const adjustedReps = Array(numSets).fill(defaultRep)
        for (let i = 0; i < Math.min(numSets, currentReps.length); i++) {
          adjustedReps[i] = currentReps[i]
        }
        newFormState.repetitionsPerSet = adjustedReps
      }
      formValues.value = newFormState
    } else if (!props.editMode) {
      formValues.value = {
        // Reset to default for new exercise form
        ...JSON.parse(JSON.stringify(defaultFormValues)),
        id: Math.floor(Math.random() * 1000000)
      }
    }
  },
  { deep: true }
)

watch(
  formValues,
  async () => {
    if (form.value) {
      const { valid } = await form.value.validate()
      isValid.value = valid
    } else {
      isValid.value = false
    }
  },
  { deep: true, immediate: true }
)

watch(
  () => formValues.value.sets,
  (newSetsCount, oldSetsCount) => {
    if (
      newSetsCount === undefined ||
      newSetsCount === null ||
      newSetsCount === oldSetsCount
    ) {
      return
    }

    const currentRepsArray = formValues.value.repetitionsPerSet
      ? [...formValues.value.repetitionsPerSet]
      : []
    const newRepsArray: number[] = []
    const defaultRepValue =
      defaultFormValues.repetitionsPerSet &&
      defaultFormValues.repetitionsPerSet.length > 0
        ? defaultFormValues.repetitionsPerSet[0]
        : 10 // Fallback default

    for (let i = 0; i < newSetsCount; i++) {
      if (i < currentRepsArray.length) {
        newRepsArray.push(currentRepsArray[i])
      } else {
        // New set added, use last known rep value from existing sets or default
        const valToAdd =
          currentRepsArray.length > 0 && i > 0 // Check i > 0 to use previous if available
            ? currentRepsArray[currentRepsArray.length - 1] // Use the value of the last set when expanding
            : defaultRepValue
        newRepsArray.push(valToAdd)
      }
    }
    formValues.value.repetitionsPerSet = newRepsArray.slice(0, newSetsCount) // Ensure correct length
  }
)
</script>
<style scoped></style>
