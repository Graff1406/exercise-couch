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
          <v-text-field
            v-model.number="formValues.repetitions"
            label="Повторения"
            type="number"
            min="3"
            :rules="[rules.min]"
            hint="Количество повторений за подход, должно быть больше 3"
          ></v-text-field>

          <v-expansion-panels>
            <v-expansion-panel title="Общие настройки">
              <v-expansion-panel-text>
                <v-select
                  v-model="formValues.firstPhase"
                  :items="firstPhaseOptions"
                  item-title="label"
                  item-value="value"
                  label="Начальная фаза"
                  hint="Какая фаза будет выполняться первой"
                  :rules="[rules.required]"
                >
                </v-select>
                <v-select
                  v-model="formValues.concentricSpeed"
                  :items="speedOptions"
                  item-title="label"
                  item-value="value"
                  label="Скорость сгибания"
                  hint="Скорость выполнения упражнения в фазе сокращения мышц"
                  :rules="[rules.required]"
                ></v-select>
                <v-select
                  v-model="formValues.eccentricSpeed"
                  :items="speedOptions"
                  :item-title="'label'"
                  label="Скорость расгибания"
                  hint="Скорость выполнения упражнения в фазе растяжения мышц"
                  :rules="[rules.required]"
                >
                </v-select>
                <v-select
                  v-model="formValues.countdownDuration"
                  :items="[1, 2, 3, 4, 5]"
                  hint="Время обратного отсчета перед началом упражнения"
                  :rules="[rules.required]"
                >
                </v-select>
                <v-radio-group
                  v-model="audioCues"
                  label="Звуковые подсказки"
                  hide-details
                  hide-spin-buttons
                  class="pa-0"
                >
                  <v-radio
                    v-for="item in audioCueOptions"
                    :key="item.value"
                    :value="item"
                    :label="item.label"
                  >
                  </v-radio>
                </v-radio-group>
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
                <v-checkbox
                  v-model="formValues.audioEveryFifthRepetition"
                  label="Озвучить каждое пятое повторение"
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
                    v-model="formValues.announceNextExercise"
                    label="Озвучить следующее упражнение"
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
import { ref, defineEmits, computed, watch, reactive } from "vue";
interface FormValues {
  id: number;
  exerciseName: string;
  repetitions: number;
  concentricSpeed: number;
  eccentricSpeed: number;
  firstPhase: string;
  audioCues: string;
  sets: number;
  completedSets: number;
  pause: number;
  countdownDuration: number;
  gifUrl: string;
  backgroundMelodyLink: string;
  audioStart: boolean;
  audioEnd: boolean;
  audioEveryFifthRepetition: boolean;
  announcePauseDuration: boolean;
  announceNextExercise: boolean;
  announceCountdown: boolean;
  announcePauseEnd: boolean;
  selectedForPlayer: boolean;
}

type Item = {
  value: string;
  label: string;
};

const props = defineProps({
  editMode: {
    type: Boolean,
    required: true,
  },
  editExercise: {
    type: Object as () => FormValues,
  },
});
const form = ref<any>(null);

// вычисляемое свойство которое считает общее время упражнения
const totalExerciseTime = computed(() => {
  return (
    (formValues.value.concentricSpeed +
      formValues.value.eccentricSpeed) *
    formValues.value.repetitions
  );
});

const formattedTotalExerciseTime = computed(() => {
  return formatMillisecondsToMinutesSeconds(totalExerciseTime.value || 0);
});

const emit = defineEmits(["close", "save"]);
const dialog = ref(true);

const rules = ref({
  required: (value: any) => !!value || "Обязательное поле",
  min: (value: number) => value >= 3 || "Минимальное количество повторений 3",
  minSets: (value: number) => value >= 1 || "Минимальное количество подходов 1",
  maxSets: (value: number) =>
    value <= 10 || "Максимальное количество подходов 10",
});
const speedOptions = [
  { value: 1000, label: "Быстро (1 сек)" },
  { value: 1500, label: "Нормально (1.5 сек)" },
  { value: 2000, label: "Плавно (2 сек)" },
  { value: 2500, label: "Медленно (2.5 сек)" },
];
const backgroundMelodyOptions = [
  { label: "Melody 1", link: "https://soundcloud.com/block-zone-585441623/calming-meditation-1-hour-handpan-music-malte-marten?si=4fb550533c994c8dbc1015caedf76de4&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing" },
  { label: "Melody 2", link: "/path/to/melody2.mp3" },
  { label: "Melody 3", link: "/path/to/melody3.mp3" },
];

