<script setup lang="ts">
import ExerciseForm from "./components/ExerciseForm.vue";
import { ref, onMounted, computed } from "vue";
import {
  VCard,
  VCardText,
  VCardTitle,
  VCol,
  VBtn,
  VMenu,
  VList,
  VListItem,
} from "vuetify/components";
import { Container, Draggable } from "vue3-smooth-dnd";
type PlayerState = "idle" | "playing" | "paused" | "reset";
interface Exercise {
  id: number;
  exerciseName: string;
  repetitions: number;
  concentricSpeed: number;
  eccentricSpeed: number;
  firstPhase: string;
  audioCues: string;
  sets: number;
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

const showForm = ref(false);
const exercises = ref<Exercise[]>([]);

const playerState = ref<PlayerState>("idle");
const editExercise = ref<Partial<Exercise>>({});
const groupExercises = ref<number[]>([]);
const editMode = ref(false);

const loadExercises = () => {
  const storedExercises = localStorage.getItem("exercises");
  exercises.value = storedExercises ? JSON.parse(storedExercises) : [];
};

const toggleForm = () => {
  showForm.value = !showForm.value;
};
const closeForm = () => {
  showForm.value = false;
  editMode.value = false;
  editExercise.value = {};
};

const startPlayer = () => {
  playerState.value = "playing";
};

const pausePlayer = () => {
  playerState.value = "paused";
};

const resetPlayer = () => {
  playerState.value = "idle";
};

const calculateTotalExerciseTime = (
  concentric: number,
  eccentric: number,
  repetitions: number
): string => {
  const totalMs = (concentric + eccentric) * repetitions;
  const totalSeconds = Math.round(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function formatMillisecondsToMinutesSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const onDrop = (dropResult: any) => {
  if (dropResult.removedIndex !== null && dropResult.addedIndex !== null) {
    exercises.value.splice(
      dropResult.addedIndex,
      0,
      exercises.value.splice(dropResult.removedIndex, 1)[0]
    );
  }
};

const handleEdit = (exercise: Exercise) => {
  editMode.value = showForm.value = true;
  editExercise.value = exercise;
};

const handleDelete = (exercise: Exercise) => {
  const storedExercises = localStorage.getItem("exercises");
  if (storedExercises) {
    const parsedExercises = JSON.parse(storedExercises) as Exercise[];
    const index = parsedExercises.findIndex(
      (item) => item.exerciseName === exercise.exerciseName
    );
    if (index > -1) {
      parsedExercises.splice(index, 1);
      localStorage.setItem("exercises", JSON.stringify(parsedExercises));
      exercises.value = parsedExercises.map((exercise: Exercise) => ({
        ...exercise,
        selectedForPlayer: true,
      }));
    }
  }
};

// Computed properties for footer info
const selectedExercises = computed(() => {
  return exercises.value.filter((exercise) => exercise.selectedForPlayer);
});

const totalSelectedExercises = computed(() => {
  return selectedExercises.value.length;
});

const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return `${totalSeconds}`;
  } else {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
};

const totalExercisesDuration = computed(() => {
  let totalTime = 0;
  selectedExercises.value.forEach((ex: Exercise) => {
    const sets = ex?.sets || 0;
    const repetitions = ex?.repetitions || 0;
    const concentric = ex?.concentricSpeed || 0;
    const eccentric = ex?.eccentricSpeed || 0;
    const pause = ex?.pause || 0;

    const exercise = (concentric + eccentric) * repetitions * sets;
    const totalPause = pause * sets;
    const exerciseTime = exercise + totalPause;

    totalTime += exerciseTime;
  });
  return totalTime / 1000;
});

onMounted(() => {
  const storedExercises = localStorage.getItem("exercises");
  if (storedExercises) {
    exercises.value = JSON.parse(storedExercises).map((exercise: Exercise) => ({
      ...exercise,
      selectedForPlayer: true, // Always initialize selectedForPlayer to true
    }));
  } else {
    exercises.value = [];
    groupExercises.value = [];
  }
});
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0">
        <v-btn color="indigo" @click="toggleForm" class="my-6" size="large">
          {{ showForm ? "Скрыть форму" : "Добавить упражнение" }}
        </v-btn>
        <ExerciseForm
          v-model="showForm"
          @close="closeForm"
          :editMode="editMode"
          :editExercise="editExercise"
          @save="loadExercises"
        />
        <Container
          fluid
          v-if="exercises.length > 0"
          orientation="vertical"
          @drop="onDrop"
          drag-handle-selector=".drag-handle"
        >
          <v-row no-gutters>
            <Draggable
              class="w-100"
              v-for="(exercise, index) in exercises"
              :key="index"
            >
              <v-col cols="12" class="drag-handle pt-0">
                <v-card variant="tonal" color="indigo">
                  <v-card-title class="d-flex align-center">
                    <v-checkbox
                      v-model="exercise.selectedForPlayer"
                      hide-details
                      density="compact"
                    ></v-checkbox>
                    <span class="ml-2">{{ exercise.exerciseName }}</span>
                    <v-spacer></v-spacer>
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn
                          icon
                          density="compact"
                          variant="plain"
                          v-bind="props"
                        >
                          <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-item @click="handleEdit(exercise)"
                          >Редактировать</v-list-item
                        >

                        <v-list-item @click="handleDelete(exercise)"
                          >Удалить</v-list-item
                        >
                      </v-list>
                    </v-menu>
                  </v-card-title>

                  <v-divider></v-divider>

                  <v-card-text>
                    <v-expansion-panels elevation="0">
                      <v-expansion-panel title="Детали" bg-color="#edeefa">
                        <v-expansion-panel-text>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Повторений:</span
                            ><span>{{ exercise.repetitions }}</span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Подходы:</span
                            ><span>{{ exercise.sets }}</span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Продолжительность подхода:</span
                            ><span
                              >{{
                                calculateTotalExerciseTime(
                                  exercise.concentricSpeed,
                                  exercise.eccentricSpeed,
                                  exercise.repetitions
                                )
                              }}
                            </span>
                          </p>
                          <p class="w-100 d-flex justify-space-between">
                            <span>Пауза:</span
                            ><span
                              >{{
                                formatMillisecondsToMinutesSeconds(
                                  exercise.pause
                                )
                              }}
                            </span>
                          </p>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>
              </v-col>
            </Draggable>
          </v-row>
        </Container>
      </v-container>
    </v-main>

    <v-footer app fixed class="d-flex flex-column" elevation="3" style="border-radius: 16px 16px 0 0">
      <div class="pb-1">
        <div v-if="playerState === 'idle' || playerState === 'reset'">
          <v-btn
            icon
            large
            color="indigo"
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="startPlayer"
          >
            <v-icon>mdi-play</v-icon>
          </v-btn>
        </div>
        <div v-if="playerState === 'playing'">
          <v-btn
            icon
            large
            color="indigo"
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
            color="indigo"
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="resetPlayer"
          >
            <v-icon>mdi-restart</v-icon>
          </v-btn>
        </div>
        <div v-if="playerState === 'paused'">
          <v-btn
            icon
            large
            color="indigo"
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="startPlayer"
          >
            <v-icon>mdi-play</v-icon>
          </v-btn>
          <v-btn
            icon
            large
            color="indigo"
            variant="plain"
            density="comfortable"
            class="mx-2"
            @click="resetPlayer"
          >
            <v-icon>mdi-restart</v-icon>
          </v-btn>
        </div>
      </div>
      <div class="w-100"><v-divider></v-divider></div>
      <div class="pt-2 text-caption w-100 d-flex justify-space-between">
        <p>Выбрано упражнений: {{ totalSelectedExercises }}</p>
        <v-divider vertical class="mx-1"></v-divider>
        <p>Общее время: {{ formatTime(totalExercisesDuration) }}</p>
      </div>
    </v-footer>
  </v-app>
</template>
