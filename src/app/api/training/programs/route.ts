import { apiRoute } from "@/lib/api/handler";
import { listPrograms, programsQuery } from "@/lib/modules/treinos/service";

/** GET /api/training/programs?goal=&level=&location= → `WorkoutProgramRow[]` */
export const GET = apiRoute(
  { guard: "access", help: ["route.treinos", "workout_programs.goal"] },
  async ({ query }) => listPrograms(query(programsQuery)),
);