const exerciseNameRules = ref({
  required: (value: string) => !!value || "Обязательное поле",
  minLength: (value: string) =>
    value.length >= 3 || "Минимальная длина 3 символа",
});

const firstPhaseOptions = [
  { value: "concentric", label: "Сгибание" },
  { value: "eccentric", label: "Разгибание" },
];
const isValid = ref<boolean>(false);
const audioCueOptions = reactive([
  { value: "movement", label: "Сгибание/расгибание" },
  { value: "breath", label: "Вдох/выдох" },
  { value: "both", label: "Движение/дыхание" },
]);

const audioCues = ref<Item>(audioCueOptions[1]);

const setsOptions = Array.from({ length: 10 }, (_, i) => i + 1);

const formatMillisecondsToMinutesSeconds = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedSeconds = seconds.toString().padStart(2, "0");
  return `${minutes}:${formattedSeconds}`;
};

// Generate pause duration options
const pauseDurationOptions = computed(() => {
  const options = [];
  for (let i = 5; i <= 300; i += 5) {
    const value = i * 1000; // in milliseconds
    const minutes = Math.floor(i / 60);
    const seconds = i % 60;
    const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    options.push({ value, label });
  }
  return options;
});

const defaultFormValues = {
  id: Math.floor(Math.random() * 1000000),
  gifUrl: "",
  exerciseName: "",
  sets: 3,
  completedSets: 0,
  repetitions: 14,
  countdownDuration: 3,
  audioEnd: true,
  audioStart: true,
  announcePauseEnd: true,
  announceCountdown: true,
  announceNextExercise: false,
  announcePauseDuration: true,
  audioEveryFifthRepetition: true,
  selectedForPlayer: true,
  audioCues: audioCueOptions[1]?.value,
  eccentricSpeed: speedOptions[1]?.value,
  firstPhase: firstPhaseOptions[0]?.value,
  concentricSpeed: speedOptions[1]?.value,
  pause: pauseDurationOptions.value[3]?.value,
  backgroundMelodyLink: backgroundMelodyOptions[0]?.link || "",
};

const formValues = ref<FormValues>({ ...defaultFormValues });
const validate = async () => {
  if (isValid.value) {
    save();
  }
};

const close = () => {
  emit("close");
  dialog.value = false;
  setTimeout(() => {
    formValues.value = { ...defaultFormValues };
  }, 1000);
};

const save = async () => {
  const exercises = JSON.parse(localStorage.getItem("exercises") || "[]");
  if (props.editMode) {
    const exerciseIndex = exercises.findIndex(
      (item: any) => item.exerciseName === props?.editExercise?.exerciseName
    );
    if (exerciseIndex > -1) {
      exercises.splice(exerciseIndex, 1, formValues.value);
      localStorage.setItem("exercises", JSON.stringify(exercises));
    }
  } else {
    exercises.push(formValues.value);
    localStorage.setItem("exercises", JSON.stringify(exercises));
  }
  emit("save");
  close();
};

watch(
  () => props.editExercise,
  (newValue: FormValues | {}) => {
    if (Object.keys(newValue).length > 0) {
      formValues.value = {
        ...(newValue as FormValues),
      };
    }
  },
  { deep: true }
);

watch(
  formValues,
  async () => {
    if (form.value) {
      const { valid } = await form.value.validate();
      isValid.value = valid;
    } else {
      isValid.value = false;
    }
  },
  { deep: true, immediate: true }
);

watch(audioCues, (movment: Item) => {
  formValues.value.audioCues = movment.value;
});
</script>
<style scoped></style>
