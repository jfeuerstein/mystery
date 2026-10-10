import { Case } from "@afoot/schema";
import stoppedClock from "../../fixtures/stopped-clock.case.json";

/**
 * The cases in play order. M1 ships only the hand-written sample case; sealed
 * generated seasons arrive with the pipeline (GAME_DESIGN.md §14).
 */
export const CASES: Case[] = [Case.parse(stoppedClock)];
